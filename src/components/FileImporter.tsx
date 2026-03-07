import { useState, useCallback, useRef } from 'react';
import { Upload, FileAudio, FolderOpen, Check, AlertCircle, ListMusic, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { Track } from '@/lib/database';
import {
  saveDatabase,
  exportDatabaseBase64,
  restoreDatabaseFromBase64,
  getTrackCount,
  getPlaylistCount,
} from '@/lib/database';
import { loadSettings, saveBackupEntry } from '@/lib/settings';
import * as mm from 'music-metadata-browser';

interface FileImporterProps {
  onImport: (track: Partial<Track>) => Promise<number>;
  onImportComplete?: () => Promise<void> | void;
  onCreatePlaylist: (name: string) => Promise<number>;
  onAddToPlaylist: (playlistId: number, trackId: number) => Promise<void>;
  onRegisterFiles?: (files: File[]) => void;
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
  isRoot: boolean;
  depth: number;
}

interface ScanBackupSnapshot {
  id: string;
  timestamp: string;
  data: string;
  trackCount: number;
  playlistCount: number;
}

const AUDIO_EXTS = ['mp3', 'wav', 'flac', 'aiff', 'aif', 'm4a', 'ogg', 'wma'];

function isAudioFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase();
  return !!ext && AUDIO_EXTS.includes(ext);
}

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '');
}

