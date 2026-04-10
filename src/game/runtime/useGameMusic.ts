import { useCallback, useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { GameState } from '@/lib/game/GameState';
import { createMusicDirector } from '@/game/domain/AudioDirector';

interface UseGameMusicOptions {
  gameStateRef: MutableRefObject<GameState | null>;
  processAudioElement: (audio: HTMLAudioElement) => void;
  cleanupAudioProcessor: () => void;
  resumeAudioProcessor: () => void | Promise<void>;
}

const MAP_MUSIC_MAP: Record<string, string> = {
  village: './audio/ortho_loop2.mp3',
  forest: './audio/wood_theme.mp3',
  gilrhym: './audio/gilrhym_theme.mp3',
  victory: './audio/victory_theme.mp3',
};

const DEFAULT_MUSIC_TRACK = './audio/ortho_loop2.mp3';

export function useGameMusic({
  gameStateRef,
  processAudioElement,
  cleanupAudioProcessor,
  resumeAudioProcessor,
}: UseGameMusicOptions) {
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const musicStarted = useRef(false);
  const currentTrackRef = useRef<string>('');
  const switchMusicTrackRef = useRef<(mapId: string) => void>(() => {});

  const resolveMusicTrack = useCallback(
    (mapId: string) => MAP_MUSIC_MAP[mapId] || DEFAULT_MUSIC_TRACK,
    [],
  );

  const musicDirectorRef = useRef<ReturnType<typeof createMusicDirector> | null>(null);
  if (!musicDirectorRef.current) {
    musicDirectorRef.current = createMusicDirector({
      musicRef,
      musicStartedRef: musicStarted,
      currentTrackRef,
      processAudioElement,
      resolveTrack: resolveMusicTrack,
    });
  }
  const musicDirector = musicDirectorRef.current;

  switchMusicTrackRef.current = (mapId: string) => {
    console.log(`[Music] Switching to: ${mapId}`);
    const track = resolveMusicTrack(mapId);
    console.log(`[Music] Track: ${track}`);
    if (currentTrackRef.current === track) {
      console.log('[Music] Same track, skipping');
      return;
    }
    musicDirector.switchTrack(mapId);
  };

  const switchMusicTrack = useCallback((mapId: string) => {
    switchMusicTrackRef.current(mapId);
  }, []);

  useEffect(() => {
    const currentMap = gameStateRef.current?.currentMap || 'village';
    const audio = musicDirector.initializeMusic(currentMap);

    const tryPlay = () => {
      void resumeAudioProcessor();
      musicDirector.tryPlay();
    };

    const startMusic = () => {
      void resumeAudioProcessor();
      musicStarted.current = true;
      const map = gameStateRef.current?.currentMap || 'village';
      const correctTrack = resolveMusicTrack(map);
      if (currentTrackRef.current !== correctTrack) {
        musicDirector.switchTrack(map);
      }
      tryPlay();
    };

    const startMusicOnAction = () => {
      if (!musicStarted.current && musicRef.current) {
        void resumeAudioProcessor();
        musicDirector.markStartedAndPlay();
      }
    };

    audio.play().then(() => {
      musicStarted.current = true;
    }).catch(() => {
      const iframe = document.querySelector('iframe');
      const container = document.getElementById('game-container');

      const startOnInteraction = () => {
        if (!musicStarted.current) {
          startMusicOnAction();
        }
      };

      window.addEventListener('click', startOnInteraction, { once: true });
      window.addEventListener('keydown', startOnInteraction, { once: true });
      window.addEventListener('touchstart', startOnInteraction, { once: true });
      document.addEventListener('click', startOnInteraction, { once: true });
      document.addEventListener('keydown', startOnInteraction, { once: true });
      container?.addEventListener('click', startOnInteraction, { once: true });
      container?.addEventListener('keydown', startOnInteraction, { once: true });
      iframe?.addEventListener('load', startOnInteraction, { once: true });
    });

    const onVisibility = () => {
      if (!document.hidden) tryPlay();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cleanupAudioProcessor();
      musicDirector.disposeMusic();
      audio.pause();
      audio.src = '';
      window.removeEventListener('click', startMusic);
      window.removeEventListener('keydown', startMusic);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [cleanupAudioProcessor, gameStateRef, resolveMusicTrack, resumeAudioProcessor]);

  return {
    musicRef,
    musicStarted,
    switchMusicTrack,
  };
}
