const fs = require('fs');
const puppeteer = require('puppeteer');
const request = require('request');

const imgRegex = /(\d{3})\.jp2\/portrait\/(\d+)$/;

let getNumPages = pagesText => {
  const pageMatches = /Page\s\d+\sof\s(\d+)/.exec(pagesText);
  return (pageMatches) ? parseInt(pageMatches[1]) : 1;
}

let imageUrlsOnPage = page => {
  return page.evaluate(() => {
    var arr = new Array();
    const nl = document.querySelectorAll('#BRtwopageview > img.BRpageimage.BRnoselect');
    [...nl].forEach((val) => {
      arr.push(val.uri);
    });

    return arr;
  });
}

let download = (uri, filename, callback) => {
  request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
}

let scrape = async(src_url) => {

  const browser = await puppeteer.launch({headless: true});

  const page = await browser.newPage();
  await page.setViewport( { 'width' : 3300, 'height' : 2200 } );
  await page.goto(src_url);
  await page.waitFor(1000);

  // find how many pages
  const numPageSelector = '#BRcurrentpageWrapper > span';

  const pagesText = await page.$eval(numPageSelector, (element) => {
      return element.innerHTML;
  });

  const numPages = getNumPages(pagesText);
  var urls = new Array();

  // start clicking through to load up all the pages
  for (var i=0; i<numPages / 2; i++) {
    await page.click('#BRpage > button.BRicon.book_right');
    await page.waitFor(500);

    const imgUrls = await imageUrlsOnPage(page);
    urls.push(...imgUrls);
  }

  browser.close();
  return urls;
};


const url = process.argv[2];
scrape(url).then((urls) => {

  for (var i=0; i<urls.length; i++) {
    const nameMatches = imgRegex.exec(urls[i]);

    const dest_dir = 'images';
    if (!fs.existsSync(dest_dir)){
      fs.mkdirSync(dest_dir);
    }

    const dest = `${dest_dir}/${nameMatches[1]}.jpg`;
    download(
      urls[i],
      dest,
      () => { console.log(`Download completed: ${dest}`); }
    );
  }
});

