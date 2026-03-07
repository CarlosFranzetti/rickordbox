import { useState } from 'react';
import { Trash2, Plus, MoreHorizontal } from 'lucide-react';
import type { Track, Playlist } from '@/lib/database';
import { formatDuration } from '@/lib/database';
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
  onAddToPlaylist?: (playlistId: number, trackId: number) => void;
  onRemoveFromPlaylist?: (trackId: number) => void;
  showRemoveFromPlaylist?: boolean;
}

export function TrackTable({
  tracks,
  playlists,
  title,
  onDeleteTrack,
  onAddToPlaylist,
  onRemoveFromPlaylist,
  showRemoveFromPlaylist,
}: TrackTableProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="panel-header flex items-center justify-between">
        <span>{title}</span>
        <span className="text-[10px] font-mono">{tracks.length} tracks</span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[2fr_1.5fr_1fr_80px_60px_40px] gap-2 px-4 py-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border">
        <span>Title</span>
        <span>Artist</span>
        <span>Album</span>
        <span>BPM / Key</span>
        <span>Time</span>
        <span></span>
      </div>

      {/* Track Rows */}
      <div className="flex-1 overflow-y-auto">
        {tracks.length === 0 && (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            No tracks found
          </div>
        )}
        {tracks.map((track) => (
          <div
            key={track.id}
            onClick={() => setSelectedId(track.id)}
            className={`track-row grid grid-cols-[2fr_1.5fr_1fr_80px_60px_40px] gap-2 px-4 py-2 text-sm items-center ${
              selectedId === track.id ? 'track-row-selected' : ''
            }`}
          >
            <div className="truncate">
              <span className="text-foreground">{track.title}</span>
            </div>
            <span className="truncate text-secondary-foreground">{track.artist}</span>
            <span className="truncate text-muted-foreground text-xs">{track.album}</span>
            <div className="flex gap-1">
              {track.bpm > 0 && <span className="badge-bpm">{track.bpm.toFixed(0)}</span>}
              {track.key && <span className="badge-key">{track.key}</span>}
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
