import { ReactNode, useState } from 'react';
import { Music, ListMusic, Upload, HardDrive, Plus, Trash2, Disc3, Settings, ChevronRight, FolderOpen } from 'lucide-react';
import type { Playlist } from '@/lib/database';

type View = 'collection' | 'import' | 'export' | 'settings';

interface AppSidebarProps {
  playlists: Playlist[];
  activeView: View;
  activePlaylistId: number | null;
  onViewChange: (view: View) => void;
  onPlaylistSelect: (id: number) => void;
  onCreatePlaylist: () => void;
  onDeletePlaylist: (id: number) => void;
  onOpenSettings: () => void;
  trackCount: number;
  footerSlot?: ReactNode;
}

interface PlaylistTreeNode {
  segment: string;
  fullPath: string;
  playlist: Playlist | null;
  children: PlaylistTreeNode[];
}

function buildPlaylistTree(playlists: Playlist[]): PlaylistTreeNode[] {
  const root: PlaylistTreeNode[] = [];

  for (const pl of playlists) {
    const segments = pl.name.split(' / ').map(s => s.trim());
    let currentLevel = root;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const fullPath = segments.slice(0, i + 1).join(' / ');
      let existing = currentLevel.find(n => n.segment === segment);

      if (!existing) {
        existing = { segment, fullPath, playlist: null, children: [] };
        currentLevel.push(existing);
      }

      if (i === segments.length - 1) {
        existing.playlist = pl;
      }

      currentLevel = existing.children;
    }
  }

  return root;
}

function PlaylistNode({
  node,
  depth,
  activePlaylistId,
  onPlaylistSelect,
  onDeletePlaylist,
}: {
  node: PlaylistTreeNode;
  depth: number;
  activePlaylistId: number | null;
  onPlaylistSelect: (id: number) => void;
  onDeletePlaylist: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const isActive = node.playlist && activePlaylistId === node.playlist.id;

  return (
    <div>
      <div
        className={`sidebar-item group ${isActive ? 'sidebar-item-active' : ''}`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        onClick={() => {
          if (node.playlist) onPlaylistSelect(node.playlist.id);
          if (hasChildren) setExpanded(!expanded);
        }}
      >
        {hasChildren ? (
          <ChevronRight className={`w-3 h-3 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        ) : (
          <span className="w-3" />
        )}
        {hasChildren && !node.playlist ? (
          <FolderOpen className="w-4 h-4 shrink-0" />
        ) : (
          <ListMusic className="w-4 h-4 shrink-0" />
        )}
        <span className="truncate flex-1 text-sm">{node.segment}</span>
        {node.playlist && (
          <>
            <span className="text-[10px] font-mono text-muted-foreground">{node.playlist.track_count || 0}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeletePlaylist(node.playlist!.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </>
        )}
      </div>
      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <PlaylistNode
              key={child.fullPath}
              node={child}
              depth={depth + 1}
              activePlaylistId={activePlaylistId}
              onPlaylistSelect={onPlaylistSelect}
              onDeletePlaylist={onDeletePlaylist}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AppSidebar({
  playlists,
  activeView,
  activePlaylistId,
  onViewChange,
  onPlaylistSelect,
  onCreatePlaylist,
  onDeletePlaylist,
  onOpenSettings,
  trackCount,
  footerSlot,
}: AppSidebarProps) {
  const tree = buildPlaylistTree(playlists);

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
        <button
          onClick={onOpenSettings}
          className="sidebar-item w-full"
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
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
          {tree.map((node) => (
            <PlaylistNode
              key={node.fullPath}
              node={node}
              depth={0}
              activePlaylistId={activePlaylistId}
              onPlaylistSelect={onPlaylistSelect}
              onDeletePlaylist={onDeletePlaylist}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border space-y-2">
        {footerSlot}
        <p className="text-[10px] text-muted-foreground font-mono">SQLite in-browser • Local only</p>
      </div>
    </div>
  );
}
