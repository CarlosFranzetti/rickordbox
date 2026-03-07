import { useState, useEffect } from 'react';
import { useDatabase } from '@/hooks/useDatabase';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { AppSidebar } from '@/components/AppSidebar';
import { TrackTable } from '@/components/TrackTable';
import { TrackDetailPanel } from '@/components/TrackDetailPanel';
import { AudioTransport } from '@/components/AudioTransport';
import { FileImporter } from '@/components/FileImporter';
import { ExportPreview } from '@/components/ExportPreview';
import { CreatePlaylistDialog } from '@/components/CreatePlaylistDialog';
import { DatabaseTools } from '@/components/DatabaseTools';
import { SettingsPanel } from '@/components/SettingsPanel';
import { DuplicateManager } from '@/components/DuplicateManager';
import type { Track } from '@/lib/database';
import { Loader2 } from 'lucide-react';

type View = 'collection' | 'import' | 'export' | 'settings';

const Index = () => {
  const db = useDatabase();
  const player = useAudioPlayer();
  const [activeView, setActiveView] = useState<View>('collection');
  const [activePlaylistId, setActivePlaylistId] = useState<number | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<Track[]>([]);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

  useEffect(() => {
    if (activePlaylistId) {
      db.getPlaylistTracks(activePlaylistId).then(setPlaylistTracks);
    }
  }, [activePlaylistId, db.tracks]);

  const handleViewChange = (view: View) => {
    if (view === 'settings') {
      setShowSettings(true);
      return;
    }
    setActiveView(view);
    setActivePlaylistId(null);
  };

  const handlePlaylistSelect = (id: number) => {
    setActivePlaylistId(id);
    setActiveView('collection');
  };

  if (!db.ready) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-mono">Initializing SQLite...</span>
        </div>
      </div>
    );
  }

  const sharedTrackTableProps = {
    playlists: db.playlists,
    onDeleteTrack: db.deleteTrack,
    onUpdateTrack: db.updateTrack,
    onAddToPlaylist: db.addToPlaylist,
    showSearch: true,
    onSelectTrack: setSelectedTrack,
    selectedTrackId: selectedTrack?.id ?? null,
    onPlayTrack: (track: Track, trackList: Track[]) => player.playTrack(track, trackList),
    currentPlayingId: player.currentTrack?.id ?? null,
    isPlaying: player.isPlaying,
    hasFileHandle: player.hasFileHandle,
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar
        playlists={db.playlists}
        activeView={activeView}
        activePlaylistId={activePlaylistId}
        onViewChange={handleViewChange}
        onPlaylistSelect={handlePlaylistSelect}
        onCreatePlaylist={() => setShowCreatePlaylist(true)}
        onDeletePlaylist={db.deletePlaylist}
        trackCount={db.tracks.length}
        onOpenSettings={() => setShowSettings(true)}
        footerSlot={
          <div className="space-y-2">
            <DuplicateManager
              tracks={db.tracks}
              onDeleteTrack={db.deleteTrack}
              onPlayTrack={(track) => player.playTrack(track)}
              hasFileHandle={player.hasFileHandle}
            />
            <DatabaseTools onBackup={db.backup} onRestore={db.restore} />
          </div>
        }
        getPlaylistTracks={db.getPlaylistTracks}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {activeView === 'collection' && !activePlaylistId && (
          <TrackTable
            tracks={db.tracks}
            title="Collection"
            {...sharedTrackTableProps}
          />
        )}

        {activeView === 'collection' && activePlaylistId && (
          <TrackTable
            tracks={playlistTracks}
            title={(() => {
              const pl = db.playlists.find((p) => p.id === activePlaylistId);
              if (!pl) return 'Playlist';
              const parts = pl.name.split(' / ');
              return parts[parts.length - 1];
            })()}
            {...sharedTrackTableProps}
            onRemoveFromPlaylist={(trackId) =>
              db.removeFromPlaylist(activePlaylistId, trackId)
            }
            onReorderTracks={(trackIds) =>
              db.reorderPlaylistTracks(activePlaylistId, trackIds)
            }
            showRemoveFromPlaylist
            allowReorder
          />
        )}

        {activeView === 'import' && (
          <FileImporter
            onImport={db.addTrackFast}
            onImportComplete={async () => {
              await db.refresh();
            }}
            onCreatePlaylist={db.createPlaylistFast}
            onAddToPlaylist={db.addToPlaylistFast}
            onRegisterFiles={player.registerFiles}
          />
        )}

        {activeView === 'export' && (
          <ExportPreview
            playlists={db.playlists}
            onGenerateExport={db.generateExport}
          />
        )}

        {/* Detail Panel */}
        {selectedTrack && (activeView === 'collection') && (
          <TrackDetailPanel track={selectedTrack} onClose={() => setSelectedTrack(null)} />
        )}

        {/* Audio Transport */}
        <AudioTransport
          currentTrack={player.currentTrack}
          isPlaying={player.isPlaying}
          currentTime={player.currentTime}
          duration={player.duration}
          volume={player.volume}
          shuffle={player.shuffle}
          onTogglePlay={player.togglePlay}
          onSkipNext={player.skipNext}
          onSkipPrev={player.skipPrev}
          onSeek={player.seek}
          onVolumeChange={player.setVolume}
          onToggleShuffle={player.toggleShuffle}
        />
      </main>

      <CreatePlaylistDialog
        open={showCreatePlaylist}
        onOpenChange={setShowCreatePlaylist}
        onCreate={(name) => db.createPlaylist(name)}
      />

      <SettingsPanel
        open={showSettings}
        onOpenChange={setShowSettings}
        onClearAll={db.clearAll}
        onRestoreBackup={db.restoreFromBackup}
        tracks={db.tracks}
        onRefresh={db.refresh}
        onUpdateTrack={db.updateTrack}
      />
    </div>
  );
};

export default Index;
