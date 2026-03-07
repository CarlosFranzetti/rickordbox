import { useState, useRef, useEffect, useCallback } from 'react';
import { Trash2, Plus, MoreHorizontal, Search, X, GripVertical } from 'lucide-react';
import type { Track, Playlist } from '@/lib/database';
import { formatDuration } from '@/lib/database';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TrackTableProps {
  tracks: Track[];
  playlists: Playlist[];
  title: string;
  onDeleteTrack?: (id: number) => void;
  onUpdateTrack?: (id: number, updates: Partial<Track>) => void;
  onAddToPlaylist?: (playlistId: number, trackId: number) => void;
  onRemoveFromPlaylist?: (trackId: number) => void;
  onReorderTracks?: (trackIds: number[]) => void;
  showRemoveFromPlaylist?: boolean;
  showSearch?: boolean;
  allowReorder?: boolean;
}

// Inline editable cell
function EditableCell({
  value,
  onSave,
  className = '',
  type = 'text',
}: {
  value: string | number;
  onSave: (val: string) => void;
  className?: string;
  type?: 'text' | 'number';
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== String(value)) {
      onSave(draft);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setDraft(String(value));
            setEditing(false);
          }
        }}
        type={type}
        className={`bg-secondary/80 border border-primary/40 rounded px-1.5 py-0.5 text-foreground outline-none focus:border-primary w-full ${className}`}
      />
    );
  }

  return (
    <span
      onDoubleClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
      className={`truncate cursor-default hover:bg-secondary/40 rounded px-0.5 transition-colors ${className}`}
      title="Double-click to edit"
    >
      {value || '—'}
    </span>
  );
}

function getUniqueKeys(tracks: Track[]): string[] {
  const keys = new Set<string>();
  tracks.forEach((t) => t.key && keys.add(t.key));
  return Array.from(keys).sort();
}

