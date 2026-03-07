import { useState, useEffect, useCallback } from 'react';
import {
  getDatabase,
  getAllTracks,
  getAllPlaylists,
  addTrack,
  deleteTrack,
  updateTrack,
  createPlaylist,
  deletePlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  getPlaylistTracks,
  reorderPlaylistTracks,
  generateExportManifest,
  exportDatabaseFile,
  restoreDatabase,
  type Track,
  type Playlist,
  type ExportManifest,
} from '@/lib/database';

export function useDatabase() {
  const [ready, setReady] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDatabase().then(() => {
      setReady(true);
      refresh();
    });
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [t, p] = await Promise.all([getAllTracks(), getAllPlaylists()]);
    setTracks(t);
    setPlaylists(p);
    setLoading(false);
  }, []);

  const handleAddTrack = useCallback(async (track: Partial<Track>) => {
    await addTrack(track);
    await refresh();
  }, [refresh]);

  const handleDeleteTrack = useCallback(async (id: number) => {
    await deleteTrack(id);
    await refresh();
  }, [refresh]);

  const handleUpdateTrack = useCallback(async (id: number, updates: Partial<Track>) => {
    await updateTrack(id, updates);
    await refresh();
  }, [refresh]);

  const handleCreatePlaylist = useCallback(async (name: string) => {
    const id = await createPlaylist(name);
    await refresh();
    return id;
  }, [refresh]);

  const handleDeletePlaylist = useCallback(async (id: number) => {
    await deletePlaylist(id);
    await refresh();
  }, [refresh]);

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
    const blob = new Blob([data.buffer], { type: 'application/octet-stream' });
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

  return {
    ready,
    loading,
    tracks,
    playlists,
    refresh,
    addTrack: handleAddTrack,
    deleteTrack: handleDeleteTrack,
    updateTrack: handleUpdateTrack,
    createPlaylist: handleCreatePlaylist,
    deletePlaylist: handleDeletePlaylist,
    addToPlaylist: handleAddToPlaylist,
    removeFromPlaylist: handleRemoveFromPlaylist,
    getPlaylistTracks: handleGetPlaylistTracks,
    reorderPlaylistTracks: handleReorderPlaylistTracks,
    generateExport: handleGenerateExport,
    backup: handleBackup,
    restore: handleRestore,
  };
}
