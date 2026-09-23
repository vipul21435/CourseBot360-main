/**
 * Reading answers aloud.
 *
 * Off by default, and a no-op rather than an error where the browser has no
 * speech synthesis.
 */

export function isSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text, { enabled = false } = {}) {
  if (!enabled || !text || !isSupported()) return false;

  try {
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.lang = 'en-IN';
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

export function stop() {
  if (isSupported()) window.speechSynthesis.cancel();
}
