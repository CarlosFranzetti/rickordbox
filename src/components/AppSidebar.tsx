import { ReactNode, useState, useEffect } from 'react';
import { Music, ListMusic, Upload, HardDrive, Plus, Trash2, Disc3, Settings, ChevronRight, ChevronDown, Folder, FolderOpen, FileAudio } from 'lucide-react';
import type { Playlist, Track } from '@/lib/database';
import { formatDuration } from '@/lib/database';

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
  getPlaylistTracks?: (playlistId: number) => Promise<Track[]>;
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

function hasActiveDescendant(node: PlaylistTreeNode, activeId: number | null): boolean {
  if (!activeId) return false;
  if (node.playlist?.id === activeId) return true;
  return node.children.some(c => hasActiveDescendant(c, activeId));
}

function PlaylistNode({
  node,
  depth,
  activePlaylistId,
  onPlaylistSelect,
  onDeletePlaylist,
  getPlaylistTracks,
}: {
  node: PlaylistTreeNode;
  depth: number;
  activePlaylistId: number | null;
  onPlaylistSelect: (id: number) => void;
  onDeletePlaylist: (id: number) => void;
  getPlaylistTracks?: (playlistId: number) => Promise<Track[]>;
}) {
  const hasChildren = node.children.length > 0;
  const isActive = node.playlist && activePlaylistId === node.playlist.id;
  const [expanded, setExpanded] = useState(() => hasActiveDescendant(node, activePlaylistId));
  const isFolder = hasChildren && !node.playlist;
  const [tracks, setTracks] = useState<Track[]>([]);
  const [tracksLoaded, setTracksLoaded] = useState(false);

  // Load tracks when a playlist node is expanded
  useEffect(() => {
    if (expanded && node.playlist && getPlaylistTracks && !tracksLoaded) {
      getPlaylistTracks(node.playlist.id).then((t) => {
        setTracks(t);
        setTracksLoaded(true);
      });
    }
  }, [expanded, node.playlist, getPlaylistTracks, tracksLoaded]);

  // Refresh tracks when this playlist is active (after changes)
  useEffect(() => {
    if (isActive && node.playlist && getPlaylistTracks) {
      getPlaylistTracks(node.playlist.id).then(setTracks);
    }
  }, [isActive, node.playlist, getPlaylistTracks]);

  const handleClick = () => {
    if (node.playlist) {
      onPlaylistSelect(node.playlist.id);
    }
    if (hasChildren || node.playlist) {
      setExpanded(!expanded);
    }
  };

  const showInlineTracks = expanded && node.playlist && tracks.length > 0;

  return (
    <div>
      {/* Node row */}
      <div
        className={`group flex items-center gap-1.5 py-1 pr-2 cursor-pointer text-sm transition-colors rounded-sm
          ${isActive
            ? 'bg-primary/15 text-primary'
            : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground'
          }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={handleClick}
      >
        {/* Expand/collapse chevron */}
        {(hasChildren || node.playlist) ? (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); if (!tracksLoaded) setTracksLoaded(false); }}
            className="w-4 h-4 flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground"
          >
            {expanded
              ? <ChevronDown className="w-3 h-3" />
              : <ChevronRight className="w-3 h-3" />
            }
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        {/* Icon */}
        {isFolder ? (
          expanded
            ? <FolderOpen className="w-4 h-4 shrink-0 text-accent" />
            : <Folder className="w-4 h-4 shrink-0 text-accent" />
        ) : (
          <ListMusic className="w-4 h-4 shrink-0 text-primary/70" />
        )}

        {/* Label */}
        <span className={`truncate flex-1 ${isActive ? 'font-medium' : ''}`}>
          {node.segment}
        </span>

        {/* Track count badge */}
        {node.playlist && (
          <span className="text-[10px] font-mono text-muted-foreground tabular-nums ml-auto">
            {node.playlist.track_count || 0}
          </span>
        )}

        {/* Delete button */}
        {node.playlist && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeletePlaylist(node.playlist!.id);
            }}
            className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-destructive transition-all shrink-0"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Inline track list under playlist */}
      {showInlineTracks && (
        <div className="border-l border-border/40" style={{ marginLeft: `${16 + depth * 16}px` }}>
          {tracks.map((track) => (
            <div
              key={track.id}
              className="flex items-center gap-1.5 py-0.5 px-2 text-[11px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/30 transition-colors rounded-sm"
            >
              <FileAudio className="w-3 h-3 shrink-0 text-muted-foreground/60" />
              <span className="truncate text-foreground/90 font-medium min-w-0" style={{ maxWidth: '35%' }}>
                {track.title || '—'}
              </span>
              <span className="text-muted-foreground mx-0.5">·</span>
              <span className="truncate text-muted-foreground min-w-0" style={{ maxWidth: '30%' }}>
                {track.artist || '—'}
              </span>
              {track.bpm > 0 && (
                <>
                  <span className="text-muted-foreground/40 mx-0.5">·</span>
                  <span className="text-[10px] font-mono text-muted-foreground/70 shrink-0">
                    {track.bpm.toFixed(0)}
                  </span>
                </>
              )}
              {track.key && (
                <>
                  <span className="text-muted-foreground/40 mx-0.5">·</span>
                  <span className="text-[10px] font-mono text-primary/60 shrink-0">
                    {track.key}
                  </span>
                </>
              )}
              <span className="ml-auto text-[10px] font-mono text-muted-foreground/50 shrink-0">
                {formatDuration(track.duration)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Children folders/playlists */}
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
              getPlaylistTracks={getPlaylistTracks}
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
  getPlaylistTracks,
}: AppSidebarProps) {
  const tree = buildPlaylistTree(playlists);

  return (
    <div className="w-60 h-full bg-sidebar flex flex-col border-r border-sidebar-border">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <Disc3 className="w-6 h-6 text-primary glow-text" />
          <span className="font-semibold text-foreground tracking-tight">RIckordBox</span>
        </button>
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

      {/* Playlists / Explorer tree */}
      <div className="flex-1 overflow-y-auto">
        <div className="panel-header flex items-center justify-between">
          <span>Explorer</span>
          <button
            onClick={onCreatePlaylist}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="py-1">
          {playlists.length === 0 && (
            <p className="text-xs text-muted-foreground px-4 py-3">No playlists yet</p>
          )}
          {tree.map((node) => (
            <PlaylistNode
              key={node.fullPath}
              node={node}
              depth={0}
              activePlaylistId={activePlaylistId}
              onPlaylistSelect={onPlaylistSelect}
              onDeletePlaylist={onDeletePlaylist}
              getPlaylistTracks={getPlaylistTracks}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        {footerSlot}
        <p className="text-[10px] text-muted-foreground font-mono">SQLite in-browser • Local only</p>
      </div>
    </div>
  );
}
