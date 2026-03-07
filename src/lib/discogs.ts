import type { Track } from './database';
import { updateTrack } from './database';
import { loadSettings } from './settings';

const DISCOGS_API = 'https://api.discogs.com';

interface DiscogsSearchResult {
  id: number;
  title: string;
  year?: string;
  genre?: string[];
  style?: string[];
  cover_image?: string;
  thumb?: string;
  master_id?: number;
  country?: string;
  label?: string[];
  format?: string[];
}

interface DiscogsRelease {
  id: number;
  title: string;
  year?: number;
  genres?: string[];
  styles?: string[];
  images?: { type: string; uri: string; uri150: string }[];
  tracklist?: { position: string; title: string; duration: string; extraartists?: any[] }[];
  artists?: { name: string }[];
  labels?: { name: string; catno: string }[];
}

export async function searchDiscogs(artist: string, title: string): Promise<DiscogsSearchResult[]> {
  const settings = loadSettings();
  if (!settings.discogsToken) throw new Error('No Discogs token configured');

  const query = `${artist} ${title}`.trim();
  const url = `${DISCOGS_API}/database/search?q=${encodeURIComponent(query)}&type=release&per_page=5`;

  const res = await fetch(url, {
    headers: {
      'Authorization': `Discogs token=${settings.discogsToken}`,
      'User-Agent': 'PioneerExportTool/1.0',
    },
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('Invalid Discogs token');
    throw new Error(`Discogs API error: ${res.status}`);
  }

  const data = await res.json();
  return data.results || [];
}

export async function getDiscogsRelease(releaseId: number): Promise<DiscogsRelease> {
  const settings = loadSettings();
  if (!settings.discogsToken) throw new Error('No Discogs token configured');

  const res = await fetch(`${DISCOGS_API}/releases/${releaseId}`, {
    headers: {
      'Authorization': `Discogs token=${settings.discogsToken}`,
      'User-Agent': 'PioneerExportTool/1.0',
    },
  });

  if (!res.ok) throw new Error(`Discogs API error: ${res.status}`);
  return res.json();
}

export async function autoMatchTrack(track: Track): Promise<Partial<Track> | null> {
  try {
    const results = await searchDiscogs(track.artist, track.title);
    if (results.length === 0) return null;

    const best = results[0];
    const updates: Partial<Track> = {
      discogs_release_id: String(best.id),
    };

    if (best.master_id) updates.discogs_master_id = String(best.master_id);
    if (best.cover_image) updates.cover_art_url = best.cover_image;
    if (best.genre?.length && !track.genre) updates.genre = best.genre.join(', ');
    if (best.year && !track.year) updates.year = parseInt(best.year) || 0;

    return updates;
  } catch {
    return null;
  }
}

export async function scrapeDiscogsForTracks(
  tracks: Track[],
  onProgress: (current: number, total: number, trackName: string) => void,
  onTrackUpdated: (trackId: number, updates: Partial<Track>) => void,
  signal?: AbortSignal,
): Promise<{ matched: number; failed: number }> {
  let matched = 0;
  let failed = 0;

  for (let i = 0; i < tracks.length; i++) {
    if (signal?.aborted) break;

    const track = tracks[i];
    onProgress(i + 1, tracks.length, track.title);

    // Skip tracks already matched
    if (track.discogs_release_id) {
      continue;
    }

    const updates = await autoMatchTrack(track);
    if (updates) {
      await updateTrack(track.id, updates);
      onTrackUpdated(track.id, updates);
      matched++;
    } else {
      failed++;
    }

    // Rate limit: Discogs allows ~60 req/min for authenticated users
    await new Promise(r => setTimeout(r, 1100));
  }

  return { matched, failed };
}
