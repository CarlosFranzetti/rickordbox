import { useState, useRef, useCallback, useEffect } from 'react';
import type { Track } from '@/lib/database';

export interface AudioPlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  queue: Track[];
  queueIndex: number;
}

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const fileHandleRef = useRef<Map<string, File>>(new Map());

  const [state, setState] = useState<AudioPlayerState>({
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    shuffle: false,
    queue: [],
    queueIndex: -1,
  });

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audio.volume = state.volume;
    audioRef.current = audio;

    const onTimeUpdate = () => setState(s => ({ ...s, currentTime: audio.currentTime }));
    const onDurationChange = () => setState(s => ({ ...s, duration: audio.duration || 0 }));
    const onEnded = () => {
      setState(s => {
        if (s.queueIndex < s.queue.length - 1) {
          const nextIdx = s.shuffle
            ? Math.floor(Math.random() * s.queue.length)
            : s.queueIndex + 1;
          setTimeout(() => playTrackFromQueue(nextIdx), 0);
          return s;
        }
        return { ...s, isPlaying: false, currentTime: 0 };
      });
    };
    const onPlay = () => setState(s => ({ ...s, isPlaying: true }));
    const onPause = () => setState(s => ({ ...s, isPlaying: false }));

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.pause();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  // Register files for playback (called during import or folder select)
  const registerFiles = useCallback((files: File[]) => {
    for (const file of files) {
      const relPath = ((file as any).webkitRelativePath || file.name).replace(/\\/g, '/').replace(/^\/+/, '');
      fileHandleRef.current.set(relPath, file);
    }
  }, []);

  const playTrackFromQueue = useCallback((index: number) => {
    setState(prev => {
      const track = prev.queue[index];
      if (!track || !audioRef.current) return prev;

      const file = fileHandleRef.current.get(track.file_path);
      if (!file) {
        console.warn('No file handle for', track.file_path);
        return { ...prev, currentTrack: track, queueIndex: index, isPlaying: false };
      }

      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      audioRef.current.src = url;
      audioRef.current.play().catch(() => {});

      return { ...prev, currentTrack: track, queueIndex: index, isPlaying: true, currentTime: 0 };
    });
  }, []);

  const playTrack = useCallback((track: Track, trackList?: Track[]) => {
    const queue = trackList || [track];
    const idx = queue.findIndex(t => t.id === track.id);
    setState(s => ({ ...s, queue, queueIndex: idx >= 0 ? idx : 0 }));

    const file = fileHandleRef.current.get(track.file_path);
    if (!file || !audioRef.current) {
      setState(s => ({ ...s, currentTrack: track, isPlaying: false, queue, queueIndex: idx >= 0 ? idx : 0 }));
      return;
    }

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    audioRef.current.src = url;
    audioRef.current.play().catch(() => {});
    setState(s => ({ ...s, currentTrack: track, isPlaying: true, currentTime: 0, queue, queueIndex: idx >= 0 ? idx : 0 }));
  }, []);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setState(s => ({ ...s, currentTime: time }));
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    if (audioRef.current) audioRef.current.volume = vol;
    setState(s => ({ ...s, volume: vol }));
  }, []);

  const skipNext = useCallback(() => {
    setState(prev => {
      if (prev.queue.length === 0) return prev;
      const nextIdx = prev.shuffle
        ? Math.floor(Math.random() * prev.queue.length)
        : Math.min(prev.queueIndex + 1, prev.queue.length - 1);
      if (nextIdx !== prev.queueIndex) {
        setTimeout(() => playTrackFromQueue(nextIdx), 0);
      }
      return prev;
    });
  }, [playTrackFromQueue]);

  const skipPrev = useCallback(() => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    setState(prev => {
      const prevIdx = Math.max(prev.queueIndex - 1, 0);
      if (prevIdx !== prev.queueIndex) {
        setTimeout(() => playTrackFromQueue(prevIdx), 0);
      }
      return prev;
    });
  }, [playTrackFromQueue]);

  const toggleShuffle = useCallback(() => {
    setState(s => ({ ...s, shuffle: !s.shuffle }));
  }, []);

  const hasFileHandle = useCallback((filePath: string) => {
    return fileHandleRef.current.has(filePath);
  }, []);

  return {
    ...state,
    playTrack,
    togglePlay,
    seek,
    setVolume,
    skipNext,
    skipPrev,
    toggleShuffle,
    registerFiles,
    hasFileHandle,
  };
}
