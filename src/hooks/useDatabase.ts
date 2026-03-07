import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getDatabase,
  getAllTracks,
  getAllPlaylists,
  addTrack,
  deleteTrack,
  updateTrack,
  createPlaylist,
  createPlaylistFast,
  deletePlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  getPlaylistTracks,
  reorderPlaylistTracks,
  generateExportManifest,
  exportDatabaseFile,
  exportDatabaseBase64,
  restoreDatabase,
  
  clearAllData,
  getTrackCount,
  getPlaylistCount,
  type Track,
  type Playlist,
} from '@/lib/database';
import { loadSettings, saveBackupEntry, getBackupData } from '@/lib/settings';

export function useDatabase() {
  const [ready, setReady] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getDatabase().then(() => {
      setReady(true);
      refresh();
    });
  }, []);

  // Auto-save timer
  useEffect(() => {
    if (!ready) return;

    const startAutoSave = () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
      const settings = loadSettings();
      const intervalMs = settings.autoSaveInterval * 60 * 1000;

      autoSaveRef.current = setInterval(() => {
        try {
          const b64 = exportDatabaseBase64();
          const entry = {
            id: `auto-${Date.now()}`,
            timestamp: new Date().toISOString(),
            trackCount: getTrackCount(),
            playlistCount: getPlaylistCount(),
            data: b64,
          };
          const currentSettings = loadSettings();
          saveBackupEntry(entry, currentSettings.maxBackups);
        } catch {
          // Auto-save failed silently
        }
      }, intervalMs);
    };

    startAutoSave();

    // Listen for settings changes
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'pioneer-export-settings') startAutoSave();
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
      window.removeEventListener('storage', handleStorage);
    };
  }, [ready]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [t, p] = await Promise.all([getAllTracks(), getAllPlaylists()]);
    setTracks(t);
    setPlaylists(p);
    setLoading(false);
  }, []);

  const handleAddTrackFast = useCallback(async (track: Partial<Track>) => {
    const id = await addTrack(track);
    return id;
  }, []);

  const handleAddTrack = useCallback(async (track: Partial<Track>) => {
    const id = await handleAddTrackFast(track);
    await refresh();
    return id;
  }, [handleAddTrackFast, refresh]);

  const handleDeleteTrack = useCallback(async (id: number) => {
    await deleteTrack(id);
    await refresh();
  }, [refresh]);

  const handleUpdateTrack = useCallback(async (id: number, updates: Partial<Track>) => {
    await updateTrack(id, updates);
    await refresh();
  }, [refresh]);

  const handleCreatePlaylistFast = useCallback(async (name: string) => {
    const id = await createPlaylistFast(name);
    return id;
  }, []);

  const handleCreatePlaylist = useCallback(async (name: string) => {
    const id = await createPlaylist(name);
    await refresh();
    return id;
  }, [refresh]);

  const handleDeletePlaylist = useCallback(async (id: number) => {
    await deletePlaylist(id);
    await refresh();
  }, [refresh]);

  const handleAddToPlaylistFast = useCallback(async (playlistId: number, trackId: number) => {
    await addTrackToPlaylist(playlistId, trackId);
  }, []);

  const handleAddToPlaylist = useCallback(async (playlistId: number, trackId: number) => {
    await addTrackToPlaylist(playlistId, trackId);
    await refresh();
  }, [refresh]);

  const handleRemoveFromPlaylist = useCallback(async (playlistId: number, trackId: number) => {
    await removeTrackFromPlaylist(playlistId, trackId);
    await refresh();
  }, [refresh]);

  const handleGetPlaylistTracks = useCallback(async (playlistId: number) => {
    return getPlaylistTracks(playlistId);
  }, []);

  const handleReorderPlaylistTracks = useCallback(async (playlistId: number, trackIds: number[]) => {
    await reorderPlaylistTracks(playlistId, trackIds);
    await refresh();
  }, [refresh]);

  const handleGenerateExport = useCallback(async (playlistIds: number[]) => {
    return generateExportManifest(playlistIds);
  }, []);

  const handleBackup = useCallback(() => {
    const data = exportDatabaseFile();
    const blob = new Blob([new Uint8Array(data)], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pioneer-export-backup-${new Date().toISOString().slice(0, 10)}.db`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleRestore = useCallback(async (data: Uint8Array) => {
    await restoreDatabase(data);
    await refresh();
  }, [refresh]);

  const handleRestoreFromBackupId = useCallback(async (id: string) => {
    const data = getBackupData(id);
    if (!data) throw new Error('Backup not found');
    await restoreDatabase(data);
    await refresh();
  }, [refresh]);

  const handleClearAll = useCallback(async () => {
    await clearAllData();
    await refresh();
  }, [refresh]);

  return {
    ready,
    loading,
    tracks,
    playlists,
    refresh,
    addTrack: handleAddTrack,
    addTrackFast: handleAddTrackFast,
    deleteTrack: handleDeleteTrack,
    updateTrack: handleUpdateTrack,
    createPlaylist: handleCreatePlaylist,
    createPlaylistFast: handleCreatePlaylistFast,
    deletePlaylist: handleDeletePlaylist,
    addToPlaylist: handleAddToPlaylist,
    addToPlaylistFast: handleAddToPlaylistFast,
    removeFromPlaylist: handleRemoveFromPlaylist,
    getPlaylistTracks: handleGetPlaylistTracks,
    reorderPlaylistTracks: handleReorderPlaylistTracks,
    generateExport: handleGenerateExport,
    backup: handleBackup,
    restore: handleRestore,
    restoreFromBackup: handleRestoreFromBackupId,
    clearAll: handleClearAll,
  };
}
