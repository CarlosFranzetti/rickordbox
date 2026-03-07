import { useState } from 'react';
import { HardDrive, FolderTree, FileAudio, ListMusic, ChevronRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { Playlist, ExportManifest } from '@/lib/database';

interface ExportPreviewProps {
  playlists: Playlist[];
  onGenerateExport: (playlistIds: number[]) => Promise<ExportManifest>;
}

export function ExportPreview({ playlists, onGenerateExport }: ExportPreviewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [manifest, setManifest] = useState<ExportManifest | null>(null);
  const [generating, setGenerating] = useState(false);

  const togglePlaylist = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const m = await onGenerateExport(Array.from(selectedIds));
    setManifest(m);
    setGenerating(false);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="flex-1 flex flex-col p-6 gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-primary" />
          USB Export Preview
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select playlists to preview the Pioneer-compatible USB folder structure.
        </p>
      </div>

      {/* Playlist Selection */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Select Playlists
        </p>
        {playlists.length === 0 && (
          <p className="text-sm text-muted-foreground">No playlists to export. Create some first.</p>
        )}
        {playlists.map((pl) => (
          <label
            key={pl.id}
            className="flex items-center gap-3 px-3 py-2 rounded-md bg-card hover:bg-secondary/40 cursor-pointer transition-colors"
          >
            <Checkbox
              checked={selectedIds.has(pl.id)}
              onCheckedChange={() => togglePlaylist(pl.id)}
            />
            <ListMusic className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm flex-1">{pl.name}</span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {pl.track_count || 0} tracks
            </span>
          </label>
        ))}
      </div>

      {selectedIds.size > 0 && (
        <Button onClick={handleGenerate} disabled={generating} className="w-fit">
          <FolderTree className="w-4 h-4 mr-2" />
          {generating ? 'Generating...' : 'Preview Export Structure'}
        </Button>
      )}

      {/* Manifest Preview */}
      {manifest && (
        <div className="space-y-4 border border-border rounded-lg p-4 bg-card">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Export Manifest</h3>
            <div className="flex gap-3 text-xs font-mono text-muted-foreground">
              <span>{manifest.trackCount} files</span>
              <span>{formatSize(manifest.totalSize)}</span>
            </div>
          </div>

          {/* Folder tree */}
          <div className="font-mono text-xs space-y-0.5">
            <div className="text-primary font-semibold">USB_ROOT/</div>
            {manifest.folders.map((f, i) => (
              <div key={i} className="flex items-center gap-1 text-muted-foreground" style={{ paddingLeft: `${(f.split('/').length - 1) * 12}px` }}>
                <ChevronRight className="w-3 h-3" />
                <span>{f.split('/').pop()}/</span>
              </div>
            ))}
          </div>

          {/* File mapping */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              File Mapping
            </p>
            {manifest.files.slice(0, 20).map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                <FileAudio className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="truncate text-muted-foreground">{f.source}</span>
                <span className="text-primary">→</span>
                <span className="truncate text-foreground">{f.destination}</span>
              </div>
            ))}
            {manifest.files.length > 20 && (
              <p className="text-xs text-muted-foreground">...and {manifest.files.length - 20} more</p>
            )}
          </div>

          {/* Playlist entries */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Playlist Entries (export.pdb)
            </p>
            {manifest.playlistEntries.map((pe, i) => (
              <div key={i} className="text-xs">
                <span className="text-accent font-semibold">{pe.playlistName}</span>
                <span className="text-muted-foreground ml-2">({pe.tracks.length} tracks)</span>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-muted-foreground border-t border-border pt-3">
            ⚠ This is a preview. Actual export.pdb generation requires the Python backend (pyrekordbox).
          </p>
        </div>
      )}
    </div>
  );
}
