# CourseBot360

**Ask about a course in plain English and get a straight answer.**

Type `info about DSA`, `is there a lab in OS?`, or `list CSE courses with quizzes
under 10%`, and CourseBot360 answers from the IIIT Delhi catalogue — credits,
assessment weightings, pre-requisites, and what each course unlocks.

[![CI](https://github.com/vipul21435/CourseBot360-main/actions/workflows/ci.yml/badge.svg)](https://github.com/vipul21435/CourseBot360-main/actions/workflows/ci.yml)
![Tests](https://img.shields.io/badge/tests-108-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

**[Try it →](https://vipul21435.github.io/CourseBot360-main/)**

---

## What it can answer

| Ask | Get |
|---|---|
| `Give info about DSA` | The full card: credits, requisites, description, assessment breakdown |
| `Describe CSE101` | Just the course description |
| `Is there any lab in OS?` | `No, CSE231 has no labs.` |
| `How much are quizzes worth in CSE231?` | `Yes — quizzes count for 10% of CSE231.` |
| `What are the pre-requisites of BIO213?` | `MTH100 — Math 1` |
| `Which courses does MTH100 unlock?` | The courses that list it as a prerequisite |
| `List all CSE and SSH courses` | Both departments, not just the first one named |
| `List courses with assignments weightage at least 20%` | Filtered by real weightings |
| `dark mode` · `clear` · `help` | Commands |

## How it is built

The point of the rewrite is that the **bot is not the page**. Parsing, lookup and
rendering are three separate things:

```
  "is there a lab in OS?"
        │
        ▼
  engine/intents.js    →  { intent: 'course_component', course: 'CSE231', component: 'Labs' }
        │
        ▼
  engine/catalogue.js  →  the course record, looked up by code or acronym
        │
        ▼
  engine/respond.js    →  { text: 'No, CSE231 has no labs.', blocks: [...] }
        │
        ▼
  ui/render.js         →  DOM nodes, built with createElement and textContent
```

`engine/` never touches the DOM, so the entire conversation is testable in
milliseconds without a browser, and `ui/` never parses anything.

Answers are **data, not HTML**. A response is `{ text, blocks }`, where a block is
a heading, paragraph, list, fact table or link. The renderer decides how to show
them — which is what keeps string concatenation out of `innerHTML` entirely.

## What was wrong before

| Then | Now |
|---|---|
| `speak(responseBox.innerHTML)` was called after every reply, but `speak` was **never defined** — every answer threw an uncaught `ReferenceError` | Speech synthesis actually implemented, off by default, a no-op where unsupported |
| The repo contained a nested `CourseBot360-main/` folder — an extracted zip, committed whole | Flat, conventional layout |
| Parsing, lookup and rendering interleaved across three files, mutating `innerHTML` as they went | Three separate layers, the first two with no DOM at all |
| Every branch built HTML by string concatenation | `createElement` + `textContent` throughout |
| `"CSE101, MTH100".split(',')` without trimming — every prerequisite after the first showed as "Unknown Course" | Codes trimmed and upper-cased on load; unresolved ones say so honestly |
| "List CSE **and SSH** courses" matched only CSE | All named departments are collected |
| Dark mode looped over every message writing inline gradients, and re-registered its hover listeners on each toggle | One `data-theme` attribute on `<html>`, driven from CSS, remembered in `localStorage`, defaulting to your system setting |
| `var screen = document.getElementById(...)` shadowed `window.screen` | No globals shadowed; modules throughout |
| The README linked to somebody else's GitHub Pages | Deployed from this repo by GitHub Actions |
| No tests, no build, no linting, no CI | 108 tests, Vite build, ESLint, CI, automatic deploy |

## Is it AI?

No, and it is worth being straight about that. CourseBot360 is a **deterministic
intent parser** over a local catalogue: regular expressions map a question onto
one of sixteen intents, and a lookup answers it. There is no model and no API
call.

That is a deliberate choice rather than a missing feature. A static site cannot
hold an API key without handing it to every visitor, and for a fixed catalogue of
31 courses a parser is faster, free, offline, and — unlike a language model —
cannot invent a prerequisite that does not exist. Every answer here is traceable
to a row in `public/data/courses.json`.

## Run it

```bash
git clone https://github.com/vipul21435/CourseBot360-main.git
cd CourseBot360-main
npm install
npm run dev       # http://localhost:5173
```

```bash
npm test          # 108 tests
npm run coverage
npm run lint
npm run build     # static site in dist/
```

Node 18 or newer.

## Adding courses

Everything lives in [`public/data/courses.json`](public/data/courses.json):

```json
{
  "Code": "CSE101",
  "Acronym": "IP",
  "Title": "Introduction to Programming",
  "Credits": 4,
  "Description": "...",
  "Pre-requisites": "MTH100",
  "Assessment": { "Labs": 22.5, "Assignments": 22.5, "Quizzes": 15, "Midsem": 15, "Endsem": 25 }
}
```

`Pre-requisites` and `Anti-requisites` are optional comma-separated code lists.
Any new assessment component is picked up automatically — add `"Viva": 10` and
`list courses with a viva` starts working, because the component vocabulary is
derived from the data rather than hardcoded.

Two tests walk the whole catalogue and assert that every course is answerable and
reachable by its acronym, so a malformed entry fails the build.

## Accessibility

Keyboard-operable throughout, with a skip link, a labelled input, `role="list"`
on the transcript and a single polite live region that announces each reply
without re-reading the conversation. Both themes meet WCAG AA contrast, and the
theme follows `prefers-color-scheme` until you override it.

## Licence

[MIT](LICENSE). Course data is reproduced from the public
[IIIT Delhi TechTree](https://techtree.iiitd.edu.in/) for demonstration, and may
be out of date — check TechTree before you register for anything.
