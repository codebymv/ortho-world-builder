import { useCallback, useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { GameState } from '@/lib/game/GameState';
import { createMusicDirector } from '@/game/domain/AudioDirector';
import { HOLLOW_MUSIC_ENTER_Y } from '@/game/runtime/RuntimeLoopTail';
import { SaveManager } from '@/lib/game/SaveManager';

interface UseGameMusicOptions {
  gameStateRef: MutableRefObject<GameState | null>;
  processAudioElement: (audio: HTMLAudioElement) => void;
  cleanupAudioProcessor: () => void;
  resumeAudioProcessor: () => void | Promise<void>;
}

const MAP_MUSIC_MAP: Record<string, string> = {
  village: './audio/ortho_loop2.mp3',
  forest: './audio/wood_theme.mp3',
  forest_hollow: './audio/guilrhym_theme.mp3',
  guilrhym: './audio/guilrhym_theme.mp3',
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

  /**
   * Resolve the *initial* music key for a fresh load, accounting for the
   * hollow sub-region inside the forest map. Without this, refreshing in the
   * hollow loads wood_theme first and the loop tail immediately crossfades to
   * guilrhym_theme — you hear both songs overlap for the fade duration.
   *
   * Critically: this hook's mount effect fires BEFORE `setupGameRuntime`
   * populates `gameStateRef.current`, so on first load the ref is null. We
   * fall back to reading {@link SaveManager.load} directly to recover the
   * saved player position + map. Once the runtime is up and `gameStateRef`
   * is populated, that takes precedence (e.g. for the post-gesture autoplay
   * sync path which can fire much later).
   */
  const resolveInitialMapKey = useCallback((state: GameState | null): string => {
    let mapId = state?.currentMap;
    let playerY = state?.player.position.y;

    if (mapId == null || playerY == null) {
      const saved = SaveManager.load();
      mapId = saved?.currentMap ?? 'village';
      playerY = saved?.player.position.y ?? 0;
    }

    if (mapId === 'forest' && playerY <= HOLLOW_MUSIC_ENTER_Y) {
      return 'forest_hollow';
    }
    return mapId;
  }, []);

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
    const track = resolveMusicTrack(mapId);
    if (import.meta.env.DEV) {
      console.log(`[Music] Switching to: ${mapId}`);
      console.log(`[Music] Track: ${track}`);
    }
    if (currentTrackRef.current === track) {
      if (import.meta.env.DEV) {
        console.log('[Music] Same track, skipping');
      }
      return;
    }
    musicDirector.switchTrack(mapId);
  };

  const switchMusicTrack = useCallback((mapId: string) => {
    switchMusicTrackRef.current(mapId);
  }, []);

  useEffect(() => {
    const initialKey = resolveInitialMapKey(gameStateRef.current);
    const audio = musicDirector.initializeMusic(initialKey);

    const tryPlay = () => {
      void resumeAudioProcessor();
      musicDirector.tryPlay();
    };

    const startMusic = () => {
      void resumeAudioProcessor();
      musicStarted.current = true;
      const correctKey = resolveInitialMapKey(gameStateRef.current);
      const correctTrack = resolveMusicTrack(correctKey);
      if (currentTrackRef.current !== correctTrack) {
        musicDirector.switchTrack(correctKey);
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
  }, [cleanupAudioProcessor, gameStateRef, musicDirector, resolveMusicTrack, resolveInitialMapKey, resumeAudioProcessor]);

  return {
    musicRef,
    musicStarted,
    switchMusicTrack,
  };
}