function getRelativePath(file: File, basePaths?: Map<File, string>): string {
  const path = basePaths?.get(file) || (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
  return normalizeRelativePath(path);
}

function pathDepth(path: string): number {
  return path.split('/').filter(Boolean).length;
}

function pathToPlaylistName(path: string): string {
  return path.replace(/\//g, ' / ');
}

function analyzeFolderStructure(files: File[], basePaths?: Map<File, string>): FolderPlaylist[] {
  const folderFileCounts = new Map<string, number>();

  for (const file of files) {
    if (!isAudioFile(file.name)) continue;

    const relativePath = getRelativePath(file, basePaths);
    const parts = relativePath.split('/').filter(Boolean);
    if (parts.length < 2) continue;

    // Count files for every folder level from root down to the file's parent
    for (let depth = 1; depth < parts.length; depth++) {
      const folderPath = parts.slice(0, depth).join('/');
      folderFileCounts.set(folderPath, (folderFileCounts.get(folderPath) || 0) + 1);
    }
  }

  const allFolders: FolderPlaylist[] = Array.from(folderFileCounts.entries())
    .map(([path, fileCount]) => ({
      path,
      name: path,
      fileCount,
      isRoot: pathDepth(path) === 1,
      depth: pathDepth(path),
    }))
    .sort((a, b) => {
      if (a.depth !== b.depth) return a.depth - b.depth;
      return a.name.localeCompare(b.name);
    });

  return allFolders;
}

function createPreScanBackup(): ScanBackupSnapshot | null {
  try {
    const b64 = exportDatabaseBase64();
    const timestamp = new Date().toISOString();
    const entry: ScanBackupSnapshot = {
      id: `scan-${Date.now()}`,
      timestamp,
      trackCount: getTrackCount(),
      playlistCount: getPlaylistCount(),
      data: b64,
    };

    const settings = loadSettings();
    saveBackupEntry(entry, settings.maxBackups);

    return entry;
  } catch (error) {
    console.warn('Pre-scan backup failed, continuing import without rollback snapshot', error);
    return null;
  }
}

function pushTrackToBucket(bucket: Map<string, number[]>, path: string, trackId: number): void {
  if (!bucket.has(path)) bucket.set(path, []);
  bucket.get(path)!.push(trackId);
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
  let label = '';
  let coverArtUrl = '';

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
    if (common.label?.length) label = common.label.join(', ');
    if (common.comment?.length) comment = common.comment.map((c: any) => (typeof c === 'string' ? c : c.text || '')).join('; ');
    if (format.duration) duration = format.duration;
    if (format.bitrate) bitrate = Math.round(format.bitrate / 1000);
    if (format.sampleRate) sampleRate = format.sampleRate;

    // Extract embedded cover art
    if (common.picture?.length) {
      const pic = common.picture[0];
      const chunkSize = 8192;
      const parts: string[] = [];
      for (let i = 0; i < pic.data.length; i += chunkSize) {
        const chunk = pic.data.subarray(i, Math.min(i + chunkSize, pic.data.length));
        let bin = '';
        for (let j = 0; j < chunk.length; j++) bin += String.fromCharCode(chunk[j]);
        parts.push(bin);
      }
      coverArtUrl = `data:${pic.format};base64,${btoa(parts.join(''))}`;
    }
  } catch (err) {
    console.warn('Metadata parse failed for', file.name, err);
    const dashSplit = title.split(' - ');
    if (dashSplit.length >= 2) {
      artist = dashSplit[0].trim();
      title = dashSplit.slice(1).join(' - ').trim();
    }
  }

  return {
    title,
    artist,
    album,
    genre,
    bpm,
    key,
    duration,
    bitrate,
    sample_rate: sampleRate,
    year,
    comment,
    label,
    cover_art_url: coverArtUrl,
    file_name: file.name,
    file_size: file.size,
  };
}

export function FileImporter({ onImport, onImportComplete, onCreatePlaylist, onAddToPlaylist, onRegisterFiles }: FileImporterProps) {
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0, phase: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [pendingBasePaths, setPendingBasePaths] = useState<Map<File, string> | null>(null);
  const [folderPlaylists, setFolderPlaylists] = useState<FolderPlaylist[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [showFolderStep, setShowFolderStep] = useState(false);

  const runImport = useCallback(
    async (files: File[], basePaths?: Map<File, string>, activeSelectedFolders: Set<string> = new Set()) => {
      const audioFiles = files.filter((file) => isAudioFile(file.name));
      setImporting(true);
      setShowFolderStep(false);
      setProgress({ current: 0, total: audioFiles.length, phase: 'Reading metadata & importing…' });

      const newResults: ImportResult[] = [];
      const folderTracks = new Map<string, number[]>();
      const backupSnapshot = createPreScanBackup();

      try {
        let idx = 0;
        for (const file of audioFiles) {
          idx += 1;
          setProgress({ current: idx, total: audioFiles.length, phase: file.name });

          try {
            const trackData = await parseMetadata(file);
            const filePath = getRelativePath(file, basePaths);
            trackData.file_path = filePath;

            const trackId = await onImport(trackData);
            newResults.push({ fileName: file.name, status: 'success', trackId: trackId ?? undefined });

            if (trackId && activeSelectedFolders.size > 0) {
              const parts = filePath.split('/').filter(Boolean);
              if (parts.length >= 2) {
                // Add track to every ancestor folder that's selected
                for (let depth = 1; depth < parts.length; depth++) {
                  const folderPath = parts.slice(0, depth).join('/');
                  if (activeSelectedFolders.has(folderPath)) {
                    pushTrackToBucket(folderTracks, folderPath, trackId);
                  }
                }
              }
            }
          } catch (error) {
            console.error('Import failed for', file.name, error);
            newResults.push({ fileName: file.name, status: 'error', message: 'Import failed' });
          }

          if (idx % 12 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }

        if (activeSelectedFolders.size > 0 && folderTracks.size > 0) {
          const orderedPlaylistPaths = Array.from(folderTracks.keys()).sort((a, b) => {
            const depthDiff = pathDepth(a) - pathDepth(b);
            if (depthDiff !== 0) return depthDiff;
            return a.localeCompare(b);
          });

          setProgress({ current: 0, total: orderedPlaylistPaths.length, phase: 'Creating playlists…' });
          let playlistIdx = 0;

          for (const playlistPath of orderedPlaylistPaths) {
            playlistIdx += 1;
            setProgress({
              current: playlistIdx,
              total: orderedPlaylistPaths.length,
              phase: `Playlist: ${pathToPlaylistName(playlistPath)}`,
            });

            try {
              const playlistId = await onCreatePlaylist(pathToPlaylistName(playlistPath));
              const trackIds = folderTracks.get(playlistPath) || [];
              for (const trackId of trackIds) {
                await onAddToPlaylist(playlistId, trackId);
              }
            } catch (error) {
              console.error('Playlist creation failed for', playlistPath, error);
            }
          }
        }

        saveDatabase();
        await onImportComplete?.();
        setResults(newResults);
      } catch (error) {
        console.error('Import session aborted:', error);

        if (backupSnapshot?.data) {
          try {
            await restoreDatabaseFromBase64(backupSnapshot.data);
            await onImportComplete?.();
            newResults.push({
              fileName: 'Import session',
              status: 'error',
              message: 'Import aborted. Collection restored from pre-scan backup.',
            });
          } catch (restoreError) {
            console.error('Failed to restore from pre-scan backup:', restoreError);
            newResults.push({
              fileName: 'Import session',
              status: 'error',
              message: 'Import aborted and backup restore failed. Use Backups to recover.',
            });
          }
        } else {
          newResults.push({
            fileName: 'Import session',
            status: 'error',
            message: 'Import aborted. No pre-scan backup was available.',
          });
        }

        setResults(newResults);
      } finally {
        setImporting(false);
        setPendingFiles(null);
        setPendingBasePaths(null);
      }
    },
    [onAddToPlaylist, onCreatePlaylist, onImport, onImportComplete]
  );

  const handleFilesReceived = useCallback(
    (files: File[], basePaths?: Map<File, string>) => {
      const folders = analyzeFolderStructure(files, basePaths);

      if (folders.length > 0) {
        setPendingFiles(files);
        setPendingBasePaths(basePaths || null);
        setFolderPlaylists(folders);
        setSelectedFolders(new Set(folders.map((folder) => folder.path)));
        setShowFolderStep(true);
      } else {
        runImport(files, basePaths);
      }
    },
    [runImport]
  );

  const handleImportWithPlaylists = useCallback(
    async (selectedOverride?: Set<string>) => {
      if (!pendingFiles) return;
      const basePaths = pendingBasePaths || undefined;
      const activeSelectedFolders = selectedOverride ?? selectedFolders;
      await runImport(pendingFiles, basePaths, activeSelectedFolders);
    },
    [pendingFiles, pendingBasePaths, selectedFolders, runImport]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      const items = e.dataTransfer.items;
      if (!items || items.length === 0) return;

      const entries: FileSystemEntry[] = [];
      for (let i = 0; i < items.length; i += 1) {
        const entry = items[i].webkitGetAsEntry?.();
        if (entry) entries.push(entry);
      }

      if (entries.length > 0) {
        const { allFiles, basePaths } = await collectDroppedEntries(entries);
        if (allFiles.length > 0) {
          handleFilesReceived(allFiles, basePaths);
          return;
        }
      }

      const fallbackFiles = Array.from(e.dataTransfer.files);
      if (fallbackFiles.length > 0) {
        handleFilesReceived(fallbackFiles);
      }
    },
    [handleFilesReceived]
  );

  const handleFolderInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const files = Array.from(e.target.files);
        const basePaths = new Map<File, string>();

        files.forEach((file) => {
          const relPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
          basePaths.set(file, normalizeRelativePath(relPath));
        });

        handleFilesReceived(files, basePaths);
      }
    },
    [handleFilesReceived]
  );

  const toggleFolder = (path: string) => {
    const folder = folderPlaylists.find((entry) => entry.path === path);
    if (folder?.isRoot) return;

    setSelectedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const audioResults = results.filter((result) => result.status === 'success' || result.status === 'error');

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Import Audio Files</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Scan files or folders to add to your collection. Metadata is read from tags and a pre-scan backup is created automatically.
        </p>
      </div>

      {showFolderStep && !importing && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-primary" />
            <p className="text-sm font-semibold text-foreground">Create playlists from folder hierarchy</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Root folders are required and created first. Subfolders become additional playlists.
          </p>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {folderPlaylists.map((folder) => (
              <label
                key={folder.path}
                className="flex items-center gap-3 px-3 py-1.5 rounded hover:bg-secondary/40 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selectedFolders.has(folder.path)}
                  disabled={folder.isRoot}
                  onCheckedChange={() => toggleFolder(folder.path)}
                />
                <span className="text-sm flex-1 truncate">{pathToPlaylistName(folder.name)}</span>
                {folder.isRoot && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                    ROOT
                  </span>
                )}
                <span className="text-[10px] font-mono text-muted-foreground">{folder.fileCount} files</span>
              </label>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={() => handleImportWithPlaylists()}>
              Import {pendingFiles?.filter((file) => isAudioFile(file.name)).length} tracks
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const requiredRoots = new Set(folderPlaylists.filter((folder) => folder.isRoot).map((folder) => folder.path));
                setSelectedFolders(requiredRoots);
                handleImportWithPlaylists(requiredRoots);
              }}
            >
              Root playlists only
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowFolderStep(false);
                setPendingFiles(null);
                setPendingBasePaths(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

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
              Supports MP3, WAV, FLAC, AIFF, M4A • Metadata auto-read • Root + subfolder playlists
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

      {importing && (
        <div className="space-y-2 px-4">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm text-foreground">
              {progress.current}/{progress.total}
            </span>
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

      {audioResults.length > 0 && !importing && (
        <div className="space-y-1">
          <p className="panel-header">Imported {audioResults.filter((result) => result.status === 'success').length} tracks</p>
          <div className="max-h-60 overflow-y-auto">
            {audioResults.map((result, idx) => (
              <div key={idx} className="flex items-center gap-2 px-4 py-1.5 text-sm">
                {result.status === 'success' ? (
                  <Check className="w-3.5 h-3.5 shrink-0 text-primary" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                )}
                <FileAudio className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">{result.fileName}</span>
                {result.message && <span className="text-xs text-muted-foreground">{result.message}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

async function readDirectoryEntries(dirReader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  const allEntries: FileSystemEntry[] = [];

  while (true) {
    const batch = await new Promise<FileSystemEntry[]>((resolve) => dirReader.readEntries(resolve));
    if (batch.length === 0) break;
    allEntries.push(...batch);
  }

  return allEntries;
}

async function collectDroppedEntries(entries: FileSystemEntry[]): Promise<{ allFiles: File[]; basePaths: Map<File, string> }> {
  const allFiles: File[] = [];
  const basePaths = new Map<File, string>();
  const queue: Array<{ entry: FileSystemEntry; parentPath: string }> = entries.map((entry) => ({
    entry,
    parentPath: '',
  }));

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    const { entry, parentPath } = current;

    if (entry.isFile) {
      const file = await new Promise<File>((resolve) => (entry as FileSystemFileEntry).file(resolve));
      const fullPath = normalizeRelativePath(parentPath ? `${parentPath}/${file.name}` : file.name);
      basePaths.set(file, fullPath);
      allFiles.push(file);
      continue;
    }

    if (entry.isDirectory) {
      const directoryPath = normalizeRelativePath(parentPath ? `${parentPath}/${entry.name}` : entry.name);
      const children = await readDirectoryEntries((entry as FileSystemDirectoryEntry).createReader());

      for (const child of children) {
        queue.push({ entry: child, parentPath: directoryPath });
      }
    }
  }

  return { allFiles, basePaths };
}
