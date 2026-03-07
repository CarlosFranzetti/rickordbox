import { useState } from 'react';
import { Music, ListMusic, Upload, HardDrive, Plus, Trash2, Disc3 } from 'lucide-react';
import type { Playlist } from '@/lib/database';

type View = 'collection' | 'import' | 'export';

interface AppSidebarProps {
  playlists: Playlist[];
  activeView: View;
  activePlaylistId: number | null;
  onViewChange: (view: View) => void;
  onPlaylistSelect: (id: number) => void;
  onCreatePlaylist: () => void;
  onDeletePlaylist: (id: number) => void;
  trackCount: number;
}

export function AppSidebar({
  playlists,
  activeView,
  activePlaylistId,
  onViewChange,
  onPlaylistSelect,
  onCreatePlaylist,
  onDeletePlaylist,
  trackCount,
}: AppSidebarProps) {
  return (
    <div className="w-60 h-full bg-sidebar flex flex-col border-r border-border">
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Disc3 className="w-6 h-6 text-primary glow-text" />
          <span className="font-semibold text-foreground tracking-tight">PioneerExport</span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 font-mono">CDJ USB Export Tool</p>
      </div>

      {/* Main Nav */}
      <nav className="p-2 space-y-0.5">
        <button
          onClick={() => onViewChange('collection')}
          className={`sidebar-item w-full ${activeView === 'collection' && !activePlaylistId ? 'sidebar-item-active' : ''}`}
        >
          <Music className="w-4 h-4" />
          <span>Collection</span>
          <span className="ml-auto text-xs font-mono text-muted-foreground">{trackCount}</span>
        </button>
        <button
          onClick={() => onViewChange('import')}
          className={`sidebar-item w-full ${activeView === 'import' ? 'sidebar-item-active' : ''}`}
        >
          <Upload className="w-4 h-4" />
          <span>Import Files</span>
        </button>
        <button
          onClick={() => onViewChange('export')}
          className={`sidebar-item w-full ${activeView === 'export' ? 'sidebar-item-active' : ''}`}
        >
          <HardDrive className="w-4 h-4" />
          <span>USB Export</span>
        </button>
      </nav>

      {/* Playlists */}
      <div className="flex-1 overflow-y-auto">
        <div className="panel-header flex items-center justify-between">
          <span>Playlists</span>
          <button
            onClick={onCreatePlaylist}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="p-2 space-y-0.5">
          {playlists.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-2">No playlists yet</p>
          )}
          {playlists.map((pl) => (
            <div
              key={pl.id}
              className={`sidebar-item group ${activePlaylistId === pl.id ? 'sidebar-item-active' : ''}`}
              onClick={() => onPlaylistSelect(pl.id)}
            >
              <ListMusic className="w-4 h-4" />
              <span className="truncate flex-1">{pl.name}</span>
              <span className="text-[10px] font-mono text-muted-foreground">{pl.track_count || 0}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePlaylist(pl.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground font-mono">SQLite in-browser • Local only</p>
      </div>
    </div>
  );
}
