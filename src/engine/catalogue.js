/**
 * The course catalogue, and the lookups the bot needs over it.
 *
 * Kept free of the DOM and of fetch so the whole thing can be exercised in a
 * test with a plain array.
 */

/** Requisite fields arrive as "CSE101, MTH100" — split and trimmed. */
function splitCodes(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);
}

export class Catalogue {
  constructor(courses) {
    this.courses = courses.map((course) => ({
      ...course,
      code: String(course.Code).toUpperCase(),
      acronym: String(course.Acronym ?? '').toUpperCase(),
      // The original split these without trimming, so " MTH100" never matched
      // anything and prerequisites silently came back as "Unknown Course".
      prerequisites: splitCodes(course['Pre-requisites']),
      antirequisites: splitCodes(course['Anti-requisites']),
    }));

    this.byCode = new Map(this.courses.map((course) => [course.code, course]));
    this.byAcronym = new Map();
    for (const course of this.courses) {
      // Acronyms are not guaranteed unique; first one wins, rest stay reachable
      // by code.
      if (course.acronym && !this.byAcronym.has(course.acronym)) {
        this.byAcronym.set(course.acronym, course);
      }
    }
  }

  get size() {
    return this.courses.length;
  }

  /** A course by its code or its acronym, case-insensitively. */
  find(token) {
    if (!token) return null;
    const key = String(token).toUpperCase().trim();
    return this.byCode.get(key) ?? this.byAcronym.get(key) ?? null;
  }

  /** Every department prefix present, e.g. ["BIO", "CSE", "DES", ...]. */
  departments() {
    return [...new Set(this.courses.map((course) => course.code.replace(/\d.*$/, '')))].sort();
  }

  inDepartment(prefix) {
    const key = String(prefix).toUpperCase();
    return this.courses.filter((course) => course.code.startsWith(key));
  }

  /** Courses that list `code` among their prerequisites. */
  unlockedBy(code) {
    const key = String(code).toUpperCase();
    return this.courses.filter((course) => course.prerequisites.includes(key));
  }

  /** Resolve a list of codes to courses, keeping unknown ones visible. */
  resolve(codes) {
    return codes.map((code) => ({ code, course: this.byCode.get(code) ?? null }));
  }

  /** Every assessment component name used anywhere, e.g. ["Endsem", ...]. */
  assessmentComponents() {
    const names = new Set();
    for (const course of this.courses) {
      for (const name of Object.keys(course.Assessment ?? {})) names.add(name);
    }
    return [...names].sort();
  }

  /**
   * Courses whose weighting for `component` satisfies the comparison.
   * A course that does not assess that component at all is never a match.
   */
  byComponentWeight(component, comparator, weight) {
    return this.courses.filter((course) => {
      const value = course.Assessment?.[component];
      if (typeof value !== 'number') return false;
      if (comparator === 'gte') return value >= weight;
      if (comparator === 'lte') return value <= weight;
      if (comparator === 'gt') return value > weight;
      if (comparator === 'lt') return value < weight;
      return value === weight;
    });
  }

  /** Courses that assess `component` at all. */
  withComponent(component) {
    return this.courses.filter((course) => typeof course.Assessment?.[component] === 'number');
  }

  withCredits(credits) {
    return this.courses.filter((course) => course.Credits === credits);
  }
}

export async function loadCatalogue(url = 'data/courses.json', fetchImpl = fetch) {
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`Could not load the course catalogue (HTTP ${response.status}).`);
  }
  return new Catalogue(await response.json());
}
