const API_URL = 'http://musemind-ai-poems.us-east-1.elasticbeanstalk.com'

// fetch call should use API_URL for backend:
fetch(`${API_URL}/api/generate-poem`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userInput: userInput,
    theme: 'moodverse'
  })
})

const API_BASE_URL = "https://musemind.onrender.com/api";

let moodVerseFormElement = document.querySelector("#form-group");
moodVerseFormElement.addEventListener("submit", generateMoodPoem);

function generateMoodPoem(event) {
  event.preventDefault();

  let userInputElement = document.querySelector("#user-input-feelings");
  let poemElement = document.querySelector("#poem");
  let userInput = userInputElement.value.trim();

  // Validation
  if (!userInput) {
    poemElement.innerHTML = "Please share your mood or feelings first! ✨";
    return;
  }

  // Show loading animation
  new Typewriter("#poem", {
    strings: "Capturing your mood in verse... 🥚🐣🐥",
    autoStart: true,
    delay: 20,
    cursor: "",
  });

  // Call backend API
  fetch(`${API_BASE_URL}/generate-poem`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userInput: userInput,
      theme: "moodverse",
    }),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((err) => {
          throw new Error(err.error || "Failed to generate poem");
        });
      }
      return response.json();
    })
    .then((data) => {
      displayPoem(data.poem);
    })
    .catch((error) => {
      console.error("Error:", error);
      poemElement.innerHTML = `
      <em style="color: #e74c3c;">
        ❌ ${error.message}<br><br>
        Please try again or contact support if the issue persists.
      </em>
    `;
    });
}

function displayPoem(poemText) {
  const poemElement = document.querySelector("#poem");

  // Format the poem with line breaks
  const formattedPoem = poemText.replace(/\n/g, "<br>");

  // Display with typewriter effect
  new Typewriter("#poem", {
    strings: formattedPoem,
    autoStart: true,
    delay: 20,
    cursor: "",
  });
}
