import { useState, useCallback, useRef } from 'react';
import { Upload, FileAudio, FolderOpen, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Track } from '@/lib/database';

interface FileImporterProps {
  onImport: (track: Partial<Track>) => Promise<void>;
}

interface ImportResult {
  fileName: string;
  status: 'success' | 'error';
  message?: string;
}

const AUDIO_EXTS = ['mp3', 'wav', 'flac', 'aiff', 'aif', 'm4a', 'ogg', 'wma'];

export function FileImporter({ onImport }: FileImporterProps) {
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    async (files: File[], basePaths?: Map<File, string>) => {
      setImporting(true);
      setProgress({ current: 0, total: files.length });
      const newResults: ImportResult[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress({ current: i + 1, total: files.length });
        const ext = file.name.split('.').pop()?.toLowerCase();

        if (!ext || !AUDIO_EXTS.includes(ext)) {
          continue; // silently skip non-audio
        }

        try {
          let title = file.name.replace(/\.[^/.]+$/, '');
          let artist = 'Unknown';

          const dashSplit = title.split(' - ');
          if (dashSplit.length >= 2) {
            artist = dashSplit[0].trim();
            title = dashSplit.slice(1).join(' - ').trim();
          }

          // Use webkitRelativePath or basePaths for folder imports
          const filePath = basePaths?.get(file) || (file as any).webkitRelativePath || file.name;

          let duration = 0;
          try {
            const arrayBuffer = await file.arrayBuffer();
            const audioContext = new AudioContext();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            duration = audioBuffer.duration;
            audioContext.close();
          } catch {
            // Duration extraction failed
          }

          await onImport({
            title,
            artist,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            duration,
          });

          newResults.push({ fileName: file.name, status: 'success' });
        } catch (err) {
          newResults.push({ fileName: file.name, status: 'error', message: 'Import failed' });
        }
      }

      setResults(newResults);
      setImporting(false);
    },
    [onImport]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      const items = e.dataTransfer.items;
      if (items && items.length > 0) {
        const allFiles: File[] = [];
        const basePaths = new Map<File, string>();

        // Try to read as directory entries for folder drops
        const entries: FileSystemEntry[] = [];
        for (let i = 0; i < items.length; i++) {
          const entry = items[i].webkitGetAsEntry?.();
          if (entry) entries.push(entry);
        }

        if (entries.length > 0) {
          for (const entry of entries) {
            await readEntry(entry, '', allFiles, basePaths);
          }
        } else {
          // Fallback to plain files
          for (const file of Array.from(e.dataTransfer.files)) {
            allFiles.push(file);
          }
        }

        if (allFiles.length > 0) {
          processFiles(allFiles, basePaths);
        }
      }
    },
    [processFiles]
  );

  const handleFolderInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(Array.from(e.target.files));
      }
    },
    [processFiles]
  );

  const audioResults = results.filter((r) => r.status === 'success' || r.status === 'error');

  return (
    <div className="flex-1 flex flex-col p-6 gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Import Audio Files</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Scan files or folders to add to your collection. Tracks stay where they are — export copies them to USB later.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`drop-zone flex flex-col items-center gap-4 ${dragOver ? 'drop-zone-active' : ''}`}
      >
        <Upload className={`w-10 h-10 ${dragOver ? 'text-primary' : 'text-muted-foreground'}`} />
        <div className="text-center">
          <p className="text-sm text-foreground">Drag & drop audio files or folders here</p>
          <p className="text-xs text-muted-foreground mt-1">
            Supports MP3, WAV, FLAC, AIFF, M4A • Original files are never moved
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            <FileAudio className="w-3.5 h-3.5 mr-1.5" />
            Browse Files
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => folderInputRef.current?.click()}
            disabled={importing}
          >
            <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
            Browse Folder
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".mp3,.wav,.flac,.aiff,.aif,.m4a,.ogg,.wma"
          className="hidden"
          onChange={(e) => e.target.files && processFiles(Array.from(e.target.files))}
        />
        <input
          ref={folderInputRef}
          type="file"
          // @ts-ignore webkitdirectory is non-standard
          webkitdirectory=""
          multiple
          className="hidden"
          onChange={handleFolderInput}
        />
      </div>

      {/* Progress */}
      {importing && (
        <div className="flex items-center gap-3 px-4">
          <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-200"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            {progress.current}/{progress.total}
          </span>
        </div>
      )}

      {/* Results */}
      {audioResults.length > 0 && !importing && (
        <div className="space-y-1">
          <p className="panel-header">
            Imported {audioResults.filter((r) => r.status === 'success').length} tracks
          </p>
          <div className="max-h-60 overflow-y-auto">
            {audioResults.map((r, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-1.5 text-sm">
                {r.status === 'success' ? (
                  <Check className="w-3.5 h-3.5 text-key shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                )}
                <FileAudio className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">{r.fileName}</span>
                {r.message && <span className="text-xs text-muted-foreground">{r.message}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Recursively read file system entries from drag & drop
async function readEntry(
  entry: FileSystemEntry,
  path: string,
  allFiles: File[],
  basePaths: Map<File, string>
): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve) =>
      (entry as FileSystemFileEntry).file(resolve)
    );
    const fullPath = path ? `${path}/${file.name}` : file.name;
    basePaths.set(file, fullPath);
    allFiles.push(file);
  } else if (entry.isDirectory) {
    const dirReader = (entry as FileSystemDirectoryEntry).createReader();
    const entries = await new Promise<FileSystemEntry[]>((resolve) =>
      dirReader.readEntries(resolve)
    );
    for (const child of entries) {
      await readEntry(child, path ? `${path}/${entry.name}` : entry.name, allFiles, basePaths);
    }
  }
}
