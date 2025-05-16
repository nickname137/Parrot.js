
//https://forvo.com/word/snake/#en?accent=en_uk&start=true
async function params() {

  // Get the full pathname from the URL, e.g., "/word/snake/"
  const pathParts = window.location.pathname.split('/').filter(Boolean); // removes empty strings

  // Find the word after "word"
  const wordIndex = pathParts.indexOf('word');

  let word = wordIndex !== -1 ? pathParts[wordIndex + 1] : null;
  word = decodeURIComponent(word);  

  // Get the hash part and parse it
  const hash = window.location.hash.substring(1); // remove the '#'
  const [lang, queryString] = hash.split('?');
  const queryParams = new URLSearchParams(queryString || '');

  const accent = queryParams.get('accent');
  const start = queryParams.get('start');
  const limit = queryParams.get('limit');
  const pattern = queryParams.get('pattern');

  let tag = queryParams.get('tag');
  tag = decodeURIComponent(tag);

  console.log('pattern:', pattern);

  return { word, accent, lang, start, limit, pattern, tag };

}


async function viewAll(accent) {

  const maxAttempts = 10;
  const delay = 1000; // milliseconds between attempts

  const showMore = document.getElementById('show-more-pronunciations-' + accent);
  const showLess = document.getElementById('show-less-pronunciations-' + accent);


  if (!showMore || !showLess) {
    console.log('One or both elements not found.');
    return undefined;
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`Attempt ${attempt}: clicking 'show-more'...`);
    showMore.click();

    // Wait for a short delay before checking style
    await new Promise(resolve => setTimeout(resolve, delay));

    const isShown = showMore.style.display === 'none';

    if (isShown) {
      console.log('Click successful and style changed.');
      return true;
    } else {
      console.log('Style did not change, retrying...');
    }
  }

  console.log('Click failed after ' + maxAttempts + ' attempts.');
  return false;

}


async function sender(action, obj){

    obj.action = action;

    const response = await chrome.runtime.sendMessage(obj);
        
    console.log('response:', response);

}


async function search(){

    let obj = await params();

    let { start, lang, accent, limit } = obj;

    //console.log('start:', accent, lang, start, word, limit, pattern);

    if(start === 'true'){

        //check login
        let access = document.querySelector('.access') ? false : true ;

        console.log('access:', access);

        if(access){

            //word is not found
            if( document.querySelector('.title_holder').textContent.trim() === '404 - Page not found' ){
                sender('404', obj);
                return;
            }

            //filter-en-en_usa
            //filter-ru
            const checkbox = document.querySelector('#filter-' + lang);

            let delay = 0;

            if (checkbox) {
                checkbox.click();
                console.log('click on checkbox!');
                delay = 1000;
            }

            setTimeout( async () => {

                let ids = [];
                let selector = `#pronunciations-list-${accent} div[id^="play_"]`;

                if(document.querySelector(selector)){

                    await viewAll(accent);

                    ids = Array.from(document.querySelectorAll(selector));
    
                    //console.log('ids.length:', ids.length, '; limit:', limit)

                    if (ids.length > limit)
                        ids.length = limit;

                    ids = ids.map(div => parseInt(div.id.replace('play_', ''))).filter(Number.isFinite);

                    console.log('ids:', ids)

                    obj.ids = ids;              

                }


                //console.log('ids:', ids);                

                (ids.length > 0) ? sender('completed', obj) : sender('404', obj);

            }, delay);
         
        }

        else{

            //login needed
            sender('login', obj)

        }
    
    }

}

search();

