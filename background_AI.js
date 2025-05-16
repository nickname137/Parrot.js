// background.js

let list = {};
const CONCURRENCY_LIMIT = 3;
let activeDownloads = 0;

chrome.action.onClicked.addListener((tab) => {
  if (tab.url.includes("forvo.com")) {
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
      if (delta.id === downloadId && delta.state?.current === 'complete') {
        chrome.downloads.onChanged.removeListener(listener);
        resolve();
      }
      if (delta.id === downloadId && delta.state?.current === 'interrupted') {
        chrome.downloads.onChanged.removeListener(listener);
        console.warn(`⚠️ Download ${downloadId} was interrupted.`);
        resolve();
      }
    }
    chrome.downloads.onChanged.addListener(listener);
  });
}

function getName(response, index) {
  let { word, accent, tag, pattern, limit } = response;
  let filename = '';
  switch (pattern) {
    case "word": filename = `${word}_${index}.mp3`; break;
    case "accent": filename = `${word}_${accent}_${index}.mp3`; break;
    case "tag": filename = `${word}_${tag}_${index}.mp3`; break;
    case "all": filename = `${word}_${accent}_${tag}_${index}.mp3`; break;
    default: filename = `${word}_${accent}_${index}.mp3`;
  }
  if (limit === '1') filename = filename.replace(`_${index}`, '');
  return filename;
}

async function downloading(response) {
  let { word, lang } = response;
  const _array = response.ids;
  let index = 1;
  for (const id of _array) {
    const url = `https://forvo.com/download/mp3/${word}/${lang}/${id}`;
    const filename = getName(response, index);
    const downloadId = await new Promise((resolve) => {
      chrome.downloads.download({ url, filename, saveAs: false }, (id) => {
        if (chrome.runtime.lastError || !id) {
          console.error(`⛔ Download failed for ${filename}:`, chrome.runtime.lastError?.message);
          resolve(null);
        } else {
          console.log(`📥 Started download for: ${filename}`);
          resolve(id);
        }
      });
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
        chrome.scripting.executeScript({
          target: { tabId },
          files: ['search.js']
        }, () => resolve(tabId));
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function processWord(word, obj) {
  const tab = await openWordTab(word, obj);
  await injectScript(tab.id);
}

function openWordTab(word, obj) {
  let { lang, accent, limit, pattern, tag } = obj;
  const url = `https://forvo.com/word/${word}/#${lang}?accent=${accent}&start=true&limit=${limit}&pattern=${pattern}&tag=${tag}`;
  return new Promise((resolve) => {
    chrome.tabs.create({ url }, (tab) => resolve(tab));
  });
}

function notFoundWords(word) {
  let newWord = word.replace('_', ' ');
  chrome.storage.local.get("notFoundWords", (result) => {
    let current = result.notFoundWords || "";
    let wordList = current ? current.split(",").map(w => w.trim()) : [];
    if (!wordList.includes(newWord)) {
      wordList.push(newWord);
      chrome.storage.local.set({ notFoundWords: wordList.join(", ") });
    }
  });
}

function startQueuedDownloads() {
  while (activeDownloads < CONCURRENCY_LIMIT) {
    const nextWord = Object.keys(list).find(word => list[word].status === 'waiting');
    if (!nextWord) break;

    list[nextWord].status = 'processing';
    activeDownloads++;

    processWord(nextWord, list[nextWord])
      .then(() => {
        list[nextWord].status = 'done';
        activeDownloads--;
        startQueuedDownloads();
      })
      .catch((err) => {
        console.error(`❌ Error processing ${nextWord}:`, err);
        list[nextWord].status = 'done';
        activeDownloads--;
        startQueuedDownloads();
      });
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.action === 'start') {
        sendResponse({ status: 'start' });
        const { words, lang, accent, limit, pattern, tag } = message;
        let _array = words.split(/\s*[,|\n]\s*/g).map(s => s.replace(/\s+/g, '_').trim()).filter(Boolean);
        _array.forEach(word => {
          if (!list[word]) {
            list[word] = { lang, accent, limit, pattern, tag, status: 'waiting' };
          }
        });
        startQueuedDownloads();
      }

      if (message.action === 'completed') {
        let word = message.word;
        chrome.tabs.remove(sender.tab.id);
        await downloading(message);
        sendResponse({ status: 'completed' });
      }

      if (message.action === '404') {
        let word = message.word;
        list[word].status = 'done';
        notFoundWords(word);
        chrome.tabs.remove(sender.tab.id);
        sendResponse({ status: '404' });
      }

      if (message.action === 'pause') {
        Object.keys(list).forEach(key => {
          if (list[key].status === 'waiting') list[key].status = 'paused';
        });
        sendResponse({ status: 'pause' });
      }

      if (message.action === 'continue') {
        Object.keys(list).forEach(key => {
          if (list[key].status === 'paused') list[key].status = 'waiting';
        });
        sendResponse({ status: 'continue' });
        startQueuedDownloads();
      }

      if (message.action === 'clear') {
        list = {};
        sendResponse({ status: 'clear' });
      }

      if (message.action === 'login') {
        chrome.tabs.update(sender.tab.id, { url: 'https://forvo.com/login/?start=false' }, function (tab) {
          chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
            if (tabId === tab.id && changeInfo.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(listener);
              chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['login.js']
              });
            }
          });
        });
        sendResponse({ status: 'login' });
      }

    } catch (error) {
      console.log('Error in onMessage handler:', error);
      sendResponse({ status: 'error', message: error.message });
    }
  })();
  return true;
});
