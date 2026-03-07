import initSqlJs, { Database } from 'sql.js';

let db: Database | null = null;

const DB_STORAGE_KEY = 'pioneer-export-db';

export async function getDatabase(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs({
    locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
  });

  // Try to load from localStorage
  const saved = localStorage.getItem(DB_STORAGE_KEY);
  if (saved) {
    const buf = Uint8Array.from(atob(saved), (c) => c.charCodeAt(0));
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT 'Unknown',
      artist TEXT NOT NULL DEFAULT 'Unknown',
      album TEXT DEFAULT '',
      genre TEXT DEFAULT '',
      bpm REAL DEFAULT 0,
      key TEXT DEFAULT '',
      duration REAL DEFAULT 0,
      bitrate INTEGER DEFAULT 0,
      sample_rate INTEGER DEFAULT 0,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      file_hash TEXT DEFAULT '',
      cover_art_url TEXT DEFAULT '',
      date_added TEXT DEFAULT (datetime('now')),
      year INTEGER DEFAULT 0,
      comment TEXT DEFAULT '',
      rating INTEGER DEFAULT 0,
      play_count INTEGER DEFAULT 0,
      discogs_release_id TEXT DEFAULT '',
      discogs_master_id TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      date_created TEXT DEFAULT (datetime('now')),
      date_modified TEXT DEFAULT (datetime('now')),
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS playlist_tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playlist_id INTEGER NOT NULL,
      track_id INTEGER NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      date_added TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
      FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS discogs_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      release_id TEXT UNIQUE,
      data TEXT,
      fetched_at TEXT DEFAULT (datetime('now'))
    );
  `);

  saveDatabase();
  return db;
}

export function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const b64 = btoa(String.fromCharCode(...data));
  localStorage.setItem(DB_STORAGE_KEY, b64);
}

// Track operations
export interface Track {
  id: number;
  title: string;
  artist: string;
  album: string;
  genre: string;
  bpm: number;
  key: string;
  duration: number;
  bitrate: number;
  sample_rate: number;
  file_name: string;
  file_path: string;
  file_size: number;
  file_hash: string;
  cover_art_url: string;
  date_added: string;
  year: number;
  comment: string;
  rating: number;
  play_count: number;
  discogs_release_id: string;
  discogs_master_id: string;
}

export interface Playlist {
  id: number;
  name: string;
  description: string;
  date_created: string;
  date_modified: string;
  sort_order: number;
  track_count?: number;
}

export async function getAllTracks(): Promise<Track[]> {
  const db = await getDatabase();
  const results = db.exec('SELECT * FROM tracks ORDER BY date_added DESC');
  if (!results.length) return [];
  return results[0].values.map((row) => rowToTrack(results[0].columns, row));
}

export async function addTrack(track: Partial<Track>): Promise<number> {
  const db = await getDatabase();
  db.run(
    `INSERT INTO tracks (title, artist, album, genre, bpm, key, duration, bitrate, sample_rate, file_name, file_path, file_size, file_hash, year)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      track.title || 'Unknown',
      track.artist || 'Unknown',
      track.album || '',
      track.genre || '',
      track.bpm || 0,
      track.key || '',
      track.duration || 0,
      track.bitrate || 0,
      track.sample_rate || 0,
      track.file_name || '',
      track.file_path || '',
      track.file_size || 0,
      track.file_hash || '',
      track.year || 0,
    ]
  );
  saveDatabase();
  const idResult = db.exec('SELECT last_insert_rowid()');
  return idResult[0].values[0][0] as number;
}

export async function deleteTrack(id: number): Promise<void> {
  const db = await getDatabase();
  db.run('DELETE FROM tracks WHERE id = ?', [id]);
  db.run('DELETE FROM playlist_tracks WHERE track_id = ?', [id]);
  saveDatabase();
}

