/**
 * Turns an intent into an answer.
 *
 * Answers are data, never HTML: `{ text, blocks }`. The renderer decides how to
 * show them, which is what lets the whole conversation be tested without a
 * browser, and what stops anything user-typed reaching innerHTML.
 */

import { INTENTS, parse } from './intents.js';

const TECHTREE = 'https://techtree.iiitd.edu.in/viewDescription/filename?=';

const answer = (text, blocks = []) => ({ text, blocks });

const courseLine = (course) => `${course.code} - ${course.Title}`;

const percent = (value) => `${value}%`;

function overview(course) {
  const blocks = [
    { type: 'heading', text: `${course.code} - ${course.Title}` },
    {
      type: 'facts',
      items: [
        { label: 'Acronym', value: course.acronym || '-' },
        { label: 'Credits', value: String(course.Credits) },
        { label: 'Pre-requisites', value: course.prerequisites.join(', ') || 'None' },
        { label: 'Anti-requisites', value: course.antirequisites.join(', ') || 'None' },
      ],
    },
    { type: 'paragraph', text: course.Description },
  ];

  const assessment = Object.entries(course.Assessment ?? {});
  if (assessment.length) {
    blocks.push({
      type: 'facts',
      title: 'Assessment',
      items: assessment.map(([name, weight]) => ({ label: name, value: percent(weight) })),
    });
  }

  blocks.push({ type: 'link', href: `${TECHTREE}${course.code}`, text: 'Full description on TechTree' });

  return answer(`${course.code} - ${course.Title}`, blocks);
}

function listing(title, courses, emptyText) {
  if (!courses.length) return answer(emptyText);
  return answer(`${title} (${courses.length})`, [
    { type: 'heading', text: `${title} (${courses.length})` },
    { type: 'list', items: courses.map(courseLine) },
  ]);
}

const HELP_LINES = [
  'Give info about DSA',
  'Describe CSE101',
  'What are the pre-requisites of BIO213?',
  'Which courses does MTH100 unlock?',
  'Is there a lab in OS?',
  'How much are the quizzes worth in CSE231?',
  'List all CSE and SSH courses',
  'List courses with assignments weightage at least 20%',
  'List 4 credit courses',
  'dark mode / light mode / clear',
];

/**
 * @param {string} message  what the user typed
 * @param {Catalogue} catalogue
 * @returns {{text: string, blocks: Array, intent: string, theme?: string, clear?: boolean}}
 */
