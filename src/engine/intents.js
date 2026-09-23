/**
 * Turns a typed question into a structured intent.
 *
 * The original spread this across three files as nested `filter.some(/regex/)`
 * chains that mutated `innerHTML` as they went, so the parsing, the lookup and
 * the rendering were impossible to separate or to test. Here parsing returns a
 * plain object and touches nothing.
 */

export const INTENTS = {
  HELP: 'help',
  CLEAR: 'clear',
  THEME: 'theme',
  COURSE_OVERVIEW: 'course_overview',
  COURSE_DESCRIPTION: 'course_description',
  COURSE_CREDITS: 'course_credits',
  COURSE_ASSESSMENT: 'course_assessment',
  COURSE_COMPONENT: 'course_component',
  COURSE_PREREQUISITES: 'course_prerequisites',
  COURSE_ANTIREQUISITES: 'course_antirequisites',
  COURSE_UNLOCKS: 'course_unlocks',
  LIST_ALL: 'list_all',
  LIST_BY_DEPARTMENT: 'list_by_department',
  LIST_BY_COMPONENT: 'list_by_component',
  LIST_BY_CREDITS: 'list_by_credits',
  UNKNOWN: 'unknown',
};

/** Words a user might type for each assessment component in the data. */
const COMPONENT_WORDS = {
  Labs: /\blabs?\b|\blaborator/i,
  Assignments: /\bassign/i,
  Homeworks: /\bhome ?works?\b|\bhw\b/i,
  Quizzes: /\bquiz(?:zes)?\b/i,
  Project: /\bprojects?\b/i,
  Midsem: /\bmid ?(?:sem|term)?\b/i,
  Endsem: /\bend ?(?:sem|term)?\b|\bfinals?\b/i,
};

const DEPARTMENT_WORDS = {
  CSE: /\bcse\b|\bcomputer science\b/i,
  BIO: /\bbio\b|\bbiology\b/i,
  ECE: /\bece\b|\belectronics\b/i,
  DES: /\bdes\b|\bdesign\b/i,
  MTH: /\bmth\b|\bmaths?\b|\bmathematics\b/i,
  SSH: /\bssh\b/i,
  SOC: /\bsoc\b|\bsociology\b/i,
};

const COMPARATORS = [
  { test: /\b(?:more than or equal to|at least|>=|no less than)\b/i, comparator: 'gte' },
  { test: /\b(?:less than or equal to|at most|<=|no more than)\b/i, comparator: 'lte' },
  { test: /\b(?:greater than|more than|above|over|>)\b/i, comparator: 'gt' },
  { test: /\b(?:less than|below|under|fewer than|<)\b/i, comparator: 'lt' },
  { test: /\b(?:exactly|equal to|=)\b/i, comparator: 'eq' },
];

/** Course codes look like ABC123; acronyms are 2-6 letters. */
const CODE_PATTERN = /\b([A-Z]{2,4}\s?\d{3})\b/i;

function findCourseToken(text, catalogue) {
  const coded = text.match(CODE_PATTERN);
  if (coded) {
    const normalised = coded[1].replace(/\s+/g, '').toUpperCase();
    if (catalogue.find(normalised)) return normalised;
  }

  // Otherwise try each word as an acronym, longest first so "DSA" beats "DS".
  const words = text
    .split(/[^A-Za-z0-9]+/)
    .filter((word) => /^[A-Za-z]{2,6}$/.test(word))
    .sort((a, b) => b.length - a.length);

  for (const word of words) {
    const course = catalogue.find(word);
    if (course) return course.code;
  }
  return null;
}

function findComponent(text) {
  for (const [name, pattern] of Object.entries(COMPONENT_WORDS)) {
    if (pattern.test(text)) return name;
  }
  return null;
}

/** Every department named, because "CSE and SSH courses" means both. */
function findDepartments(text) {
  const found = [];
  for (const [code, pattern] of Object.entries(DEPARTMENT_WORDS)) {
    if (pattern.test(text)) found.push(code);
  }
  return found;
}

function findComparison(text) {
  const percent = text.match(/(\d{1,3})\s*%?/);
  if (!percent) return null;

  const weight = Number(percent[1]);
  if (!Number.isFinite(weight) || weight < 0 || weight > 100) return null;

  const found = COMPARATORS.find((entry) => entry.test.test(text));
  return { comparator: found ? found.comparator : 'gte', weight };
}

/**
 * @returns {{intent: string, course?: string, component?: string, department?: string,
 *            comparator?: string, weight?: number, credits?: number, theme?: string}}
 */
export function parse(message, catalogue) {
  const text = String(message ?? '').trim();
  if (!text) return { intent: INTENTS.UNKNOWN };

  if (/^(?:cls|clear|reset)\b/i.test(text)) return { intent: INTENTS.CLEAR };
  if (/\bhelp\b|\bwhat can you do\b|^\?$/i.test(text)) return { intent: INTENTS.HELP };

  if (/\bdark mode\b|\bdark\b/i.test(text)) return { intent: INTENTS.THEME, theme: 'dark' };
  if (/\blight mode\b|\blight\b/i.test(text)) return { intent: INTENTS.THEME, theme: 'light' };

  const course = findCourseToken(text, catalogue);
  const component = findComponent(text);

  // "list" questions are about the catalogue, not about one course.
  const listing = /\blist\b|\bwhich courses\b|\bwhat courses\b|\ball courses\b|\bshow me\b/i.test(text);

  if (listing && !course) {
    const departments = findDepartments(text);
    const comparison = component ? findComparison(text) : null;

    if (component && comparison) {
      return { intent: INTENTS.LIST_BY_COMPONENT, component, ...comparison, departments };
    }
    if (component) {
      return { intent: INTENTS.LIST_BY_COMPONENT, component, departments };
    }

    const credits = text.match(/\b(\d)\s*credits?\b/i);
    if (credits) return { intent: INTENTS.LIST_BY_CREDITS, credits: Number(credits[1]) };

    if (departments.length) return { intent: INTENTS.LIST_BY_DEPARTMENT, departments };
    return { intent: INTENTS.LIST_ALL };
  }

  if (!course) return { intent: INTENTS.UNKNOWN };

  // Everything below is about one identified course.
  if (/\bwhose pre[- ]?requisite\b|\bunlocks?\b|\bleads? to\b|\bopens? up\b/i.test(text)) {
    return { intent: INTENTS.COURSE_UNLOCKS, course };
  }
  if (/\banti[- ]?requisite/i.test(text)) return { intent: INTENTS.COURSE_ANTIREQUISITES, course };
  if (/\bpre[- ]?requisite|\bprereq/i.test(text)) return { intent: INTENTS.COURSE_PREREQUISITES, course };
  // "info about X" wants the whole card; "describe X" wants the prose.
  if (/\binfo\b|\binformation\b|\btell me about\b|\boverview\b/i.test(text)) {
    return { intent: INTENTS.COURSE_OVERVIEW, course };
  }
  if (/\bdescri|\babout\b|\bsyllab/i.test(text)) return { intent: INTENTS.COURSE_DESCRIPTION, course };
  if (/\bcredits?\b/i.test(text)) return { intent: INTENTS.COURSE_CREDITS, course };

  if (component) return { intent: INTENTS.COURSE_COMPONENT, course, component };
  if (/\bassess|\bgrading\b|\bmarks\b|\bweightage\b/i.test(text)) {
    return { intent: INTENTS.COURSE_ASSESSMENT, course };
  }

  return { intent: INTENTS.COURSE_OVERVIEW, course };
}
