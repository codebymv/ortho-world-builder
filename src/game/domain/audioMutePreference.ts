export const AUDIO_MUTE_STORAGE_KEY = 'ortho-muted';
export const MASTER_GAIN_NORMAL = 0.85;

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

export function applyMasterGainMute(masterGain: GainNode | null | undefined): void {
  if (!masterGain) return;
  masterGain.gain.value = isAudioMuted() ? 0 : MASTER_GAIN_NORMAL;
}

export function applyElementMute(audio: HTMLAudioElement | null | undefined): void {
  if (!audio) return;
  audio.muted = isAudioMuted();
}