export async function updateTrack(id: number, updates: Partial<Track>): Promise<void> {
  const db = await getDatabase();
  const fields = Object.keys(updates)
    .filter((k) => k !== 'id')
    .map((k) => `${k} = ?`);
  const values = Object.keys(updates)
    .filter((k) => k !== 'id')
    .map((k) => (updates as any)[k]);
  if (fields.length === 0) return;
  db.run(`UPDATE tracks SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
  saveDatabase();
}

// Playlist operations
export async function getAllPlaylists(): Promise<Playlist[]> {
  const db = await getDatabase();
  const results = db.exec(`
    SELECT p.*, COUNT(pt.id) as track_count
    FROM playlists p
    LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
    GROUP BY p.id
    ORDER BY p.sort_order, p.name
  `);
  if (!results.length) return [];
  return results[0].values.map((row) => {
    const cols = results[0].columns;
    const obj: any = {};
    cols.forEach((col, i) => (obj[col] = row[i]));
    return obj as Playlist;
  });
}

export async function createPlaylist(name: string, description = ''): Promise<number> {
  const db = await getDatabase();
  db.run('INSERT INTO playlists (name, description) VALUES (?, ?)', [name, description]);
  saveDatabase();
  const idResult = db.exec('SELECT last_insert_rowid()');
  return idResult[0].values[0][0] as number;
}

export async function deletePlaylist(id: number): Promise<void> {
  const db = await getDatabase();
  db.run('DELETE FROM playlists WHERE id = ?', [id]);
  db.run('DELETE FROM playlist_tracks WHERE playlist_id = ?', [id]);
  saveDatabase();
}

export async function addTrackToPlaylist(playlistId: number, trackId: number): Promise<void> {
  const db = await getDatabase();
  const maxPos = db.exec('SELECT COALESCE(MAX(position), 0) FROM playlist_tracks WHERE playlist_id = ?', [playlistId]);
  const nextPos = ((maxPos[0]?.values[0]?.[0] as number) || 0) + 1;
  db.run('INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES (?, ?, ?)', [playlistId, trackId, nextPos]);
  saveDatabase();
}

export async function removeTrackFromPlaylist(playlistId: number, trackId: number): Promise<void> {
  const db = await getDatabase();
  db.run('DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?', [playlistId, trackId]);
  saveDatabase();
}

export async function getPlaylistTracks(playlistId: number): Promise<Track[]> {
  const db = await getDatabase();
  const results = db.exec(
    `SELECT t.* FROM tracks t
     INNER JOIN playlist_tracks pt ON t.id = pt.track_id
     WHERE pt.playlist_id = ?
     ORDER BY pt.position`,
    [playlistId]
  );
  if (!results.length) return [];
  return results[0].values.map((row) => rowToTrack(results[0].columns, row));
}

// Export preview
export interface ExportManifest {
  basePath: string;
  folders: string[];
  files: { source: string; destination: string; trackId: number }[];
  playlistEntries: { playlistName: string; tracks: { pioneerTrackId: number; path: string }[] }[];
  totalSize: number;
  trackCount: number;
}

export async function generateExportManifest(playlistIds: number[]): Promise<ExportManifest> {
  const db = await getDatabase();
  const manifest: ExportManifest = {
    basePath: '/PIONEER/rekordbox/',
    folders: ['/PIONEER', '/PIONEER/rekordbox', '/PIONEER/USBANLZ'],
    files: [],
    playlistEntries: [],
    totalSize: 0,
    trackCount: 0,
  };

  let pioneerTrackId = 1;
  const trackIdMap = new Map<number, number>();

  for (const plId of playlistIds) {
    const tracks = await getPlaylistTracks(plId);
    const plResult = db.exec('SELECT name FROM playlists WHERE id = ?', [plId]);
    const plName = plResult[0]?.values[0]?.[0] as string || 'Unknown';

    const playlistEntry: ExportManifest['playlistEntries'][0] = {
      playlistName: plName,
      tracks: [],
    };

    for (const track of tracks) {
      if (!trackIdMap.has(track.id)) {
        trackIdMap.set(track.id, pioneerTrackId);
        const ext = track.file_name.split('.').pop() || 'mp3';
        const destPath = `/Contents/${String(pioneerTrackId).padStart(5, '0')}/track.${ext}`;
        manifest.files.push({
          source: track.file_path,
          destination: destPath,
          trackId: track.id,
        });
        manifest.folders.push(`/Contents/${String(pioneerTrackId).padStart(5, '0')}`);
        manifest.totalSize += track.file_size;
        manifest.trackCount++;
        pioneerTrackId++;
      }

      playlistEntry.tracks.push({
        pioneerTrackId: trackIdMap.get(track.id)!,
        path: manifest.files.find((f) => f.trackId === track.id)!.destination,
      });
    }

    manifest.playlistEntries.push(playlistEntry);
  }

  return manifest;
}

// Helpers
function rowToTrack(columns: string[], row: any[]): Track {
  const obj: any = {};
  columns.forEach((col, i) => (obj[col] = row[i]));
  return obj as Track;
}

// Format duration
export function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
