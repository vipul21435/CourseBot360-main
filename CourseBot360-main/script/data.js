const jsonFilePath = './script/techtree.json';

// Async function to fetch courses data
export async function fetchCourses() {
    const response = await fetch(jsonFilePath);
    const courses = await response.json();
    return courses;
}

// Function to create a dictionary of course codes and acronyms
export async function createCourseDictionary() {
    const courses = await fetchCourses();
    const courseDictionary = {};

    courses.forEach(course => {
        courseDictionary[course.Code] = course.Acronym;
    });

    return courseDictionary;
}

export const keywords = {
    'lab': 'Labs',
    'assign': 'Assignments',
    'homework': 'Homeworks',
    'quiz': 'Quizzes',
    'project': 'Project',
    'mid': 'Midsem',
    'end': 'Endsem'
};