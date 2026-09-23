/** Wires the engine to the page. */

import { loadCatalogue } from './engine/catalogue.js';
import { respond } from './engine/respond.js';
import { renderMessage, speakableText } from './ui/render.js';
import { isSupported as speechSupported, speak } from './ui/speech.js';
import { applyTheme, currentTheme, preferredTheme, toggleTheme } from './ui/theme.js';

const SUGGESTIONS = [
  'Give info about DSA',
  'Is there a lab in OS?',
  'List all CSE and SSH courses',
  'Pre-requisites of BIO213',
  'Courses with assignments at least 20%',
];

applyTheme(preferredTheme());

const transcript = document.getElementById('transcript');
const form = document.getElementById('composer');
const input = document.getElementById('message');
const themeButton = document.getElementById('theme-toggle');
const speechButton = document.getElementById('speech-toggle');
const clearButton = document.getElementById('clear');
const suggestionBar = document.getElementById('suggestions');
const status = document.getElementById('status');

let catalogue = null;
let speechOn = false;

function post(who, answer) {
  transcript.append(renderMessage(who, answer));
  transcript.scrollTop = transcript.scrollHeight;
}

/** Announce the reply once, for screen readers, without duplicating the bubble. */
function announce(text) {
  status.textContent = text;
}

function setThemeLabel() {
  const dark = currentTheme() === 'dark';
  themeButton.setAttribute('aria-pressed', String(dark));
  themeButton.textContent = dark ? 'Light mode' : 'Dark mode';
}

function handle(message) {
  const trimmed = message.trim();
  if (!trimmed) return;

  post('user', trimmed);

  if (!catalogue) {
    post('bot', 'The course catalogue is still loading. Try again in a moment.');
    return;
  }

  const answer = respond(trimmed, catalogue);

  if (answer.clear) {
    transcript.replaceChildren();
    announce('Conversation cleared.');
    return;
  }

  if (answer.theme) {
    applyTheme(answer.theme);
    setThemeLabel();
  }

  post('bot', answer);

  const spoken = speakableText(answer);
  announce(spoken);
  speak(spoken, { enabled: speechOn });
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  handle(input.value);
  input.value = '';
  input.focus();
});

clearButton.addEventListener('click', () => {
  transcript.replaceChildren();
  announce('Conversation cleared.');
  input.focus();
});

themeButton.addEventListener('click', () => {
  toggleTheme();
  setThemeLabel();
});

if (speechSupported()) {
  speechButton.hidden = false;
  speechButton.addEventListener('click', () => {
    speechOn = !speechOn;
    speechButton.setAttribute('aria-pressed', String(speechOn));
    speechButton.textContent = speechOn ? 'Speech on' : 'Speech off';
  });
}

for (const suggestion of SUGGESTIONS) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'chip';
  button.textContent = suggestion;
  button.addEventListener('click', () => handle(suggestion));
  suggestionBar.append(button);
}

setThemeLabel();

loadCatalogue()
  .then((loaded) => {
    catalogue = loaded;
    post('bot', {
      text: 'Ready',
      blocks: [
        { type: 'heading', text: 'CourseBot360' },
        {
          type: 'paragraph',
          text: `I know about ${loaded.size} courses. Ask by course code or acronym - CSE101 or DSA - or type help.`,
        },
      ],
    });
  })
  .catch((error) => {
    post('bot', `I could not load the course catalogue. ${error.message}`);
  });
