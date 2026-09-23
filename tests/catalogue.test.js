import { describe, expect, it } from 'vitest';

import { Catalogue, loadCatalogue } from '../src/engine/catalogue.js';
import { realCatalogue, tinyCatalogue } from './helpers.js';

describe('Catalogue', () => {
  it('loads every course in the shipped data file', () => {
    expect(realCatalogue().size).toBe(31);
  });

  it('finds a course by code, whatever the casing', () => {
    const catalogue = realCatalogue();
    expect(catalogue.find('CSE101').Title).toBe('Introduction to Programming');
    expect(catalogue.find('cse101').Title).toBe('Introduction to Programming');
    expect(catalogue.find(' cse101 ').Title).toBe('Introduction to Programming');
  });

  it('finds a course by acronym', () => {
    expect(realCatalogue().find('dsa').Code).toBe('CSE102');
  });

  it('returns null for something it does not know', () => {
    const catalogue = realCatalogue();
    expect(catalogue.find('CSE999')).toBeNull();
    expect(catalogue.find('')).toBeNull();
    expect(catalogue.find(null)).toBeNull();
  });

  it('trims requisite codes', () => {
    // The original split on "," without trimming, so " MTH100" matched nothing
    // and every prerequisite after the first showed as "Unknown Course".
    expect(tinyCatalogue().find('CSE201').prerequisites).toEqual(['CSE101', 'MTH100']);
  });

  it('treats a missing requisite field as an empty list', () => {
    const course = tinyCatalogue().find('CSE101');
    expect(course.prerequisites).toEqual([]);
    expect(course.antirequisites).toEqual([]);
  });

  it('lists the department prefixes it holds', () => {
    expect(realCatalogue().departments()).toEqual(['BIO', 'CSE', 'DES', 'ECE', 'MTH', 'SOC', 'SSH']);
  });

  it('selects the courses in a department', () => {
    const cse = realCatalogue().inDepartment('cse');
    expect(cse.length).toBeGreaterThan(0);
    expect(cse.every((course) => course.code.startsWith('CSE'))).toBe(true);
  });

  it('finds which courses a given course unlocks', () => {
    expect(realCatalogue().unlockedBy('MTH100').map((c) => c.code)).toEqual(['BIO213', 'ECE250']);
  });

  it('reports an unlock list of nothing for a leaf course', () => {
    expect(realCatalogue().unlockedBy('SSH121')).toEqual([]);
  });

  it('resolves requisite codes and keeps unknown ones visible', () => {
    const resolved = tinyCatalogue().resolve(['CSE101', 'MTH100']);
    expect(resolved[0].course.Title).toBe('Introduction to Programming');
    expect(resolved[1].course).toBeNull();
    expect(resolved[1].code).toBe('MTH100');
  });

  it('lists every assessment component in use', () => {
    expect(realCatalogue().assessmentComponents()).toEqual([
      'Assignments', 'Endsem', 'Homeworks', 'Labs', 'Midsem', 'Project', 'Quizzes',
    ]);
  });

  it('filters by component weight with each comparator', () => {
    const catalogue = tinyCatalogue();
    expect(catalogue.byComponentWeight('Labs', 'gte', 30).map((c) => c.code)).toEqual(['CSE101']);
    expect(catalogue.byComponentWeight('Labs', 'gt', 30)).toEqual([]);
    expect(catalogue.byComponentWeight('Endsem', 'lte', 50).map((c) => c.code)).toEqual(['CSE101']);
    expect(catalogue.byComponentWeight('Endsem', 'eq', 60).map((c) => c.code)).toEqual(['CSE201']);
  });

  it('never matches a course that does not assess the component at all', () => {
    // SSH101 has no Labs, so "labs of at most 10%" must not sweep it up.
    expect(tinyCatalogue().byComponentWeight('Labs', 'lte', 10).map((c) => c.code)).toEqual([]);
  });

  it('selects courses by credits', () => {
    expect(tinyCatalogue().withCredits(2).map((c) => c.code)).toEqual(['SSH101']);
  });

  it('keeps an acronym collision reachable by code', () => {
    const catalogue = new Catalogue([
      { Code: 'AAA101', Acronym: 'X', Title: 'First', Credits: 4, Assessment: {} },
      { Code: 'BBB101', Acronym: 'X', Title: 'Second', Credits: 4, Assessment: {} },
    ]);
    expect(catalogue.find('X').Code).toBe('AAA101');
    expect(catalogue.find('BBB101').Title).toBe('Second');
  });
});

describe('loadCatalogue', () => {
  it('builds a catalogue from a successful response', async () => {
    const fake = async () => ({ ok: true, json: async () => [{ Code: 'X100', Acronym: 'X', Title: 'T', Credits: 4, Assessment: {} }] });
    expect((await loadCatalogue('data/courses.json', fake)).size).toBe(1);
  });

  it('explains a failed response instead of returning nonsense', async () => {
    const fake = async () => ({ ok: false, status: 404 });
    await expect(loadCatalogue('missing.json', fake)).rejects.toThrow(/HTTP 404/);
  });
});
