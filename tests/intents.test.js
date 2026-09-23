import { describe, expect, it } from 'vitest';

import { INTENTS, parse } from '../src/engine/intents.js';
import { realCatalogue } from './helpers.js';

const catalogue = realCatalogue();
const intentOf = (text) => parse(text, catalogue).intent;

describe('the questions the README promises', () => {
  // Every one of these is advertised in the project README. The original
  // handled some of them and silently mis-handled the rest.
  it('List all courses', () => {
    expect(parse('List all courses', catalogue)).toEqual({ intent: INTENTS.LIST_ALL });
  });

  it('List all CSE and SSH courses only - both departments, not just the first', () => {
    expect(parse('List all CSE and SSH courses only', catalogue)).toEqual({
      intent: INTENTS.LIST_BY_DEPARTMENT,
      departments: ['CSE', 'SSH'],
    });
  });

  it('List courses with assignments weightage more than or equal to 20%', () => {
    expect(parse('List courses with assignments weightage more than or equal to 20%', catalogue)).toMatchObject({
      intent: INTENTS.LIST_BY_COMPONENT,
      component: 'Assignments',
      comparator: 'gte',
      weight: 20,
    });
  });

  it('Give info about DSA course', () => {
    expect(parse('Give info about DSA course', catalogue)).toEqual({
      intent: INTENTS.COURSE_OVERVIEW,
      course: 'CSE102',
    });
  });

  it('Is there any lab in OS?', () => {
    expect(parse('Is there any lab in OS?', catalogue)).toEqual({
      intent: INTENTS.COURSE_COMPONENT,
      course: 'CSE231',
      component: 'Labs',
    });
  });

  it('List CSE courses with quiz weightage less than or equal to 10%', () => {
    expect(parse('List CSE courses with quiz weightage less than or equal to 10%', catalogue)).toMatchObject({
      intent: INTENTS.LIST_BY_COMPONENT,
      component: 'Quizzes',
      comparator: 'lte',
      weight: 10,
      departments: ['CSE'],
    });
  });
});

describe('identifying the course', () => {
  it('reads a code with or without a space', () => {
    expect(parse('tell me about CSE 101', catalogue).course).toBe('CSE101');
    expect(parse('tell me about cse101', catalogue).course).toBe('CSE101');
  });

  it('reads an acronym', () => {
    expect(parse('credits for DSA', catalogue).course).toBe('CSE102');
  });

  it('ignores a code that is not in the catalogue', () => {
    expect(parse('what about CSE999', catalogue).intent).toBe(INTENTS.UNKNOWN);
  });
});

describe('commands', () => {
  it.each(['cls', 'clear', 'reset'])('%s clears the conversation', (text) => {
    expect(intentOf(text)).toBe(INTENTS.CLEAR);
  });

  it.each(['help', 'what can you do', '?'])('%s asks for help', (text) => {
    expect(intentOf(text)).toBe(INTENTS.HELP);
  });

  it('switches theme', () => {
    expect(parse('dark mode', catalogue)).toEqual({ intent: INTENTS.THEME, theme: 'dark' });
    expect(parse('light mode please', catalogue)).toEqual({ intent: INTENTS.THEME, theme: 'light' });
  });
});

describe('questions about one course', () => {
  it.each([
    ['what are the pre-requisites of BIO213', INTENTS.COURSE_PREREQUISITES],
    ['prereqs for BIO213', INTENTS.COURSE_PREREQUISITES],
    ['anti-requisites of SSH101', INTENTS.COURSE_ANTIREQUISITES],
    ['which courses does MTH100 unlock', INTENTS.COURSE_UNLOCKS],
    ['whose pre-requisite is MTH100', INTENTS.COURSE_UNLOCKS],
    ['describe CSE101', INTENTS.COURSE_DESCRIPTION],
    ['how many credits is CSE101', INTENTS.COURSE_CREDITS],
    ['assessment plan for CSE101', INTENTS.COURSE_ASSESSMENT],
    ['grading of CSE101', INTENTS.COURSE_ASSESSMENT],
    ['CSE101', INTENTS.COURSE_OVERVIEW],
  ])('%s', (text, expected) => {
    expect(intentOf(text)).toBe(expected);
  });

  it('prefers "unlocks" over "pre-requisites" when both could match', () => {
    expect(intentOf('whose pre-requisite is MTH100')).toBe(INTENTS.COURSE_UNLOCKS);
  });

  it.each([
    ['is there a lab in CSE101', 'Labs'],
    ['any assignments in CSE101', 'Assignments'],
    ['homework for CSE101', 'Homeworks'],
    ['quizzes in CSE101', 'Quizzes'],
    ['is there a project in CSE101', 'Project'],
    ['midsem weight of CSE101', 'Midsem'],
    ['endsem for CSE101', 'Endsem'],
  ])('%s picks the %s component', (text, component) => {
    expect(parse(text, catalogue).component).toBe(component);
  });
});

describe('listing questions', () => {
  it('reads each comparator', () => {
    const at = (text) => parse(text, catalogue).comparator;
    expect(at('list courses with quizzes at least 20%')).toBe('gte');
    expect(at('list courses with quizzes at most 20%')).toBe('lte');
    expect(at('list courses with quizzes more than 20%')).toBe('gt');
    expect(at('list courses with quizzes less than 20%')).toBe('lt');
    expect(at('list courses with quizzes exactly 20%')).toBe('eq');
  });

  it('defaults to "at least" when a number is given with no comparator', () => {
    expect(parse('list courses with quizzes 20%', catalogue).comparator).toBe('gte');
  });

  it('lists by component with no threshold at all', () => {
    const parsed = parse('list courses with labs', catalogue);
    expect(parsed.intent).toBe(INTENTS.LIST_BY_COMPONENT);
    expect(parsed.comparator).toBeUndefined();
  });

  it('lists by credits', () => {
    expect(parse('list 4 credit courses', catalogue)).toEqual({
      intent: INTENTS.LIST_BY_CREDITS,
      credits: 4,
    });
  });

  it('ignores a weight outside 0 to 100', () => {
    expect(parse('list courses with quizzes at least 900%', catalogue).comparator).toBeUndefined();
  });
});

describe('input it cannot make sense of', () => {
  it.each(['', '   ', null, undefined, 'asdfgh qwerty'])('%s is unknown', (text) => {
    expect(intentOf(text)).toBe(INTENTS.UNKNOWN);
  });
});
