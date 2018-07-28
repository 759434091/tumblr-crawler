const yaml = require('yamljs');
const request = require('superagent');
const fs = require('fs');
const cheerio = require('cheerio');

require('superagent-proxy')(request);

const crawlerProperties = yaml.parse(fs.readFileSync('./crawler.yml').toString());

const baseUrl = 'https://www.tumblr.com';
const cookie = crawlerProperties.crawler.cookie;
const userAgent = crawlerProperties.crawler.userAgent;
const firstUrl = crawlerProperties.crawler.firstUrl;

const agent = request
    .agent()
    .set('Cookie', cookie)
    .set('User-Agent', userAgent)

function sleep(time) {
    return new Promise(function (resolve) {
        setTimeout(function () {
            resolve();
        }, time);
    })
}

async function getPageImages(urlSet, pageNum, firstUrl, maxPage) {
    console.log(`${pageNum} now ${urlSet.size} urls`)
    const res = await agent
        .get(`${baseUrl}/svc${firstUrl}`)
        .proxy('http://127.0.0.1:1080')
        .catch(err => console.log(err));

    /** @namespace res.body.response.DashboardPosts */
    if (res != null &&
        res.hasOwnProperty('body') &&
        res.body.hasOwnProperty('response') &&
        res.body.response.hasOwnProperty('DashboardPosts') &&
        res.body.response.DashboardPosts.hasOwnProperty('body')) {
        const htmlStr = res.body.response.DashboardPosts.body;
        const $ = cheerio.load(htmlStr);
        const imgDivs = $('.post_media ').find('img');
        imgDivs.each((idx, ele) => {
            if (!ele.hasOwnProperty('attribs') ||
                ele.attribs.src == null) {
                return;
            }
            urlSet.add(ele.attribs.src);
        });
    } else {
        console.log(`get page ${pageNum} error`)
        let srcUrlArr = Array.from(urlSet)
        console.log(`${srcUrlArr.length} URLs`);
        fs.appendFile(`./urls.json`, JSON.stringify(srcUrlArr));
        return {srcUrlArr, nextPage: pageNum, firstUrl};
    }
    const nextUrl = res.headers['tumblr-old-next-page'];
    if (nextUrl == null) {
        debugger
    }
    if (pageNum >= maxPage) {
        let srcUrlArr = Array.from(urlSet)
        console.log(`${srcUrlArr.length} URLs`);
        fs.appendFile(`./urls.json`, JSON.stringify(srcUrlArr));
        return {srcUrlArr, nextPage: pageNum + 1, nextUrl};
    }
    await sleep(200);
    return await getPageImages(urlSet, ++pageNum, nextUrl, maxPage);
}

async function downloadImg(arr, idx) {
    if (idx >= arr.length) {
        return 'end img';
    }
    const url = arr[idx];
    const urlSplit = url.split('/');
    const fileName = `${urlSplit[urlSplit.length - 2]}_${urlSplit[urlSplit.length - 1]}`;
    if (!fs.existsSync('./pics/')) {
        fs.mkdirSync('./pics/')
    }
    const stream = fs.createWriteStream(`./pics/${fileName}`);
    await agent
        .get(url)
        .proxy('http://127.0.0.1:1080')
        .pipe(stream);
    await sleep(200);
    return await downloadImg(arr, ++idx);
}

async function mainEntry(pageNum, firstUrl, maxPage) {
    console.log(`starting ${pageNum} page`)
    if (pageNum >= 101 || firstUrl == null) {
        return `end Url ${firstUrl}`;
    }
    let res = await getPageImages(new Set(), pageNum, firstUrl, pageNum + maxPage - 1);
    await downloadImg(res.srcUrlArr, 0);
    return await mainEntry(res.nextPage, res.nextUrl, maxPage);
}

mainEntry(1, firstUrl, 10)
    .then(res => {
        console.log(res)
    });




