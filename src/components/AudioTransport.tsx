import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle } from 'lucide-react';
import { formatDuration } from '@/lib/database';
import { Slider } from '@/components/ui/slider';
import type { Track } from '@/lib/database';

interface AudioTransportProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  onTogglePlay: () => void;
  onSkipNext: () => void;
  onSkipPrev: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleShuffle: () => void;
}

export function AudioTransport({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  shuffle,
  onTogglePlay,
  onSkipNext,
  onSkipPrev,
  onSeek,
  onVolumeChange,
  onToggleShuffle,
}: AudioTransportProps) {
  if (!currentTrack) return null;

  return (
    <div className="h-16 border-t border-border bg-card/80 backdrop-blur-sm flex items-center gap-3 px-4 shrink-0">
      {/* Track info */}
      <div className="flex items-center gap-3 w-56 shrink-0">
        <div className="w-10 h-10 rounded overflow-hidden bg-secondary/60 shrink-0">
          {currentTrack.cover_art_url ? (
            <img src={currentTrack.cover_art_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/40 text-xs">♪</div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-foreground truncate font-medium">{currentTrack.title}</p>
          <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex-1 flex flex-col items-center gap-1">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleShuffle}
            className={`p-1 rounded transition-colors ${shuffle ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>
          <button onClick={onSkipPrev} className="text-foreground hover:text-primary transition-colors">
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={onTogglePlay}
            className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button onClick={onSkipNext} className="text-foreground hover:text-primary transition-colors">
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 w-full max-w-md">
          <span className="text-[10px] font-mono text-muted-foreground w-10 text-right">
            {formatDuration(currentTime)}
          </span>
          <Slider
            value={[currentTime]}
            max={duration || 1}
            step={0.5}
            onValueChange={([v]) => onSeek(v)}
            className="flex-1"
          />
          <span className="text-[10px] font-mono text-muted-foreground w-10">
            {formatDuration(duration)}
          </span>
        </div>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2 w-32 shrink-0">
        <button
          onClick={() => onVolumeChange(volume > 0 ? 0 : 0.8)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <Slider
          value={[volume]}
          max={1}
          step={0.01}
          onValueChange={([v]) => onVolumeChange(v)}
          className="flex-1"
        />
      </div>
    </div>
  );
}
