import {fetchCourses, keywords} from './data.js';

function parseFilterByValueComparison(filter) {
    const comparisonDetails = {
        comparisonType: null, // 'less', 'greater', 'equal'
        value: null
    };

    filter.forEach(word => {
        if (/less/i.test(word)) comparisonDetails.comparisonType = 'less';
        else if (/more|greater/i.test(word)) comparisonDetails.comparisonType = 'greater';
        else if (/equal/i.test(word)) comparisonDetails.comparisonType = 'equal';

        const numberMatch = word.match(/(\d+(\.\d+)?%?)/);
        if (numberMatch) comparisonDetails.value = parseFloat(numberMatch[1]);
    });

    // Only return valid comparison details
    if (comparisonDetails.comparisonType && comparisonDetails.value !== null) return comparisonDetails;

    return null;
}

function getAssessmentComponent(filter) {
    const component = Object.keys(keywords).find(sub => filter.some(word => new RegExp(sub, 'i').test(word)));
    return keywords[component];
}

function getFilterByPresence(filter) {
    if (filter.some(word => /no|without/i.test(word))) return false;
    else if (filter.some(word => /with/i.test(word))) return true;
    return null;
}

function generateCourseTable(courses, header, filterFunction, assessmentComponent, filterByPresence, filter) {
    let filteredCourses = courses.filter(filterFunction);

    const comparisonDetails = parseFilterByValueComparison(filter);
    filteredCourses = filteredCourses.filter(course => {
        const hasComponent = course.Assessment && course.Assessment[assessmentComponent] !== undefined;

        // Handle presence/absence filter
        if (filterByPresence !== null && ((filterByPresence && !hasComponent) || (!filterByPresence && hasComponent))) {
            return false; // Exclude course based on presence/absence criteria
        }

        // Handle comparison if applicable
        if (comparisonDetails && hasComponent) {
            const componentValue = course.Assessment[assessmentComponent];
            switch (comparisonDetails.comparisonType) {
                case 'less':
                    return componentValue < comparisonDetails.value;
                case 'greater':
                    return componentValue > comparisonDetails.value;
                case 'equal':
                    return componentValue === comparisonDetails.value;
                default:
                    return true;
            }
        }

        return true; // Include the course if no specific exclusion criteria are met
    });

    if (filteredCourses.length === 0) return "No courses match the criteria.";

    // Dynamically include the weightage column based on conditions
    let table = `${header}<br><br><table border='1'>
                    <tr>
                        <th style="width:80px">Course Code</th>
                        <th>Course Title</th>
                        <th style="width:80px">Acronym</th>`;
    
    if (filterByPresence || comparisonDetails) {
        table += `<th>${assessmentComponent} Weightage</th>`;
    }

    table += `</tr>`;

    filteredCourses.forEach(course => {
        table += `<tr>
                    <td>${course.Code}</td>
                    <td>${course.Title}</td>
                    <td>${course.Acronym}</td>`;
        
        // Include the assessment weightage if conditions are met
        if ((filterByPresence || comparisonDetails) && course.Assessment && course.Assessment[assessmentComponent] !== undefined) {
            table += `<td>${course.Assessment[assessmentComponent]}%</td>`;
        } else if (filterByPresence || comparisonDetails) {
            // Provide a placeholder if the component is expected but not available
            table += `<td>N/A</td>`;
        }

        table += `</tr>`;
    });

    table += "</table><br>";
    return table;
}

export async function responseList(filter, responseBox) {
    const courses = await fetchCourses();
    // List courses in table form
    if (filter.some(word => /list|all|course|interest/i.test(word))) {
        const assessmentComponent = getAssessmentComponent(filter);
        const filterByPresence = getFilterByPresence(filter);
        let deptGiven = false; // Variable to track if any courses are found

        if (filter.some(word => /bio/i.test(word))) {
            responseBox.innerHTML += generateCourseTable(courses, "Bio Courses:", course => /bio/i.test(course.Code), assessmentComponent, filterByPresence, filter);
            deptGiven = true;
        }

        if (filter.some(word => /cse|computer/i.test(word))) {
            responseBox.innerHTML += generateCourseTable(courses, "CSE Courses:", course => /cse/i.test(course.Code), assessmentComponent, filterByPresence, filter);
            deptGiven = true;
        }

        if (filter.some(word => /des/i.test(word))) {
            responseBox.innerHTML += generateCourseTable(courses, "Design Courses:", course => /des/i.test(course.Code), assessmentComponent, filterByPresence, filter);
            deptGiven = true;
        }

        if (filter.some(word => /ece|electro/i.test(word))) {
            responseBox.innerHTML += generateCourseTable(courses, "ECE Courses:", course => /ece/i.test(course.Code), assessmentComponent, filterByPresence, filter);
            deptGiven = true;
        }

        if (filter.some(word => /mth|math/i.test(word))) {
            responseBox.innerHTML += generateCourseTable(courses, "Math Courses:", course => /mth/i.test(course.Code), assessmentComponent, filterByPresence, filter);
            deptGiven = true;
        }

        if (filter.some(word => /ssh|social|humanit|hss/i.test(word))) {
            responseBox.innerHTML += generateCourseTable(courses, "SSH Courses:", course => /ssh|soc|psy/i.test(course.Code), assessmentComponent, filterByPresence, filter);
            deptGiven = true;
        }

        // If no courses are found based on keywords, print all courses
        if (!deptGiven) {
            responseBox.innerHTML += generateCourseTable(courses, "Courses offered:", () => true, assessmentComponent, filterByPresence, filter);
        }
    }

    else if (filter.some(word => /hi/i.test(word))) responseBox.innerHTML += "Hello!<br>Feel free to ask me anything.";
    else if (filter.some(word => /hello|hey/i.test(word))) responseBox.innerHTML += "Hi there!<br>Feel free to ask me anything.";
    else if (filter.some(word => /how|are|you/i.test(word))) responseBox.innerHTML += "I am doing well! Thanks.";

    else responseBox.innerHTML += "No such course found!!";
}