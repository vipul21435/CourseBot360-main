# CourseBot360

Ask about a course and get a straight answer. Type `info about DSA`, or `is there a lab in OS?`, or `list CSE courses with quizzes under 10%`, and it answers from the IIIT Delhi catalogue.

[![CI](https://github.com/vipul21435/CourseBot360-main/actions/workflows/ci.yml/badge.svg)](https://github.com/vipul21435/CourseBot360-main/actions/workflows/ci.yml)
![Tests](https://img.shields.io/badge/tests-108-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

[Try it](https://vipul21435.github.io/CourseBot360-main/)

## What it answers

| Ask | Get |
|---|---|
| `Give info about DSA` | credits, requisites, description, assessment breakdown |
| `Describe CSE101` | just the description |
| `Is there any lab in OS?` | `No, CSE231 has no labs.` |
| `How much are quizzes worth in CSE231?` | `Yes, quizzes count for 10% of CSE231.` |
| `What are the pre-requisites of BIO213?` | `MTH100, Math 1` |
| `Which courses does MTH100 unlock?` | the courses that list it as a prerequisite |
| `List all CSE and SSH courses` | both departments |
| `List courses with assignments weightage at least 20%` | filtered on the real weightings |
| `dark mode`, `clear`, `help` | commands |

## How it is built

The bot is not the page. Parsing, lookup and rendering are three separate things:

`engine/intents.js` turns "is there a lab in OS?" into `{ intent: 'course_component', course: 'CSE231', component: 'Labs' }`. `engine/catalogue.js` does the lookup. `engine/respond.js` produces `{ text: 'No, CSE231 has no labs.', blocks: [...] }`. Only then does `ui/render.js` turn those blocks into DOM nodes.

Nothing in `engine/` touches the DOM, which is why the whole conversation runs in a test in milliseconds, and nothing in `ui/` parses anything.

Answers are data. A response is `{ text, blocks }` where a block is a heading, paragraph, list, fact table or link, and the renderer decides how to show them. That is also what keeps string concatenation out of `innerHTML`.

## Is it AI?

No, and it is worth saying so. This is a deterministic intent parser over a local file. Regular expressions map a question onto one of sixteen intents and a lookup answers it. No model, no API call.

That was a choice. A static site cannot hold an API key without handing it to every visitor, and for 31 fixed courses a parser is faster, free, works offline, and cannot invent a prerequisite that does not exist. Every answer traces back to a row in `public/data/courses.json`.

## Run it

```bash
git clone https://github.com/vipul21435/CourseBot360-main.git
cd CourseBot360-main
npm install
npm run dev
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

`Pre-requisites` and `Anti-requisites` are optional, comma separated. New assessment components are picked up on their own, so add `"Viva": 10` and `list courses with a viva` starts working, because the component vocabulary comes from the data.

Two tests walk the whole catalogue and check that every course can be answered and reached by its acronym, so a malformed entry fails the build.

## Accessibility

Keyboard operable throughout. Skip link, labelled input, `role="list"` on the transcript, and one polite live region that announces each reply without re-reading the conversation. Both themes meet WCAG AA contrast. The theme follows `prefers-color-scheme` until you override it, and then it remembers.

## History

The repo used to be an extracted zip, nested folder and all, and every reply threw `ReferenceError: speak is not defined`. `main.js` called `speak(responseBox.innerHTML)` after each answer and no such function existed anywhere in the project.

Requisite lists were split on "," without trimming, so every prerequisite after the first showed as "Unknown Course". "List CSE and SSH courses", a question the README itself advertised, matched only CSE. Dark mode looped over every message writing inline gradients and added a fresh pair of hover listeners each time it was toggled.

## Licence

[MIT](LICENSE). Course data comes from the public [IIIT Delhi TechTree](https://techtree.iiitd.edu.in/) and may be out of date. Check there before you register for anything.
