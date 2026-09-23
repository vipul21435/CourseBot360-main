import { describe, expect, it } from 'vitest';

import { INTENTS } from '../src/engine/intents.js';
import { respond } from '../src/engine/respond.js';
import { realCatalogue, tinyCatalogue } from './helpers.js';

const catalogue = realCatalogue();
const ask = (text) => respond(text, catalogue);

/** All the text in an answer, for assertions that do not care about structure. */
const flatten = (answer) =>
  [answer.text, ...(answer.blocks ?? []).flatMap((b) => [b.text, ...(b.items ?? []).map((i) => (typeof i === 'string' ? i : `${i.label} ${i.value}`))])]
    .filter(Boolean)
    .join(' ');

describe('course answers', () => {
  it('gives an overview with credits, requisites, description and assessment', () => {
    const answer = ask('info about CSE101');
    const text = flatten(answer);

    expect(answer.intent).toBe(INTENTS.COURSE_OVERVIEW);
    expect(text).toContain('CSE101');
    expect(text).toContain('Introduction to Programming');
    expect(text).toContain('Credits');
    expect(answer.blocks.some((b) => b.type === 'link')).toBe(true);
  });

  it('answers a credits question in one line', () => {
    expect(ask('how many credits is CSE101').text).toBe('CSE101 is worth 4 credits.');
  });

  it('answers a component question with the real weighting', () => {
    expect(ask('is there a lab in CSE101').text).toBe('Yes, labs count for 22.5% of CSE101.');
  });

  it('says so plainly when a component is absent', () => {
    // CSE231 (OS) genuinely has no lab component in the catalogue.
    expect(ask('is there any lab in OS?').text).toBe('No, CSE231 has no labs.');
  });

  it('lists pre-requisites with their titles', () => {
    const text = flatten(ask('pre-requisites of BIO213'));
    expect(text).toContain('MTH100');
    expect(text).toContain('Math 1');
  });

  it('says when a course has no pre-requisites', () => {
    expect(ask('pre-requisites of CSE101').text).toBe('CSE101 has no pre-requisites.');
  });

  it('names an unresolvable requisite instead of calling it Unknown Course', () => {
    const text = flatten(respond('pre-requisites of CSE201', tinyCatalogue()));
    expect(text).toContain('MTH100 (not in this catalogue)');
  });

  it('lists what a course unlocks', () => {
    const text = flatten(ask('which courses does MTH100 unlock'));
    expect(text).toContain('BIO213');
    expect(text).toContain('ECE250');
  });

  it('says when a course unlocks nothing', () => {
    expect(ask('which courses does SSH121 unlock').text).toMatch(/No course in this catalogue/);
  });

  it('breaks down the assessment', () => {
    const answer = ask('assessment plan for CSE101');
    const facts = answer.blocks.find((b) => b.type === 'facts');
    expect(facts.items.map((i) => i.label)).toContain('Endsem');
    expect(facts.items.every((i) => i.value.endsWith('%'))).toBe(true);
  });
});

describe('listing answers', () => {
  it('lists everything', () => {
    expect(ask('list all courses').text).toBe('All courses (31)');
  });

  it('lists two departments together', () => {
    const answer = ask('List all CSE and SSH courses only');
    const list = answer.blocks.find((b) => b.type === 'list');
    expect(answer.text).toMatch(/^CSE and SSH courses \(\d+\)$/);
    expect(list.items.every((line) => line.startsWith('CSE') || line.startsWith('SSH'))).toBe(true);
  });

  it('filters by component weighting', () => {
    const answer = ask('List courses with assignments weightage more than or equal to 20%');
    expect(answer.text).toContain('at least 20%');
    expect(answer.blocks.find((b) => b.type === 'list').items.length).toBeGreaterThan(0);
  });

  it('applies the department and the weighting together', () => {
    const answer = ask('List CSE courses with quiz weightage less than or equal to 10%');
    const list = answer.blocks.find((b) => b.type === 'list');
    expect(list.items.every((line) => line.startsWith('CSE'))).toBe(true);
  });

  it('lists by credits', () => {
    // Every course in this catalogue is worth 4 credits.
    expect(ask('list 4 credit courses').text).toBe('4 credit courses (31)');
  });

  it('says plainly when nothing matches', () => {
    expect(ask('list 9 credit courses').text).toBe('No course is worth 9 credits.');
  });
});

describe('commands and fallbacks', () => {
  it('signals a clear rather than clearing anything itself', () => {
    const answer = ask('cls');
    expect(answer.clear).toBe(true);
    expect(answer.intent).toBe(INTENTS.CLEAR);
  });

  it('reports the theme to switch to', () => {
    expect(ask('dark mode').theme).toBe('dark');
    expect(ask('light mode').theme).toBe('light');
  });

  it('offers examples when asked for help', () => {
    const answer = ask('help');
    expect(answer.blocks.find((b) => b.type === 'list').items.length).toBeGreaterThan(5);
    expect(flatten(answer)).toContain('31 courses');
  });

  it('says what it needs when it does not understand', () => {
    expect(ask('asdfgh').text).toMatch(/code or acronym/);
  });

  it('never returns HTML - answers are data', () => {
    for (const question of ['info about CSE101', 'list all courses', 'help', 'asdfgh']) {
      expect(flatten(ask(question))).not.toMatch(/<[a-z/]/i);
    }
  });

  it('always returns a text summary and an intent', () => {
    for (const question of ['info about CSE101', 'list all courses', 'help', 'cls', 'dark', 'asdfgh']) {
      const answer = ask(question);
      expect(typeof answer.text).toBe('string');
      expect(answer.text.length).toBeGreaterThan(0);
      expect(answer.intent).toBeTruthy();
    }
  });
});

describe('every course in the catalogue', () => {
  it('has an answerable overview', () => {
    for (const course of catalogue.courses) {
      const answer = respond(course.code, catalogue);
      expect(answer.intent, `${course.code} did not resolve`).toBe(INTENTS.COURSE_OVERVIEW);
      expect(flatten(answer)).toContain(course.Title);
    }
  });

  it('is reachable by its acronym', () => {
    for (const course of catalogue.courses) {
      expect(catalogue.find(course.acronym), `${course.acronym} unreachable`).toBeTruthy();
    }
  });
});