export function TrackTable({
  tracks,
  playlists,
  title,
  onDeleteTrack,
  onUpdateTrack,
  onAddToPlaylist,
  onRemoveFromPlaylist,
  onReorderTracks,
  showRemoveFromPlaylist,
  showSearch = false,
  allowReorder = false,
}: TrackTableProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKey, setFilterKey] = useState('');
  const [bpmMin, setBpmMin] = useState('');
  const [bpmMax, setBpmMax] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Drag-and-drop state
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const uniqueKeys = getUniqueKeys(tracks);

  const filtered = tracks.filter((t) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !t.title.toLowerCase().includes(q) &&
        !t.artist.toLowerCase().includes(q) &&
        !t.album.toLowerCase().includes(q)
      )
        return false;
    }
    if (filterKey && t.key !== filterKey) return false;
    if (bpmMin && t.bpm < Number(bpmMin)) return false;
    if (bpmMax && t.bpm > Number(bpmMax)) return false;
    return true;
  });

  const hasActiveFilters = searchQuery || filterKey || bpmMin || bpmMax;
  const canReorder = allowReorder && onReorderTracks && !hasActiveFilters;

  const clearFilters = () => {
    setSearchQuery('');
    setFilterKey('');
    setBpmMin('');
    setBpmMax('');
  };

  const handleDragEnd = useCallback(() => {
    if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx && canReorder) {
      const ids = filtered.map((t) => t.id);
      const [moved] = ids.splice(dragIdx, 1);
      ids.splice(overIdx, 0, moved);
      onReorderTracks!(ids);
    }
    setDragIdx(null);
    setOverIdx(null);
  }, [dragIdx, overIdx, canReorder, filtered, onReorderTracks]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="panel-header flex items-center justify-between">
        <span>{title}</span>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <span className="text-[10px] font-mono text-primary">
              {filtered.length}/{tracks.length}
            </span>
          )}
          <span className="text-[10px] font-mono">{tracks.length} tracks</span>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1 rounded transition-colors ${showFilters ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search & Filters Bar */}
      {showFilters && (
        <div className="px-4 py-2 border-b border-border bg-card/50 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-[300px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, artist, album…"
              className="h-7 pl-7 text-xs bg-secondary/60 border-border"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground font-mono">BPM</span>
            <input
              value={bpmMin}
              onChange={(e) => setBpmMin(e.target.value)}
              placeholder="min"
              type="number"
              className="w-14 h-7 text-xs bg-secondary/60 border border-border rounded px-1.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
            />
            <span className="text-muted-foreground text-xs">–</span>
            <input
              value={bpmMax}
              onChange={(e) => setBpmMax(e.target.value)}
              placeholder="max"
              type="number"
              className="w-14 h-7 text-xs bg-secondary/60 border border-border rounded px-1.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
            />
          </div>
          {uniqueKeys.length > 0 && (
            <select
              value={filterKey}
              onChange={(e) => setFilterKey(e.target.value)}
              className="h-7 text-xs bg-secondary/60 border border-border rounded px-1.5 text-foreground outline-none focus:border-primary"
            >
              <option value="">All keys</option>
              {uniqueKeys.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          )}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      )}

      {/* Table Header */}
      <div className={`grid gap-2 px-4 py-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border ${canReorder ? 'grid-cols-[24px_2fr_1.5fr_1fr_80px_60px_40px]' : 'grid-cols-[2fr_1.5fr_1fr_80px_60px_40px]'}`}>
        {canReorder && <span></span>}
        <span>Title</span>
        <span>Artist</span>
        <span>Album</span>
        <span>BPM / Key</span>
        <span>Time</span>
        <span></span>
      </div>

      {/* Track Rows */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            {hasActiveFilters ? 'No tracks match filters' : 'No tracks found'}
          </div>
        )}
        {filtered.map((track, idx) => (
          <div
            key={track.id}
            onClick={() => setSelectedId(track.id)}
            draggable={canReorder}
            onDragStart={() => canReorder && setDragIdx(idx)}
            onDragOver={(e) => {
              if (canReorder) {
                e.preventDefault();
                setOverIdx(idx);
              }
            }}
            onDragEnd={handleDragEnd}
            className={`track-row grid gap-2 px-4 py-2 text-sm items-center ${
              canReorder ? 'grid-cols-[24px_2fr_1.5fr_1fr_80px_60px_40px]' : 'grid-cols-[2fr_1.5fr_1fr_80px_60px_40px]'
            } ${selectedId === track.id ? 'track-row-selected' : ''} ${
              dragIdx !== null && overIdx === idx && dragIdx !== idx ? 'border-t-2 !border-t-primary' : ''
            }`}
          >
            {canReorder && (
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground cursor-grab" />
            )}
            <div className="truncate">
              {onUpdateTrack ? (
                <EditableCell
                  value={track.title}
                  onSave={(v) => onUpdateTrack(track.id, { title: v })}
                  className="text-foreground text-sm"
                />
              ) : (
                <span className="text-foreground">{track.title}</span>
              )}
            </div>
            <div className="truncate">
              {onUpdateTrack ? (
                <EditableCell
                  value={track.artist}
                  onSave={(v) => onUpdateTrack(track.id, { artist: v })}
                  className="text-secondary-foreground text-sm"
                />
              ) : (
                <span className="truncate text-secondary-foreground">{track.artist}</span>
              )}
            </div>
            <span className="truncate text-muted-foreground text-xs">{track.album}</span>
            <div className="flex gap-1">
              {onUpdateTrack ? (
                <>
                  <EditableCell
                    value={track.bpm > 0 ? track.bpm.toFixed(0) : ''}
                    onSave={(v) => onUpdateTrack(track.id, { bpm: parseFloat(v) || 0 })}
                    className="badge-bpm text-xs font-mono w-8 text-center"
                  />
                  <EditableCell
                    value={track.key || ''}
                    onSave={(v) => onUpdateTrack(track.id, { key: v })}
                    className="badge-key text-xs font-mono w-8 text-center"
                  />
                </>
              ) : (
                <>
                  {track.bpm > 0 && <span className="badge-bpm">{track.bpm.toFixed(0)}</span>}
                  {track.key && <span className="badge-key">{track.key}</span>}
                </>
              )}
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {formatDuration(track.duration)}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {onAddToPlaylist && playlists.length > 0 && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Plus className="w-3.5 h-3.5 mr-2" />
                      Add to playlist
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {playlists.map((pl) => (
                        <DropdownMenuItem
                          key={pl.id}
                          onClick={() => onAddToPlaylist(pl.id, track.id)}
                        >
                          {pl.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}
                {showRemoveFromPlaylist && onRemoveFromPlaylist && (
                  <DropdownMenuItem onClick={() => onRemoveFromPlaylist(track.id)}>
                    Remove from playlist
                  </DropdownMenuItem>
                )}
                {onDeleteTrack && (
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDeleteTrack(track.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    Delete track
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    </div>
  );
}
