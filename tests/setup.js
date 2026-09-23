import { beforeEach } from 'vitest';

/**
 * A deterministic localStorage for the suite.
 *
 * jsdom provides one, but recent Node versions also expose an experimental
 * global `localStorage` that can win and does not implement the full Storage
 * interface. `clear()` is missing. Installing our own removes the ambiguity.
 */
const entries = new Map();

const storage = {
  getItem: (key) => (entries.has(String(key)) ? entries.get(String(key)) : null),
  setItem: (key, value) => entries.set(String(key), String(value)),
  removeItem: (key) => entries.delete(String(key)),
  clear: () => entries.clear(),
  key: (index) => [...entries.keys()][index] ?? null,
  get length() {
    return entries.size;
  },
};

for (const target of [globalThis, globalThis.window].filter(Boolean)) {
  Object.defineProperty(target, 'localStorage', {
    value: storage,
    configurable: true,
    writable: true,
  });
}

beforeEach(() => {
  storage.clear();
  document.documentElement.removeAttribute('data-theme');
});
