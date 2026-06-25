/** Client-side browser / device helpers for Safari, Chrome, and iPhone. */

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function isSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);
}

/** iOS loads speech voices asynchronously — call before speak(). */
export function warmSpeechVoices(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.getVoices();
}

export function pickEnglishVoice(): SpeechSynthesisVoice | undefined {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => /^en-GB/i.test(v.lang)) ||
    voices.find((v) => /^en[-_]/i.test(v.lang)) ||
    voices.find((v) => /en/i.test(v.lang))
  );
}
