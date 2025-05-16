console.log("Side panel script loaded.");

//select languages
const langSelect = document.getElementById('lang');
const accentSelect = document.getElementById('accent');

//search buttons
const startBtn = document.getElementById("startBtn");
const resumeBtn = document.getElementById("resumeBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");

//search words textarea
const searchWords = document.getElementById("searchWords");

//not found word buttons
const copyBtn = document.getElementById("copyBtn");
const clearNotFoundBtn = document.getElementById("clearNotFoundBtn");

//not found words textarea
const notFoundWords = document.getElementById("notFoundWords");

//limint to download
const limit = document.getElementById("limit");

//pattern name
const patternName = document.getElementById("patternName");

//tag input
const tag = document.getElementById('tag');

//forvoForm
const forvoForm = document.getElementById('forvoForm');


//send a message to background.js
async function sender(obj){

    const response = await chrome.runtime.sendMessage(obj);
        
    console.log('response:', response);

}


//save searchWords, limit, pattern, tag
function saveToStorage1(event) {

  const value = event.target.value;

  const id = event.target.id || 'patternName';

  console.log('id of event', id);

  chrome.storage.local.set({
    [id]: value
  });

}


//save language & accent settings
function saveToStorage2() {

  chrome.storage.local.set({

    selectedLang: langSelect.value,
    selectedAccent: accentSelect.value

  });

}


//populate accent dropdown
function populateAccentOptions(lang) {

  const options = accentOptions[lang] || {};

  accentSelect.innerHTML = '';

  if (Object.keys(options).length === 0) {

    accentSelect.style.display = 'none';
    accentSelect.previousElementSibling.style.display = 'none'; // Hide label

  } else {

    accentSelect.style.display = 'block';
    accentSelect.previousElementSibling.style.display = 'block'; // Show label

    for (const [value, label] of Object.entries(options)) {

      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      accentSelect.appendChild(option);

    }

  }

}


//restore textareas
function restore() {

  forvoForm.reset();

  chrome.storage.local.get(["searchWords", "notFoundWords", 'selectedLang', 'selectedAccent', 'limit', 'patternName', 'tag'], (data) => {

    if (data.searchWords) searchWords.value = data.searchWords;
    if (data.notFoundWords) notFoundWords.value = data.notFoundWords;

    if (data.tag) tag.value = data.tag;

    if (data.limit) limit.value = data.limit;
    if (data.patternName){

        const radio = document.querySelector(`input[name="pattern"][value="${data.patternName}"]`);
        if (radio) radio.checked = true;

    } 

    const lang = data.selectedLang || 'en';
    const accent = data.selectedAccent || 'en_usa';

    langSelect.value = lang;
    populateAccentOptions(lang);
    accentSelect.value = accent;

  });
}


//language change handler
langSelect.addEventListener('change', () => {

  const selectedLang = langSelect.value;
  populateAccentOptions(selectedLang);

  const firstAccent = Object.keys(accentOptions[selectedLang] ?? {})[0] || '';

  accentSelect.value = firstAccent;
  saveToStorage2();

});


//accent change handler
accentSelect.addEventListener('change', saveToStorage2);


//start searching
startBtn.addEventListener("click", () => {

  const words = searchWords.value.toLowerCase().trim();
  const lang = document.getElementById('lang').value;
  const limit = document.querySelector('#limit').value;
  const pattern = document.querySelector('input[name="pattern"]:checked').value;
  const tag = document.querySelector('#tag').value;  

  let accent = document.getElementById('accent').value;
  accent = accent === '' ? lang : accent;

  if (words) {

    let obj = { action: "start", words, lang, accent, limit, pattern, tag };

    sender(obj);

  }

});


//resume searching
resumeBtn.addEventListener("click", () => {

    let obj = { action: "resume" };

    sender(obj);

});


//pause searching
pauseBtn.addEventListener("click", () => {

    let obj = { action: "pause" };

    sender(obj);

});


//copy to clipboard
copyBtn.addEventListener("click", () => {

  const text = notFoundWords.value.trim();

  if (text) {

    navigator.clipboard.writeText(text)
      .then(() => console.log("Copied to clipboard."))
      .catch(err => console.error("Failed to copy: ", err));

  }

});


//clear search
resetBtn.addEventListener("click", () => {

    let obj = { action: "reset" };

    sender(obj);

    searchWords.value = "";

    chrome.storage.local.remove("searchWords");

});


//clear not found
clearNotFoundBtn.addEventListener("click", () => {

  notFoundWords.value = "";
  chrome.storage.local.remove("notFoundWords");

});


//save on blur
searchWords.addEventListener("blur", saveToStorage1);


//save on change
limit.addEventListener('change', saveToStorage1);
patternName.addEventListener('change', saveToStorage1);


//save a tag 
tag.addEventListener('change', saveToStorage1);


//notFoundWords listener
chrome.storage.onChanged.addListener((changes) => {

  if (changes.notFoundWords) {

    notFoundWords.value = changes.notFoundWords.newValue || '';
    console.log("Panel message updated:", changes.notFoundWords.newValue);

  }

});


//initial restoration
restore();