export function respond(message, catalogue) {
  const parsed = parse(message, catalogue);
  const course = parsed.course ? catalogue.find(parsed.course) : null;

  switch (parsed.intent) {
    case INTENTS.CLEAR:
      return { ...answer('Cleared.'), intent: parsed.intent, clear: true };

    case INTENTS.THEME:
      return {
        ...answer(parsed.theme === 'dark' ? 'Dark mode on.' : 'Light mode on.'),
        intent: parsed.intent,
        theme: parsed.theme,
      };

    case INTENTS.HELP:
      return {
        ...answer('Here is what you can ask me.', [
          { type: 'paragraph', text: `I know about ${catalogue.size} courses. Try one of these:` },
          { type: 'list', items: HELP_LINES },
        ]),
        intent: parsed.intent,
      };

    case INTENTS.COURSE_OVERVIEW:
      return { ...overview(course), intent: parsed.intent };

    case INTENTS.COURSE_DESCRIPTION:
      return {
        ...answer(course.Description, [
          { type: 'heading', text: courseLine(course) },
          { type: 'paragraph', text: course.Description },
        ]),
        intent: parsed.intent,
      };

    case INTENTS.COURSE_CREDITS:
      return {
        ...answer(`${course.code} is worth ${course.Credits} credits.`),
        intent: parsed.intent,
      };

    case INTENTS.COURSE_ASSESSMENT: {
      const items = Object.entries(course.Assessment ?? {});
      if (!items.length) {
        return { ...answer(`No assessment breakdown is recorded for ${course.code}.`), intent: parsed.intent };
      }
      return {
        ...answer(`Assessment for ${course.code}`, [
          { type: 'heading', text: `Assessment for ${courseLine(course)}` },
          { type: 'facts', items: items.map(([name, weight]) => ({ label: name, value: percent(weight) })) },
        ]),
        intent: parsed.intent,
      };
    }

    case INTENTS.COURSE_COMPONENT: {
      const weight = course.Assessment?.[parsed.component];
      const name = parsed.component.toLowerCase();
      const text =
        typeof weight === 'number'
          ? `Yes - ${name} count for ${percent(weight)} of ${course.code}.`
          : `No, ${course.code} has no ${name}.`;
      return { ...answer(text), intent: parsed.intent };
    }

    case INTENTS.COURSE_PREREQUISITES: {
      if (!course.prerequisites.length) {
        return { ...answer(`${course.code} has no pre-requisites.`), intent: parsed.intent };
      }
      const resolved = catalogue.resolve(course.prerequisites);
      return {
        ...answer(`Pre-requisites for ${course.code}`, [
          { type: 'heading', text: `Pre-requisites for ${courseLine(course)}` },
          {
            type: 'list',
            items: resolved.map(({ code, course: found }) =>
              found ? courseLine(found) : `${code} - not in this catalogue`,
            ),
          },
        ]),
        intent: parsed.intent,
      };
    }

    case INTENTS.COURSE_ANTIREQUISITES: {
      if (!course.antirequisites.length) {
        return { ...answer(`${course.code} has no anti-requisites.`), intent: parsed.intent };
      }
      const resolved = catalogue.resolve(course.antirequisites);
      return {
        ...answer(`Anti-requisites for ${course.code}`, [
          { type: 'heading', text: `Anti-requisites for ${courseLine(course)}` },
          {
            type: 'list',
            items: resolved.map(({ code, course: found }) =>
              found ? courseLine(found) : `${code} - not in this catalogue`,
            ),
          },
        ]),
        intent: parsed.intent,
      };
    }

    case INTENTS.COURSE_UNLOCKS: {
      const unlocked = catalogue.unlockedBy(course.code);
      return {
        ...listing(
          `Courses that need ${course.code} first`,
          unlocked,
          `No course in this catalogue lists ${course.code} as a pre-requisite.`,
        ),
        intent: parsed.intent,
      };
    }

    case INTENTS.LIST_ALL:
      return { ...listing('All courses', catalogue.courses, 'The catalogue is empty.'), intent: parsed.intent };

    case INTENTS.LIST_BY_DEPARTMENT: {
      const departments = parsed.departments ?? [];
      const courses = departments.flatMap((code) => catalogue.inDepartment(code));
      return {
        ...listing(
          `${departments.join(' and ')} courses`,
          courses,
          `I have no courses for ${departments.join(' or ')}.`,
        ),
        intent: parsed.intent,
      };
    }

    case INTENTS.LIST_BY_CREDITS:
      return {
        ...listing(
          `${parsed.credits} credit courses`,
          catalogue.withCredits(parsed.credits),
          `No course is worth ${parsed.credits} credits.`,
        ),
        intent: parsed.intent,
      };

    case INTENTS.LIST_BY_COMPONENT: {
      const { component, comparator, weight } = parsed;
      let courses =
        comparator === undefined
          ? catalogue.withComponent(component)
          : catalogue.byComponentWeight(component, comparator, weight);

      const departments = parsed.departments ?? [];
      if (departments.length) {
        courses = courses.filter((c) => departments.some((d) => c.code.startsWith(d)));
      }

      const phrase = {
        gte: `at least ${weight}%`,
        lte: `at most ${weight}%`,
        gt: `more than ${weight}%`,
        lt: `less than ${weight}%`,
        eq: `exactly ${weight}%`,
      }[comparator];

      const scope = departments.length ? `${departments.join(' and ')} courses` : 'Courses';
      const title = phrase
        ? `${scope} where ${component.toLowerCase()} are worth ${phrase}`
        : `${scope} that have ${component.toLowerCase()}`;

      return { ...listing(title, courses, `Nothing matches: ${title.toLowerCase()}.`), intent: parsed.intent };
    }

    default:
      return {
        ...answer(
          "I did not catch that. Ask about a course by its code or acronym - say CSE101 or DSA - or type help.",
        ),
        intent: INTENTS.UNKNOWN,
      };
  }
}
