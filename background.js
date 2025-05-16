
//all words
let list = [];

let pause = false;


chrome.action.onClicked.addListener((tab) => {
  if (tab.url.includes("forvo.com")) {
    // Don't wait — call both methods directly and immediately
    chrome.sidePanel.setOptions({
      tabId: tab.id,
      path: "sidepanel.html",
      enabled: true
    });

    chrome.sidePanel.open({ tabId: tab.id });
  } else {
    console.log("Not allowed on this site");
  }
});


function waitForDownloadComplete(downloadId) {
  return new Promise((resolve) => {
    function listener(delta) {
      if (delta.id === downloadId && delta.state && delta.state.current === 'complete') {
        chrome.downloads.onChanged.removeListener(listener);
        resolve();
      }

      // Optional: handle interruptions
      if (delta.id === downloadId && delta.state && delta.state.current === 'interrupted') {
        chrome.downloads.onChanged.removeListener(listener);
        console.warn(`⚠️ Download ${downloadId} was interrupted.`);
        resolve(); // Resolve anyway to avoid hanging
      }
    }

    chrome.downloads.onChanged.addListener(listener);

  });
}


function getName(response, index){

    let { word, accent, tag, pattern, limit } = response;

    let filename = '';

    switch (pattern) {

        case "word":
            filename = `${word}_${index}.mp3`;
            break;
        case "accent":
            filename = `${word}_${accent}_${index}.mp3`;
            break;
        case "tag":
            filename = `${word}_${tag}_${index}.mp3`;
            break;
        case "all":
            filename = `${word}_${accent}_${tag}_${index}.mp3`;
            break;
        default:
            filename = `${word}_${accent}_${index}.mp3`;

    }
    
    //if limit = 1, remove index  
    if(limit === '1')
        filename = filename.replace(`_${index}`, '');

    return filename;

}


async function downloading(response) {

  let { word, lang } = response;

  const _array = response.ids;

  let index = 1;  

  for (const id of _array) {

    const url = `https://forvo.com/download/mp3/${word}/${lang}/${id}`;

    const filename = getName(response, index);

    const downloadId = await new Promise((resolve, reject) => {
      chrome.downloads.download(
        {
          url,
          filename,
          saveAs: false,
        },
        (id) => {
          if (chrome.runtime.lastError || !id) {
            console.error(`⛔ Download failed for ID ${id}:`, chrome.runtime.lastError?.message);
            resolve(null); // proceed to next item anyway
          } else {
            console.log(`📥 Started download for: ${filename}`);
            resolve(id);
          }
        }
      );
    });

    if (downloadId !== null) {
      await waitForDownloadComplete(downloadId);
      console.log(`✅ Completed download for: ${filename}`);
    }
    
    index++;

  }

  return true;  

}


function injectScript(tabId) {

  return new Promise((resolve) => {

    const listener = function onUpdated(updatedTabId, info) {

      if (updatedTabId === tabId && info.status === 'complete') {

        chrome.tabs.onUpdated.removeListener(listener);

        chrome.scripting.executeScript(
          {
            target: { tabId },
            files: ['search.js']
          },
          () => {
            resolve(tabId);
          }
        );
      }
    };

    chrome.tabs.onUpdated.addListener(listener);

  });

}


async function findWord(){

    try{

        if(pause === true)
            return false;

        const _array = list.splice(0,2);

        let [ word, obj ] = _array;

        if(word === undefined)
            return false; 

        const tab = await openWordTab(word, obj);
        const tabId = await injectScript(tab.id);

        return true;

    }

    catch(error){

        console.log('findWord error:', error);
        return false;

    }

}


function openWordTab(word, obj) {

  let { lang, accent, limit, pattern, tag } = obj;

  //const encodedWord = encodeURIComponent(word);
  const url = `https://forvo.com/word/${word}/#${lang}?accent=${accent}&start=true&limit=${limit}&pattern=${pattern}&tag=${tag}`;

  return new Promise((resolve) => {
    chrome.tabs.create({ active: false, url }, (tab) => {
      resolve(tab);
    });
  });

}


function notFoundWords(word){

    let newWord = word.replace('_', ' ');

    chrome.storage.local.get("notFoundWords", (result) => {

        let current = result.notFoundWords || "";
  
        // Convert to array and clean up spaces
        let wordList = current ? current.split(",").map(w => w.trim()) : [];

        if (!wordList.includes(newWord)) {

            wordList.push(newWord);
            const updatedValue = wordList.join(", ");
            chrome.storage.local.set({ notFoundWords: updatedValue });

        }

    });

}


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  (async () => {

    try {

      if (message.action === 'start') {

        if(pause === true)
            pause = false;

        console.log('start')
        sendResponse({ status: 'start' });

        //if list.length > 0, the program adds new flow
        if(list.length === 0){

            const { words, lang, accent, limit, pattern, tag } = message;

            let _array = words
              .split(/\s*[,|\n]\s*/g)
              .map(s => s.replace(/\s+/g, '_').trim())
              .filter(Boolean);

            console.log('_array:', _array);

            _array.forEach(word => {
                list.push(word, { lang, accent, limit, pattern, tag })
            });

        }

        findWord();

      }

      if (message.action === 'login') {

            //add word again
            let { word } = message;
            list.push(word, message);

            // Update the tab's URL
            chrome.tabs.update(sender.tab.id, { active: true, url: 'https://forvo.com/login/?start=false' }, function (tab) {

                // Add a listener for when the tab finishes loading
                chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, updatedTab) {

                    if (tabId === tab.id && changeInfo.status === 'complete') {

                        // Remove the listener to prevent multiple triggers
                        chrome.tabs.onUpdated.removeListener(listener);

                        // Inject the script after page load
                        chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            files: ['login.js']
                        });

                    }

                });

            });

        sendResponse({ status: 'login' });
    
      }

      if (message.action === 'completed') {

        //console.log('obj:', message);

        let word = message.word;
        sendResponse({ status: 'completed' });

        chrome.tabs.remove(sender.tab.id);

        await downloading(message);
        findWord();

      }

      if (message.action === '404') {

        let word = message.word;
        sendResponse({ status: '404' });

        notFoundWords(message.word);
        chrome.tabs.remove(sender.tab.id);
        findWord();

      }

      if (message.action === 'resume') {

        console.log('resume');

        pause = false;

        sendResponse({ status: 'resume' });
        findWord();

      }

      if (message.action === 'pause') {

        console.log('pause');

        pause = true;

        sendResponse({ status: 'pause' });        

      }

      if (message.action === 'reset') {

        console.log('reset');

        list = [];
        pause = false;

        sendResponse({ status: 'reset' });        

      }

    } catch (error) {

      console.log('Error in onMessage handler:', error);

      sendResponse({ status: 'error', message: error.message });

    }

  })();

  return true; // keep the message channel open for async sendResponse

});

