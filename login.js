const info = document.querySelector("p.info");

function typeText(element, text, speed = 50) {
  // Set styles before typing starts
  element.style.fontSize = '1.2em';      // Increase font size
  element.style.color = '#17202a';       // Change text color
  element.style.fontWeight = 'bold';     // Optional: bold text

  let index = 0;
  element.textContent = ''; // Clear any existing text

  function type() {
    if (index < text.length) {
      element.textContent += text.charAt(index);
      index++;
      setTimeout(type, speed);
    }
  }

  type();
}

if (info) {
  const text = "Please log in first. Then click Resume to keep searching for words.";
  typeText(info, text, 50);
}

