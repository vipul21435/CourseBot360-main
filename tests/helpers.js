import { readFileSync } from 'node:fs';
import path from 'node:path';

import { Catalogue } from '../src/engine/catalogue.js';

// Resolved from the project root. Under jsdom `import.meta.url` is not a file:
// URL, so it cannot locate the fixture.
const dataPath = path.resolve(process.cwd(), 'public/data/courses.json');

/** The real catalogue, so the tests exercise the data that actually ships. */
export const realCatalogue = () => new Catalogue(JSON.parse(readFileSync(dataPath, 'utf8')));

/** A tiny catalogue, for cases the real data does not happen to contain. */
export const tinyCatalogue = () =>
  new Catalogue([
    {
      Code: 'CSE101',
      Acronym: 'IP',
      Title: 'Introduction to Programming',
      Credits: 4,
      Description: 'A first course in programming.',
      Assessment: { Labs: 30, Quizzes: 20, Endsem: 50 },
    },
    {
      Code: 'CSE201',
      Acronym: 'ADS',
      Title: 'Advanced Data Structures',
      Credits: 4,
      Description: 'Follows on from CSE101.',
      // Deliberately untrimmed and lowercase, as the real file has it.
      'Pre-requisites': ' cse101 , MTH100',
      Assessment: { Assignments: 40, Endsem: 60 },
    },
    {
      Code: 'SSH101',
      Acronym: 'CRW',
      Title: 'Critical Writing',
      Credits: 2,
      Description: 'Writing for university.',
      'Anti-requisites': 'SSH121',
      Assessment: { Project: 100 },
    },
  ]);
