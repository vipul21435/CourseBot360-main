import * as particularCourse from "./particularCourse.js";

// html elements
var messageBox = document.getElementById("messageInput"); // message input text
var chatContent = document.getElementById("chatContent"); // chatbot content screen
var sendBtn = document.getElementById("sendBtn");
var clearBtn = document.getElementById("clearBtn");
var screen = document.getElementById("screen");           // chatbot total interface
var body = document.body;
var requests = document.getElementsByClassName("msg request");  // input message sent
var responses = document.getElementsByClassName("msg response"); // oputput message received

// dark mode initially off
let dark = false;
let reqBgDark = '-webkit-linear-gradient(rgb(3, 3, 58), rgb(2, 2, 131))';
let respBgDark = '-webkit-linear-gradient(rgb(64, 9, 86), rgb(105, 25, 137))';
let reqBgLight = '-webkit-linear-gradient(blue, rgb(112, 112, 255))';
let respBgLight = '-webkit-linear-gradient(rgb(113, 11, 153), rgb(174, 73, 214))';

// toggle between dark and light modes
function changeMode() {
    let chatBg, bodyBg, shadow, reqBg, respBg;
    // if currently at light mode enable dark mode
    if (dark == false) {
        chatBg = 'rgb(20, 20, 20)';
        bodyBg = '-webkit-radial-gradient(black 40%, rgb(0, 53, 97))';
        shadow = '0px 0px 50px rgb(40, 40, 40)';
        reqBg = reqBgDark;
        respBg = respBgDark;
    }
    // else disable dark mode
    else {
        chatBg = 'white';
        bodyBg = '-webkit-radial-gradient(rgb(0, 183, 255) 40%, rgb(0, 53, 97))';
        shadow = '0px 0px 50px rgb(206, 233, 255)';
        reqBg = reqBgLight;
        respBg = respBgLight;
    }

    chatContent.style.background = chatBg;
    body.style.background = bodyBg;
    screen.style.boxShadow = shadow;
    for (let i = 0; i < requests.length; i++) {
        requests[i].style.background = reqBg;
    }
    for (let i = 0; i < responses.length; i++) {
        responses[i].style.background = respBg;
    }

    // Add event listener for hover
    screen.addEventListener('mouseenter', () => {
        screen.style.boxShadow = '0px 0px 150px rgb(0, 47, 255)';
    });

    // Add event listener for mouse leave
    screen.addEventListener('mouseleave', () => {
        screen.style.boxShadow = shadow;
    });

    dark = !dark;
}

// when user sends a message
function getRequest() {
    // Get the message text from the input field
    var message = messageBox.value;

    // Do not proceed if the message is empty or only contains whitespace
    if (message.trim() === "") return;

    // Create a new message element
    var request = document.createElement("div");
    request.className = "msg request";
    request.textContent = message;
    if (dark) request.style.background = reqBgDark;

    // Append the new message to the content area
    chatContent.appendChild(request);

    // Clear the input field
    messageBox.value = "";

    // go to bottom by default
    chatContent.scrollTop = chatContent.scrollHeight;

    // respond after 700 ms
    setTimeout(() => {
        giveResponse(message);
    }, 700);
}

// Function to handle key press
function handleKeyPress(event) {
    // Function to handle enter key press event for message to send
    if (event.key === 'Enter') {
        event.preventDefault();
        getRequest();
    }
}

// Attach the event listener to the send button
sendBtn.addEventListener("click", getRequest);

// Attach the event listener to the input field
document.addEventListener("keydown", handleKeyPress);

// give response to user
export function giveResponse(message) {
    // Create a new message element
    var responseBox = document.createElement("div");
    responseBox.className = "msg response";
    if (dark) responseBox.style.background = respBgDark;

    // Remove certain characters from the user's input and split into array
    const filter = message.replace(/[?!,]/g, ' ').split(/\s+/);

    // clear the screen
    if (filter.some(word => /cls|clear/i.test(word))) return chatContent.innerHTML = '';

    // turn off dark mode
    else if (filter.some(word => /light/i.test(word))) {
        if (dark == false) responseBox.innerHTML += "I'm already in light mode.";
        else {
            changeMode();
            responseBox.innerHTML += "Dark mode turned off.";
            responseBox.style.background = respBgLight;
        }
    }

    // turn on dark mode
    else if (filter.some(word => /dark/i.test(word))) {
        if (dark == true) responseBox.innerHTML += "I'm already in dark mode.";
        else {
            changeMode();
            responseBox.innerHTML += "Dark mode turned on.";
            responseBox.style.background = respBgDark;
        }
    }

    // else go to response list
    else particularCourse.responseList(filter, responseBox);
    
    // respond after 700 ms
    setTimeout(() => {
        speak(responseBox.innerHTML);
    }, 700);
    
    // Append the new message to the content area
    chatContent.appendChild(responseBox);
    
    // Go to the bottom by default
    chatContent.scrollTop = chatContent.scrollHeight;
}

// Attach the event listener to the clear button
clearBtn.addEventListener("click", function() {
    giveResponse('cls');
});