import { useState, useCallback, useRef } from 'react';
import { Upload, FileAudio, FolderOpen, Check, AlertCircle, ListMusic, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { Track } from '@/lib/database';
import { saveDatabase } from '@/lib/database';
import * as mm from 'music-metadata-browser';

interface FileImporterProps {
  onImport: (track: Partial<Track>) => Promise<number>;
  onImportComplete?: () => Promise<void> | void;
  onCreatePlaylist: (name: string) => Promise<number>;
  onAddToPlaylist: (playlistId: number, trackId: number) => Promise<void>;
}

interface ImportResult {
  fileName: string;
  status: 'success' | 'error';
  message?: string;
  trackId?: number;
}

interface FolderPlaylist {
  path: string;
  name: string;
  fileCount: number;
}

const AUDIO_EXTS = ['mp3', 'wav', 'flac', 'aiff', 'aif', 'm4a', 'ogg', 'wma'];

function isAudioFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase();
  return !!ext && AUDIO_EXTS.includes(ext);
}

function analyzeFolderStructure(files: File[], basePaths?: Map<File, string>): FolderPlaylist[] {
  const folderMap = new Map<string, number>();

  for (const file of files) {
    if (!isAudioFile(file.name)) continue;
    const path = basePaths?.get(file) || (file as any).webkitRelativePath || '';
    const parts = path.split('/');
    if (parts.length < 2) continue;

    const folder = parts.slice(0, -1).join('/');
    folderMap.set(folder, (folderMap.get(folder) || 0) + 1);
  }

  return Array.from(folderMap.entries())
    .map(([path, count]) => ({
      path,
      name: path.split('/').pop() || path,
      fileCount: count,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

async function parseMetadata(file: File): Promise<Partial<Track>> {
  let title = file.name.replace(/\.[^/.]+$/, '');
  let artist = 'Unknown';
  let album = '';
  let genre = '';
  let bpm = 0;
  let key = '';
  let duration = 0;
  let year = 0;
  let bitrate = 0;
  let sampleRate = 0;
  let comment = '';

  try {
    const metadata = await mm.parseBlob(file);
    const { common, format } = metadata;

    if (common.title) title = common.title;
    if (common.artist) artist = common.artist;
    if (common.album) album = common.album;
    if (common.genre?.length) genre = common.genre.join(', ');
    if (common.bpm) bpm = common.bpm;
    if (common.key) key = common.key;
    if (common.year) year = common.year;
    if (common.comment?.length) comment = common.comment.map((c: any) => typeof c === 'string' ? c : c.text || '').join('; ');
    if (format.duration) duration = format.duration;
    if (format.bitrate) bitrate = Math.round(format.bitrate / 1000);
    if (format.sampleRate) sampleRate = format.sampleRate;
  } catch (err) {
    console.warn('Metadata parse failed for', file.name, err);
    // Fallback to filename parsing
    const dashSplit = title.split(' - ');
    if (dashSplit.length >= 2) {
      artist = dashSplit[0].trim();
      title = dashSplit.slice(1).join(' - ').trim();
    }
  }

  return { title, artist, album, genre, bpm, key, duration, bitrate, sample_rate: sampleRate, year, comment, file_name: file.name, file_size: file.size };
}

export function FileImporter({ onImport, onImportComplete, onCreatePlaylist, onAddToPlaylist }: FileImporterProps) {
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0, phase: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Folder playlist creation
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [pendingBasePaths, setPendingBasePaths] = useState<Map<File, string> | null>(null);
  const [folderPlaylists, setFolderPlaylists] = useState<FolderPlaylist[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [showFolderStep, setShowFolderStep] = useState(false);

  const processFiles = useCallback(
    async (files: File[], basePaths?: Map<File, string>) => {
      setImporting(true);
      setShowFolderStep(false);
      const audioFiles = files.filter(f => isAudioFile(f.name));
      setProgress({ current: 0, total: audioFiles.length, phase: 'Reading metadata & importing…' });
      const newResults: ImportResult[] = [];

      let idx = 0;
      for (const file of audioFiles) {
        idx++;
        setProgress({ current: idx, total: audioFiles.length, phase: file.name });

        try {
          const trackData = await parseMetadata(file);
          const filePath = basePaths?.get(file) || (file as any).webkitRelativePath || file.name;
          trackData.file_path = filePath;

          await onImport(trackData);
          newResults.push({ fileName: file.name, status: 'success' });
        } catch (err) {
          console.error('Import failed for', file.name, err);
          newResults.push({ fileName: file.name, status: 'error', message: 'Import failed' });
        }

        if (idx % 10 === 0) await new Promise(r => setTimeout(r, 0));
      }

      // Save database once after all imports
      saveDatabase();
      await onImportComplete?.();
      setResults(newResults);
      setImporting(false);
      setPendingFiles(null);
      setPendingBasePaths(null);
    },
    [onImport, onImportComplete]
  );

  const handleFilesReceived = useCallback(
    (files: File[], basePaths?: Map<File, string>) => {
      const folders = analyzeFolderStructure(files, basePaths);

      if (folders.length > 0) {
        setPendingFiles(files);
        setPendingBasePaths(basePaths || null);
        setFolderPlaylists(folders);
        setSelectedFolders(new Set(folders.map(f => f.path)));
        setShowFolderStep(true);
      } else {
        processFiles(files, basePaths);
      }
    },
    [processFiles]
  );

  const handleImportWithPlaylists = useCallback(async (selectedOverride?: Set<string>) => {
    if (!pendingFiles) return;
    const basePaths = pendingBasePaths || undefined;
    const activeSelectedFolders = selectedOverride ?? selectedFolders;

    setImporting(true);
    setShowFolderStep(false);
    const audioFiles = pendingFiles.filter(f => isAudioFile(f.name));
    setProgress({ current: 0, total: audioFiles.length, phase: 'Reading metadata & importing…' });
    const newResults: ImportResult[] = [];

    // Collect imported tracks grouped by folder
    const folderTracks = new Map<string, number[]>();

    let idx = 0;
    for (const file of audioFiles) {
      idx++;
      setProgress({ current: idx, total: audioFiles.length, phase: file.name });

      try {
        const trackData = await parseMetadata(file);
        const filePath = basePaths?.get(file) || (file as any).webkitRelativePath || file.name;
        trackData.file_path = filePath;

        const trackId = await onImport(trackData);
        newResults.push({ fileName: file.name, status: 'success', trackId: trackId ?? undefined });

        // Group by folder for playlist creation
        if (trackId) {
          const parts = filePath.split('/');
          if (parts.length >= 2) {
            const folder = parts.slice(0, -1).join('/');
            if (activeSelectedFolders.has(folder)) {
              if (!folderTracks.has(folder)) folderTracks.set(folder, []);
              folderTracks.get(folder)!.push(trackId);
            }
          }
        }
      } catch (err) {
        console.error('Import failed for', file.name, err);
        newResults.push({ fileName: file.name, status: 'error', message: 'Import failed' });
      }

      if (idx % 10 === 0) await new Promise(r => setTimeout(r, 0));
    }

    // Save database after all track imports
    saveDatabase();

    // Create playlists from selected folders and add tracks
    if (activeSelectedFolders.size > 0 && folderTracks.size > 0) {
      setProgress({ current: 0, total: folderTracks.size, phase: 'Creating playlists…' });
      let plIdx = 0;
      for (const [folder, trackIds] of folderTracks) {
        plIdx++;
        const folderName = folder.split('/').pop() || folder;
        setProgress({ current: plIdx, total: folderTracks.size, phase: `Playlist: ${folderName}` });
        try {
          const playlistId = await onCreatePlaylist(folderName);
          for (const tid of trackIds) {
            await onAddToPlaylist(playlistId, tid);
          }
        } catch (err) {
          console.error('Playlist creation failed for', folder, err);
        }
      }
      // Save after all playlists created
      saveDatabase();
    }

    setResults(newResults);
    setImporting(false);
    setPendingFiles(null);
    setPendingBasePaths(null);
  }, [pendingFiles, pendingBasePaths, selectedFolders, onImport, onCreatePlaylist, onAddToPlaylist]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      const items = e.dataTransfer.items;
      if (items && items.length > 0) {
        const allFiles: File[] = [];
        const basePaths = new Map<File, string>();

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
          for (const file of Array.from(e.dataTransfer.files)) {
            allFiles.push(file);
          }
        }

        if (allFiles.length > 0) {
          handleFilesReceived(allFiles, basePaths);
        }
      }
    },
    [handleFilesReceived]
  );

  const handleFolderInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const files = Array.from(e.target.files);
        const basePaths = new Map<File, string>();
        files.forEach(f => {
          const relPath = (f as any).webkitRelativePath || f.name;
          basePaths.set(f, relPath);
        });
        handleFilesReceived(files, basePaths);
      }
    },
    [handleFilesReceived]
  );

  const toggleFolder = (path: string) => {
    setSelectedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const audioResults = results.filter((r) => r.status === 'success' || r.status === 'error');

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Import Audio Files</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Scan files or folders to add to your collection. Metadata is read from ID3 tags. Folders become playlists automatically.
        </p>
      </div>

      {/* Folder Playlist Step */}
      {showFolderStep && !importing && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-primary" />
            <p className="text-sm font-semibold text-foreground">Create playlists from folders?</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Found {folderPlaylists.length} folders. Select which ones to turn into playlists:
          </p>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {folderPlaylists.map(fp => (
              <label key={fp.path} className="flex items-center gap-3 px-3 py-1.5 rounded hover:bg-secondary/40 cursor-pointer transition-colors">
                <Checkbox
                  checked={selectedFolders.has(fp.path)}
                  onCheckedChange={() => toggleFolder(fp.path)}
                />
                <span className="text-sm flex-1 truncate">{fp.name}</span>
                <span className="text-[10px] font-mono text-muted-foreground">{fp.fileCount} files</span>
              </label>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleImportWithPlaylists}>
              Import {pendingFiles?.filter(f => isAudioFile(f.name)).length} tracks
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              setSelectedFolders(new Set());
              handleImportWithPlaylists();
            }}>
              Import without playlists
            </Button>
            <Button variant="ghost" size="sm" onClick={() => {
              setShowFolderStep(false);
              setPendingFiles(null);
            }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Drop Zone */}
      {!showFolderStep && (
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
              Supports MP3, WAV, FLAC, AIFF, M4A • ID3 tags auto-read • Folders → Playlists
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
            onChange={(e) => {
              if (e.target.files) {
                const files = Array.from(e.target.files);
                handleFilesReceived(files);
              }
            }}
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
      )}

      {/* Progress */}
      {importing && (
        <div className="space-y-2 px-4">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm text-foreground">{progress.current}/{progress.total}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate">{progress.phase}</p>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-200"
              style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
            />
          </div>
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
                  <Check className="w-3.5 h-3.5 shrink-0 text-primary" />
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