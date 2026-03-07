import { useState, useEffect } from 'react';
import { useDatabase } from '@/hooks/useDatabase';
import { AppSidebar } from '@/components/AppSidebar';
import { TrackTable } from '@/components/TrackTable';
import { FileImporter } from '@/components/FileImporter';
import { ExportPreview } from '@/components/ExportPreview';
import { CreatePlaylistDialog } from '@/components/CreatePlaylistDialog';
import { DatabaseTools } from '@/components/DatabaseTools';
import type { Track } from '@/lib/database';
import { Loader2 } from 'lucide-react';

type View = 'collection' | 'import' | 'export';

const Index = () => {
  const db = useDatabase();
  const [activeView, setActiveView] = useState<View>('collection');
  const [activePlaylistId, setActivePlaylistId] = useState<number | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<Track[]>([]);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);

  useEffect(() => {
    if (activePlaylistId) {
      db.getPlaylistTracks(activePlaylistId).then(setPlaylistTracks);
    }
  }, [activePlaylistId, db.tracks]);

  const handleViewChange = (view: View) => {
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
        footerSlot={<DatabaseTools onBackup={db.backup} onRestore={db.restore} />}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {activeView === 'collection' && !activePlaylistId && (
          <TrackTable
            tracks={db.tracks}
            playlists={db.playlists}
            title="Collection"
            onDeleteTrack={db.deleteTrack}
            onUpdateTrack={db.updateTrack}
            onAddToPlaylist={db.addToPlaylist}
            showSearch
          />
        )}

        {activeView === 'collection' && activePlaylistId && (
          <TrackTable
            tracks={playlistTracks}
            playlists={db.playlists}
            title={db.playlists.find((p) => p.id === activePlaylistId)?.name || 'Playlist'}
            onDeleteTrack={db.deleteTrack}
            onUpdateTrack={db.updateTrack}
            onAddToPlaylist={db.addToPlaylist}
            onRemoveFromPlaylist={(trackId) =>
              db.removeFromPlaylist(activePlaylistId, trackId)
            }
            onReorderTracks={(trackIds) =>
              db.reorderPlaylistTracks(activePlaylistId, trackIds)
            }
            showRemoveFromPlaylist
            showSearch
            allowReorder
          />
        )}

        {activeView === 'import' && <FileImporter onImport={db.addTrack} />}

        {activeView === 'export' && (
          <ExportPreview
            playlists={db.playlists}
            onGenerateExport={db.generateExport}
          />
        )}
      </main>

      <CreatePlaylistDialog
        open={showCreatePlaylist}
        onOpenChange={setShowCreatePlaylist}
        onCreate={(name) => db.createPlaylist(name)}
      />
    </div>
  );
};

export default Index;
