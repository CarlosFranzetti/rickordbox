import { useState, useEffect, useRef } from 'react';
import { Settings, Trash2, Key, Clock, Archive, X, Search, Loader2, RefreshCw } from 'lucide-react';
import * as mm from 'music-metadata-browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { loadSettings, saveSettings, type AppSettings, getBackupHistory, deleteBackupEntry, type BackupEntry } from '@/lib/settings';
import { scrapeDiscogsForTracks } from '@/lib/discogs';
import type { Track } from '@/lib/database';

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClearAll: () => void;
  onRestoreBackup: (id: string) => void;
  tracks: Track[];
  onRefresh: () => void;
  onUpdateTrack?: (id: number, updates: Partial<Track>) => void;
}

export function SettingsPanel({ open, onOpenChange, onClearAll, onRestoreBackup, tracks, onRefresh, onUpdateTrack }: SettingsPanelProps) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'general' | 'discogs' | 'backups'>('general');

  // Discogs scraping state
  const [scraping, setScraping] = useState(false);
  const [scrapeProgress, setScrapeProgress] = useState({ current: 0, total: 0, trackName: '' });
  const [scrapeResult, setScrapeResult] = useState<{ matched: number; failed: number } | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Re-scan metadata state
  const [rescanning, setRescanning] = useState(false);
  const [rescanProgress, setRescanProgress] = useState({ current: 0, total: 0, fileName: '' });
  const [rescanResult, setRescanResult] = useState<{ updated: number; skipped: number; failed: number } | null>(null);
  const rescanInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSettings(loadSettings());
      setBackups(getBackupHistory());
    }
  }, [open]);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveSettings(next);
  };

  const handleClearAll = () => {
    onClearAll();
    setShowClearConfirm(false);
    onOpenChange(false);
  };

  const AUDIO_EXTS = ['mp3', 'wav', 'flac', 'aiff', 'aif', 'm4a', 'ogg', 'wma'];
  const isAudioFile = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    return !!ext && AUDIO_EXTS.includes(ext);
  };

  const handleRescanFolder = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !onUpdateTrack) return;
    const files = Array.from(e.target.files).filter(f => isAudioFile(f.name));
    setRescanning(true);
    setRescanResult(null);

    // Build a lookup from relative path to file
    const pathToFile = new Map<string, File>();
    for (const file of files) {
      const relPath = ((file as any).webkitRelativePath || file.name).replace(/\\/g, '/').replace(/^\/+/, '');
      pathToFile.set(relPath, file);
    }

    let updated = 0, skipped = 0, failed = 0;
    const total = tracks.length;

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      setRescanProgress({ current: i + 1, total, fileName: track.file_name });

      const file = pathToFile.get(track.file_path);
      if (!file) { skipped++; continue; }

      try {
        const metadata = await mm.parseBlob(file);
        const { common, format } = metadata;
        const updates: Partial<Track> = {};

        if (common.title && common.title !== track.title) updates.title = common.title;
        if (common.artist && common.artist !== track.artist) updates.artist = common.artist;
        if (common.album && common.album !== track.album) updates.album = common.album;
        if (common.genre?.length) { const g = common.genre.join(', '); if (g !== track.genre) updates.genre = g; }
        if (common.bpm && common.bpm !== track.bpm) updates.bpm = common.bpm;
        if (common.key && common.key !== track.key) updates.key = common.key;
        if (common.year && common.year !== track.year) updates.year = common.year;
        if (common.label?.length) { const l = common.label.join(', '); if (l !== track.label) updates.label = l; }
        if (common.comment?.length) {
          const c = common.comment.map((x: any) => typeof x === 'string' ? x : x.text || '').join('; ');
          if (c !== track.comment) updates.comment = c;
        }
        if (format.duration && format.duration !== track.duration) updates.duration = format.duration;
        if (format.bitrate) { const br = Math.round(format.bitrate / 1000); if (br !== track.bitrate) updates.bitrate = br; }
        if (format.sampleRate && format.sampleRate !== track.sample_rate) updates.sample_rate = format.sampleRate;

        // Extract embedded cover art
        if (common.picture?.length && !track.cover_art_url) {
          const pic = common.picture[0];
          const chunkSize = 8192;
          const parts: string[] = [];
          for (let i = 0; i < pic.data.length; i += chunkSize) {
            const chunk = pic.data.subarray(i, Math.min(i + chunkSize, pic.data.length));
            let bin = '';
            for (let j = 0; j < chunk.length; j++) bin += String.fromCharCode(chunk[j]);
            parts.push(bin);
          }
          updates.cover_art_url = `data:${pic.format};base64,${btoa(parts.join(''))}`;
        }

        if (Object.keys(updates).length > 0) {
          await onUpdateTrack(track.id, updates);
          updated++;
        } else {
          skipped++;
        }
      } catch {
        failed++;
      }

      if (i % 10 === 0) await new Promise(r => setTimeout(r, 0));
    }

    setRescanResult({ updated, skipped, failed });
    setRescanning(false);
    onRefresh();
    e.target.value = '';
  };

  const handleStartScrape = async () => {
    if (!settings.discogsToken) return;
    setScraping(true);
    setScrapeResult(null);
    const controller = new AbortController();
    setAbortController(controller);

    const result = await scrapeDiscogsForTracks(
      tracks,
      (current, total, trackName) => setScrapeProgress({ current, total, trackName }),
      () => {},
      controller.signal,
    );

    setScrapeResult(result);
    setScraping(false);
    setAbortController(null);
    onRefresh();
  };

  const handleStopScrape = () => {
    abortController?.abort();
  };

  const tabs = [
    { id: 'general' as const, label: 'General' },
    { id: 'discogs' as const, label: 'Discogs' },
    { id: 'backups' as const, label: 'Backups' },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[520px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Settings
            </DialogTitle>
            <DialogDescription>Configure your RIckordBox workspace</DialogDescription>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-border pb-0">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-[1px] ${
                  activeTab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    Auto-save interval
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={settings.autoSaveInterval}
                      onChange={(e) => updateSetting('autoSaveInterval', parseInt(e.target.value) || 5)}
                      className="w-20 h-8 text-sm"
                    />
                    <span className="text-sm text-muted-foreground">minutes</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Database is auto-saved to backup history at this interval</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Archive className="w-4 h-4 text-muted-foreground" />
                    Max backups to keep
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={settings.maxBackups}
                    onChange={(e) => updateSetting('maxBackups', parseInt(e.target.value) || 10)}
                    className="w-20 h-8 text-sm"
                  />
                </div>

                <div className="border-t border-border pt-4 space-y-3">
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-muted-foreground" />
                    Re-scan Metadata
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Re-select your music folder to re-read tags from files and update all matching tracks in the database.
                  </p>
                  <input
                    ref={rescanInputRef}
                    type="file"
                    className="hidden"
                    {...({ webkitdirectory: '', directory: '', multiple: true } as any)}
                    onChange={handleRescanFolder}
                  />
                  {!rescanning && (
                    <Button size="sm" onClick={() => rescanInputRef.current?.click()} disabled={tracks.length === 0}>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      Re-scan folder ({tracks.length} tracks)
                    </Button>
                  )}
                  {rescanning && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-sm text-foreground">{rescanProgress.current}/{rescanProgress.total}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{rescanProgress.fileName}</p>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-200" style={{ width: `${(rescanProgress.current / rescanProgress.total) * 100}%` }} />
                      </div>
                    </div>
                  )}
                  {rescanResult && (
                    <p className="text-xs text-muted-foreground">
                      Done: <span className="text-primary">{rescanResult.updated} updated</span>,{' '}
                      {rescanResult.skipped} unchanged,{' '}
                      <span className="text-destructive">{rescanResult.failed} failed</span>
                    </p>
                  )}
                </div>

                <div className="border-t border-border pt-4">
                  <Button variant="destructive" size="sm" onClick={() => setShowClearConfirm(true)}>
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Clear All Data
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">Delete all tracks, playlists, and cached data</p>
                </div>
              </div>
            )}

            {/* Discogs Tab */}
            {activeTab === 'discogs' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Key className="w-4 h-4 text-muted-foreground" />
                    Discogs Personal Access Token
                  </label>
                  <Input
                    type="password"
                    placeholder="Paste your Discogs token here…"
                    value={settings.discogsToken}
                    onChange={(e) => updateSetting('discogsToken', e.target.value)}
                    className="h-8 text-sm font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Get yours at{' '}
                    <a href="https://www.discogs.com/settings/developers" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      discogs.com/settings/developers
                    </a>
                    {' '}→ Generate new token
                  </p>
                </div>

                <div className="border-t border-border pt-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">Bulk Metadata Lookup</p>
                  <p className="text-xs text-muted-foreground">
                    Search Discogs for all unmatched tracks to auto-fill genre, year, and cover art. 
                    Rate-limited to ~1 request/second.
                  </p>

                  {!scraping && (
                    <Button
                      size="sm"
                      disabled={!settings.discogsToken || tracks.length === 0}
                      onClick={handleStartScrape}
                    >
                      <Search className="w-3.5 h-3.5 mr-1.5" />
                      Scrape Discogs ({tracks.filter(t => !t.discogs_release_id).length} unmatched)
                    </Button>
                  )}

                  {scraping && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-sm text-foreground">
                          {scrapeProgress.current}/{scrapeProgress.total}
                        </span>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleStopScrape}>
                          <X className="w-3 h-3 mr-1" />
                          Stop
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{scrapeProgress.trackName}</p>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-200"
                          style={{ width: `${(scrapeProgress.current / scrapeProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {scrapeResult && (
                    <p className="text-xs text-muted-foreground">
                      Done: <span className="text-primary">{scrapeResult.matched} matched</span>,{' '}
                      <span className="text-destructive">{scrapeResult.failed} not found</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Backups Tab */}
            {activeTab === 'backups' && (
              <div className="space-y-2">
                {backups.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">No auto-backups yet. They are created every {settings.autoSaveInterval} minutes.</p>
                )}
                {backups.map(b => (
                  <div key={b.id} className="flex items-center gap-3 px-3 py-2 rounded-md bg-card border border-border">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground font-mono">{new Date(b.timestamp).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{b.trackCount} tracks · {b.playlistCount} playlists</p>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onRestoreBackup(b.id)}>
                      Restore
                    </Button>
                    <button
                      onClick={() => {
                        deleteBackupEntry(b.id);
                        setBackups(getBackupHistory());
                      }}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear all confirmation */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Clear All Data
            </DialogTitle>
            <DialogDescription>
              This will permanently delete all tracks, playlists, and cached data. This cannot be undone. Consider creating a backup first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleClearAll}>Yes, Clear Everything</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
