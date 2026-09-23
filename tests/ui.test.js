/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderMessage, speakableText } from '../src/ui/render.js';
import { isSupported, speak, stop } from '../src/ui/speech.js';
import { applyTheme, currentTheme, preferredTheme, toggleTheme } from '../src/ui/theme.js';

describe('renderMessage', () => {
  it('renders a plain string', () => {
    const node = renderMessage('bot', 'Hello');
    expect(node.textContent).toBe('Hello');
    expect(node.className).toBe('msg msg--bot');
  });

  it('marks who said it', () => {
    expect(renderMessage('user', 'hi').className).toContain('msg--user');
  });

  it('renders each block type', () => {
    const node = renderMessage('bot', {
      text: 'summary',
      blocks: [
        { type: 'heading', text: 'CSE101' },
        { type: 'paragraph', text: 'A first course.' },
        { type: 'list', items: ['one', 'two'] },
        { type: 'facts', title: 'Assessment', items: [{ label: 'Endsem', value: '50%' }] },
        { type: 'link', href: 'https://example.test', text: 'More' },
      ],
    });

    expect(node.querySelector('h2').textContent).toBe('CSE101');
    expect(node.querySelector('p').textContent).toBe('A first course.');
    expect(node.querySelectorAll('li')).toHaveLength(2);
    expect(node.querySelector('dt').textContent).toBe('Endsem');
    expect(node.querySelector('dd').textContent).toBe('50%');
    expect(node.querySelector('a').getAttribute('href')).toBe('https://example.test');
  });

  it('opens external links safely', () => {
    const node = renderMessage('bot', { text: '', blocks: [{ type: 'link', href: 'https://x.test', text: 'x' }] });
    const link = node.querySelector('a');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('escapes anything that looks like markup', () => {
    const node = renderMessage('user', '<img src=x onerror="alert(1)">');
    expect(node.querySelector('img')).toBeNull();
    expect(node.textContent).toContain('<img');
  });

  it('escapes markup inside blocks too', () => {
    const node = renderMessage('bot', {
      text: '',
      blocks: [{ type: 'list', items: ['<script>bad()</script>'] }],
    });
    expect(node.querySelector('script')).toBeNull();
    expect(node.querySelector('li').textContent).toContain('<script>');
  });

  it('falls back to the summary when there are no blocks', () => {
    expect(renderMessage('bot', { text: 'Just this', blocks: [] }).textContent).toBe('Just this');
  });
});

describe('speakableText', () => {
  it('flattens blocks into one readable line', () => {
    const text = speakableText({
      text: 'summary',
      blocks: [
        { type: 'heading', text: 'CSE101' },
        { type: 'list', items: ['one', 'two'] },
        { type: 'facts', items: [{ label: 'Endsem', value: '50%' }] },
      ],
    });
    expect(text).toBe('CSE101. one. two. Endsem: 50%');
  });

  it('passes a plain string through', () => {
    expect(speakableText('hello')).toBe('hello');
  });

  it('uses the summary when there are no blocks', () => {
    expect(speakableText({ text: 'only this' })).toBe('only this');
  });
});

describe('speech', () => {
  beforeEach(() => {
    delete window.speechSynthesis;
    delete window.SpeechSynthesisUtterance;
  });

  it('reports that it is unsupported when the browser has no synthesis', () => {
    expect(isSupported()).toBe(false);
  });

  it('is a no-op rather than an error where it is unsupported', () => {
    expect(() => speak('hello', { enabled: true })).not.toThrow();
    expect(speak('hello', { enabled: true })).toBe(false);
  });

  it('stays silent unless it has been switched on', () => {
    window.speechSynthesis = { cancel: vi.fn(), speak: vi.fn() };
    window.SpeechSynthesisUtterance = function Utterance(text) { this.text = text; };

    expect(speak('hello')).toBe(false);
    expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
  });

  it('speaks when enabled and supported', () => {
    window.speechSynthesis = { cancel: vi.fn(), speak: vi.fn() };
    window.SpeechSynthesisUtterance = function Utterance(text) { this.text = text; };

    expect(speak('hello', { enabled: true })).toBe(true);
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
  });

  it('cancels whatever was already being read', () => {
    window.speechSynthesis = { cancel: vi.fn(), speak: vi.fn() };
    window.SpeechSynthesisUtterance = function Utterance(text) { this.text = text; };

    speak('hello', { enabled: true });
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
  });

  it('says nothing for empty text', () => {
    window.speechSynthesis = { cancel: vi.fn(), speak: vi.fn() };
    window.SpeechSynthesisUtterance = function Utterance() {};
    expect(speak('', { enabled: true })).toBe(false);
  });

  it('stopping is safe when unsupported', () => {
    expect(() => stop()).not.toThrow();
  });
});

describe('theme', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('applies a theme to the document root', () => {
    applyTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(currentTheme()).toBe('dark');
  });

  it('toggles between the two', () => {
    applyTheme('light');
    expect(toggleTheme()).toBe('dark');
    expect(toggleTheme()).toBe('light');
  });

  it('remembers the choice', () => {
    applyTheme('dark');
    expect(preferredTheme()).toBe('dark');
  });

  it('falls back to the system preference with nothing stored', () => {
    window.matchMedia = () => ({ matches: true });
    expect(preferredTheme()).toBe('dark');

    window.matchMedia = () => ({ matches: false });
    expect(preferredTheme()).toBe('light');
  });

  it('survives storage being unavailable', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('blocked');
      },
    });

    expect(() => applyTheme('dark')).not.toThrow();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    if (original) Object.defineProperty(window, 'localStorage', original);
  });
});
