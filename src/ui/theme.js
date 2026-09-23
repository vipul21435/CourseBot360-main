/**
 * Light and dark mode.
 *
 * One attribute on <html> drives the whole palette from CSS, so nothing has to
 * walk the messages and restyle them.
 */

const STORAGE_KEY = 'coursebot360.theme';

function stored() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function remember(theme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private browsing. Losing the preference is survivable.
  }
}

export function preferredTheme() {
  const saved = stored();
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  remember(theme);
  return theme;
}

export function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  return applyTheme(next);
}

export function currentTheme() {
  return document.documentElement.getAttribute('data-theme') ?? 'light';
}
