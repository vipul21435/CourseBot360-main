import {fetchCourses, createCourseDictionary, keywords} from './data.js';
import * as listCoursesCriteria from "./listCoursesCriteria.js";

// Utilizing the fetchCourses function to get course data
export async function responseList(filter, responseBox) {
    const courses = await fetchCourses();
    const courseDictionary = await createCourseDictionary();
    let courseCode = '';

    for (let i = 0; i < filter.length; i++) {
        const word = filter[i].toUpperCase();
        for (const [key, value] of Object.entries(courseDictionary)) {
            if (word == key || word == value) {
                courseCode = key;
                break;
            }
        }
    }

    // check for a particular course to get its info
    if (courseCode != '') {
        const course = courses.find(course => course.Code.toUpperCase() === courseCode);

        if (filter.some(word => /techtree/i.test(word))) {
            const siteUrl = `https://techtree.iiitd.edu.in/viewDescription/filename?=${courseCode.toUpperCase()}`;
            window.open(siteUrl, '_blank');
            responseBox.innerHTML += `Opening in techtree`;
        }

        else if (filter.some(word => /desc/i.test(word)))
            responseBox.innerHTML += `<b>Description:</b> ${course.Description}<br>`;
        
        else if (filter.some(word => /assess|grading/i.test(word))) {
            responseBox.innerHTML += "<b>Assessment plan:</b><br><br>";
            for (const key in course.Assessment)
                responseBox.innerHTML += `${key}: ${course.Assessment[key]}<br>`;
        }

        else if (filter.some(word => /req/i.test(word))) {
            if (filter.some(word => /pre/i.test(word))) {
                if (filter.some(word => /whose/i.test(word)))
                    printCoursesWithPreRequisite(course, courses, responseBox);
                else printRequisites(course, courses, responseBox, 'Pre');
            }
            else if (filter.some(word => /anti/i.test(word)))
                printRequisites(course, courses, responseBox, 'Anti');
        }
        
        else if (filter.some(word => /cred/i.test(word)))
            responseBox.innerHTML += `<b>There are ${course.Credits} credits offered for this course.<br>`;

        else if (filter.some(word => /lab|assign|homework|quiz|project|mid|end/i.test(word)))
            printAssessmentDetails(filter, course, responseBox);
        
        // If no specific request found, print course details
        else {
            responseBox.innerHTML += `<b>${course.Code} - ${course.Title}</b><br><br>`;
            responseBox.innerHTML += `<b>Credits:</b> ${course.Credits}<br><br>`;
            if (course["Pre-requisites"])
                responseBox.innerHTML += `<b>Pre-requisites:</b> ${course["Pre-requisites"]}<br><br>`;
            else responseBox.innerHTML += `<b>Pre-requisites:</b> None<br><br>`;
            if (course["Anti-requisites"])
                responseBox.innerHTML += `<b>Anti-requisites:</b> ${course["Anti-requisites"]}<br><br>`;
            responseBox.innerHTML += `<b>Description:</b> ${course.Description}<br><br>`;
            responseBox.innerHTML += "<b>Assessment:</b><br>";
            // Print assessment details
            for (const key in course.Assessment)
            responseBox.innerHTML += `${key}: ${course.Assessment[key]}%<br>`;
            responseBox.innerHTML += `<br><a href = "https://techtree.iiitd.edu.in/viewDescription/filename?=${courseCode.toUpperCase()}">For more details click here</a><br>`;
        }
    }

    else listCoursesCriteria.responseList(filter, responseBox);
}

function printRequisites(course, courses, responseBox, type) {
    if (!course[`${type}-requisites`])
        responseBox.innerHTML += `No ${type === 'Pre' ? 'pre' : 'anti'}-requisites for this course.<br>`;
    else {
        const reqs = course[`${type}-requisites`].split(',');
        responseBox.innerHTML += `<b>${type === 'Pre' ? 'Pre' : 'Anti'}-requisites for this course:</b><br><br>`;
        for (const reqCode of reqs) {
            const req = courses.find(course => course.Code.toUpperCase() === reqCode);
            responseBox.innerHTML += `${reqCode} - ${req ? req.Title : 'Unknown Course'}<br>`;
        }
    }
}

function printAssessmentDetails(filter, course, responseBox) {
    for (const keyword in keywords) {
        if (filter.some(word => new RegExp(keyword, 'i').test(word))) {
            const assessmentKey = keywords[keyword];
            if (course.Assessment[assessmentKey]) {
                if (filter.some(word => /weight|percent/i.test(word)))
                    responseBox.innerHTML += `Weightage of ${assessmentKey.toLowerCase()} is ${course.Assessment[assessmentKey]}% for this course.<br>`;
                else responseBox.innerHTML += `Yes, there are ${assessmentKey.toLowerCase()} for this course.<br>`;
            }
            else responseBox.innerHTML += `There are no ${assessmentKey.toLowerCase()} for this course.<br>`;
        }
    }
}

function printCoursesWithPreRequisite(course, courses, responseBox) {
    const coursesWithPreRequisite = courses.filter(otherCourse => {
        const prerequisites = otherCourse["Pre-requisites"] ? otherCourse["Pre-requisites"].split(',') : [];
        return prerequisites.includes(course.Code.toUpperCase());
    });
    if (coursesWithPreRequisite.length > 0) {
        responseBox.innerHTML += `<b>Courses whose pre-requisite is ${course.Code}:</b><br>`;
        coursesWithPreRequisite.forEach(otherCourse => {
            responseBox.innerHTML += `${otherCourse.Code} - ${otherCourse.Title}<br>`;
        });
    }
    else responseBox.innerHTML += `No courses found whose pre-requisite is ${course.Code}.<br>`;
}