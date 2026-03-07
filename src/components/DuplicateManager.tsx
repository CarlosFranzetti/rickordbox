import { useState, useMemo } from 'react';
import { AlertTriangle, Play, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { Track } from '@/lib/database';
import { formatDuration } from '@/lib/database';

interface DuplicateManagerProps {
  tracks: Track[];
  onDeleteTrack: (id: number) => void;
  onPlayTrack?: (track: Track) => void;
  hasFileHandle?: (path: string) => boolean;
}

interface DuplicateGroup {
  key: string;
  tracks: Track[];
  type: 'exact-path' | 'metadata-match';
}

function findDuplicates(tracks: Track[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];

  // Exact path duplicates
  const byPath = new Map<string, Track[]>();
  for (const t of tracks) {
    if (!t.file_path) continue;
    const arr = byPath.get(t.file_path) || [];
    arr.push(t);
    byPath.set(t.file_path, arr);
  }
  for (const [path, dupes] of byPath) {
    if (dupes.length > 1) {
      groups.push({ key: `path:${path}`, tracks: dupes, type: 'exact-path' });
    }
  }

  // Metadata duplicates (same title+artist, different path)
  const byMeta = new Map<string, Track[]>();
  for (const t of tracks) {
    if (!t.title || t.title === 'Unknown') continue;
    const key = `${t.title.toLowerCase().trim()}|||${t.artist.toLowerCase().trim()}`;
    const arr = byMeta.get(key) || [];
    arr.push(t);
    byMeta.set(key, arr);
  }
  for (const [key, dupes] of byMeta) {
    if (dupes.length > 1) {
      // Exclude if all paths are the same (already caught above)
      const uniquePaths = new Set(dupes.map(t => t.file_path));
      if (uniquePaths.size > 1) {
        groups.push({ key: `meta:${key}`, tracks: dupes, type: 'metadata-match' });
      }
    }
  }

  return groups;
}

export function DuplicateManager({ tracks, onDeleteTrack, onPlayTrack, hasFileHandle }: DuplicateManagerProps) {
  const [open, setOpen] = useState(false);
  const [kept, setKept] = useState<Set<number>>(new Set());

  const groups = useMemo(() => findDuplicates(tracks), [tracks]);
  const exactPathCount = groups.filter(g => g.type === 'exact-path').length;
  const metaMatchCount = groups.filter(g => g.type === 'metadata-match').length;

  const autoRemoveExactDupes = () => {
    for (const group of groups) {
      if (group.type === 'exact-path') {
        // Keep the first, delete the rest
        for (let i = 1; i < group.tracks.length; i++) {
          onDeleteTrack(group.tracks[i].id);
        }
      }
    }
  };

  const handleKeep = (trackId: number, groupKey: string) => {
    const group = groups.find(g => g.key === groupKey);
    if (!group) return;
    // Delete all others in this group
    for (const t of group.tracks) {
      if (t.id !== trackId) onDeleteTrack(t.id);
    }
    setKept(prev => new Set(prev).add(trackId));
  };

  if (groups.length === 0) {
    return (
      <Button variant="outline" size="sm" disabled className="opacity-50">
        <Check className="w-3.5 h-3.5 mr-1.5" />
        No duplicates
      </Button>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-accent" />
        {groups.length} duplicate group{groups.length > 1 ? 's' : ''}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-accent" />
              Duplicate Tracks
            </DialogTitle>
            <DialogDescription>
              {exactPathCount > 0 && <span className="text-destructive">{exactPathCount} exact path duplicate{exactPathCount > 1 ? 's' : ''}</span>}
              {exactPathCount > 0 && metaMatchCount > 0 && ' · '}
              {metaMatchCount > 0 && <span className="text-accent">{metaMatchCount} metadata match{metaMatchCount > 1 ? 'es' : ''}</span>}
            </DialogDescription>
          </DialogHeader>

          {exactPathCount > 0 && (
            <div className="flex items-center gap-2 px-1">
              <Button size="sm" variant="destructive" onClick={autoRemoveExactDupes}>
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Auto-remove {exactPathCount} exact duplicates
              </Button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            {groups.map((group) => (
              <div key={group.key} className="border border-border rounded-lg overflow-hidden">
                <div className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider ${
                  group.type === 'exact-path' ? 'bg-destructive/10 text-destructive' : 'bg-accent/10 text-accent'
                }`}>
                  {group.type === 'exact-path' ? 'Same file path' : 'Same title & artist'}
                </div>
                {group.tracks.map((track) => (
                  <div
                    key={track.id}
                    className={`flex items-center gap-3 px-3 py-2 border-t border-border/50 ${
                      kept.has(track.id) ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded overflow-hidden bg-secondary/60 shrink-0">
                      {track.cover_art_url ? (
                        <img src={track.cover_art_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[8px] text-muted-foreground/40">♪</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{track.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{track.artist} · {formatDuration(track.duration)} · {track.bitrate}kbps</p>
                      <p className="text-[10px] font-mono text-muted-foreground/60 truncate">{track.file_path}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {onPlayTrack && hasFileHandle?.(track.file_path) && (
                        <button
                          onClick={() => onPlayTrack(track)}
                          className="p-1.5 rounded text-muted-foreground hover:text-primary transition-colors"
                          title="Audition"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handleKeep(track.id, group.key)}
                      >
                        Keep this
                      </Button>
                      <button
                        onClick={() => onDeleteTrack(track.id)}
                        className="p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
