import type { Track } from '@/lib/database';
import { formatDuration } from '@/lib/database';
import { X } from 'lucide-react';

interface TrackDetailPanelProps {
  track: Track;
  onClose: () => void;
}

function MetaItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground truncate" title={String(value)}>{value || '—'}</p>
    </div>
  );
}

export function TrackDetailPanel({ track, onClose }: TrackDetailPanelProps) {
  return (
    <div className="border-t border-border bg-card/60 backdrop-blur-sm">
      <div className="flex items-start gap-5 p-4">
        {/* Cover Art */}
        <div className="w-32 h-32 rounded-lg overflow-hidden bg-secondary/60 shrink-0 shadow-lg">
          {track.cover_art_url ? (
            <img src={track.cover_art_url} alt={`${track.title} cover`} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl text-muted-foreground/30">♪</div>
          )}
        </div>

        {/* Metadata Grid */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-3">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-foreground truncate">{track.title || '—'}</h3>
              <p className="text-sm text-muted-foreground truncate">{track.artist || '—'}</p>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-x-4 gap-y-2">
            <MetaItem label="Album" value={track.album} />
            <MetaItem label="Genre" value={track.genre} />
            <MetaItem label="Label" value={track.label} />
            <MetaItem label="Year" value={track.year || '—'} />
            <MetaItem label="BPM" value={track.bpm > 0 ? track.bpm.toFixed(1) : '—'} />
            <MetaItem label="Key" value={track.key} />
            <MetaItem label="Duration" value={formatDuration(track.duration)} />
            <MetaItem label="Bitrate" value={track.bitrate ? `${track.bitrate} kbps` : '—'} />
            <MetaItem label="Sample Rate" value={track.sample_rate ? `${track.sample_rate} Hz` : '—'} />
            <MetaItem label="Comment" value={track.comment} />
            <MetaItem label="Rating" value={track.rating || '—'} />
            <MetaItem label="Play Count" value={track.play_count || 0} />
            <MetaItem label="Date Added" value={track.date_added ? new Date(track.date_added).toLocaleDateString() : '—'} />
            <MetaItem label="File" value={track.file_name} />
          </div>
        </div>
      </div>
    </div>
  );
}
