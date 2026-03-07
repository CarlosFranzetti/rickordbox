import { useState, useCallback, useRef } from 'react';
import { Upload, FileAudio, Check, AlertCircle } from 'lucide-react';
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

export function FileImporter({ onImport }: FileImporterProps) {
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    async (files: FileList) => {
      setImporting(true);
      const newResults: ImportResult[] = [];

      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        const audioExts = ['mp3', 'wav', 'flac', 'aiff', 'aif', 'm4a', 'ogg', 'wma'];

        if (!ext || !audioExts.includes(ext)) {
          newResults.push({ fileName: file.name, status: 'error', message: 'Not an audio file' });
          continue;
        }

        try {
          // Extract basic info from filename
          let title = file.name.replace(/\.[^/.]+$/, '');
          let artist = 'Unknown';

          // Try "Artist - Title" format
          const dashSplit = title.split(' - ');
          if (dashSplit.length >= 2) {
            artist = dashSplit[0].trim();
            title = dashSplit.slice(1).join(' - ').trim();
          }

          // Try to get duration via Web Audio API
          let duration = 0;
          try {
            const arrayBuffer = await file.arrayBuffer();
            const audioContext = new AudioContext();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            duration = audioBuffer.duration;
            audioContext.close();
          } catch {
            // Duration extraction failed, that's ok
          }

          await onImport({
            title,
            artist,
            file_name: file.name,
            file_path: file.name, // In browser, we store the name as path reference
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
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  return (
    <div className="flex-1 flex flex-col p-6 gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Import Audio Files</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Drop audio files to scan and add to your collection. Supports MP3, WAV, FLAC, AIFF, M4A.
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
        <div>
          <p className="text-sm text-foreground">Drag & drop audio files here</p>
          <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={importing}
        >
          Browse Files
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".mp3,.wav,.flac,.aiff,.aif,.m4a,.ogg,.wma"
          className="hidden"
          onChange={(e) => e.target.files && processFiles(e.target.files)}
        />
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-1">
          <p className="panel-header">Import Results</p>
          {results.map((r, i) => (
            <div key={i} className="flex items-center gap-2 px-4 py-1.5 text-sm">
              {r.status === 'success' ? (
                <Check className="w-3.5 h-3.5 text-key" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-destructive" />
              )}
              <FileAudio className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="truncate flex-1">{r.fileName}</span>
              {r.message && <span className="text-xs text-muted-foreground">{r.message}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
