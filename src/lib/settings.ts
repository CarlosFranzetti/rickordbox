// Settings stored in localStorage
const SETTINGS_KEY = 'pioneer-export-settings';

export interface AppSettings {
  discogsToken: string;
  autoSaveInterval: number; // minutes
  maxBackups: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  discogsToken: '',
  autoSaveInterval: 5,
  maxBackups: 10,
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// Backup history stored in localStorage
const BACKUP_HISTORY_KEY = 'pioneer-export-backup-history';

export interface BackupEntry {
  id: string;
  timestamp: string;
  trackCount: number;
  playlistCount: number;
  data: string; // base64
}

export function getBackupHistory(): BackupEntry[] {
  try {
    const raw = localStorage.getItem(BACKUP_HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveBackupEntry(entry: BackupEntry, maxBackups: number): void {
  const history = getBackupHistory();
  history.unshift(entry);
  // Keep only maxBackups entries
  while (history.length > maxBackups) history.pop();
  localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(history));
}

export function getBackupData(id: string): Uint8Array | null {
  const history = getBackupHistory();
  const entry = history.find(e => e.id === id);
  if (!entry) return null;
  return Uint8Array.from(atob(entry.data), c => c.charCodeAt(0));
}

export function deleteBackupEntry(id: string): void {
  const history = getBackupHistory().filter(e => e.id !== id);
  localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(history));
}
