export const AUDIO_MUTE_STORAGE_KEY = 'ortho-muted';
export const AUDIO_VOLUME_STORAGE_KEY = 'ortho-volume';
export const MASTER_GAIN_NORMAL = 0.85;

const DEFAULT_AUDIO_VOLUME = 1;
const clampVolume = (value: number) => Math.max(0, Math.min(1, value));

export function isAudioMuted(): boolean {
  try {
    return localStorage.getItem(AUDIO_MUTE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAudioMuted(muted: boolean): void {
  try {
    localStorage.setItem(AUDIO_MUTE_STORAGE_KEY, String(muted));
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
}

export function getAudioVolume(): number {
  try {
    const stored = localStorage.getItem(AUDIO_VOLUME_STORAGE_KEY);
    if (stored === null) return DEFAULT_AUDIO_VOLUME;
    const parsed = Number(stored);
    return Number.isFinite(parsed) ? clampVolume(parsed) : DEFAULT_AUDIO_VOLUME;
  } catch {
    return DEFAULT_AUDIO_VOLUME;
  }
}

export function setAudioVolume(volume: number): void {
  try {
    localStorage.setItem(AUDIO_VOLUME_STORAGE_KEY, String(clampVolume(volume)));
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
}

export function applyMasterGainMute(masterGain: GainNode | null | undefined): void {
  if (!masterGain) return;
  masterGain.gain.value = isAudioMuted() ? 0 : getAudioVolume() * MASTER_GAIN_NORMAL;
}

export function applyElementMute(audio: HTMLAudioElement | null | undefined): void {
  if (!audio) return;
  audio.muted = isAudioMuted();
}
