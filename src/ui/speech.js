/**
 * Reading answers aloud.
 *
 * The original called `speak(...)` after every reply, but no such function was
 * ever defined, so each answer threw an uncaught ReferenceError. This is that
 * function: off by default, and a no-op wherever the browser has no speech
 * synthesis rather than an error.
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
