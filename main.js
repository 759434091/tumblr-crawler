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
const maxPage = crawlerProperties.crawler.maxPage;

/**
 * 全局设置
 */
const agent = request
    .agent()
    .set('Cookie', cookie)
    .set('User-Agent', userAgent);

/**
 * 睡眠函数 防封
 * @param time 毫秒数
 * @returns {Promise<>} 没用
 */
function sleep(time) {
    return new Promise(function (resolve) {
        setTimeout(function () {
            resolve();
        }, time);
    })
}

/**
 * 图片url 递归
 * @param urlSet 去重用url Set
 * @param pageNum 页数
 * @param firstUrl 开始url
 * @param maxTurnPage 轮次最大页数
 * @returns {Promise<*>} 一堆递归用的数据
 */
async function getPageImages(urlSet, pageNum, firstUrl, maxTurnPage) {
    console.log(`${pageNum} now ${urlSet.size} urls`)
    const res = await agent
        .get(`${baseUrl}/svc${firstUrl}`)
        .proxy('http://127.0.0.1:1080') //代理地址， 不需要代理请去掉
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
    if (pageNum >= maxTurnPage) {
        let srcUrlArr = Array.from(urlSet)
        console.log(`${srcUrlArr.length} URLs`);
        fs.appendFile(`./urls.json`, JSON.stringify(srcUrlArr));
        return {srcUrlArr, nextPage: pageNum + 1, nextUrl};
    }
    await sleep(200);
    return await getPageImages(urlSet, ++pageNum, nextUrl, maxTurnPage);
}

/**
 * 下载图片递归入口
 * @param arr url数组
 * @param idx 递归索引
 * @returns {Promise<*>} 结束
 */
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
        .proxy('http://127.0.0.1:1080') //代理地址， 不需要代理请去掉
        .pipe(stream);
    await sleep(200);
    return await downloadImg(arr, ++idx);
}

/**
 * 轮次递归入口
 * @param pageNum 开始页数
 * @param firstUrl 递归开始url
 * @param maxTurnPage 轮次最大页数
 * @returns {Promise<*>} 本次结束位的下一次url
 */
async function mainEntry(pageNum, firstUrl, maxTurnPage) {
    console.log(`starting ${pageNum} page`)
    if (pageNum >= maxPage || firstUrl == null) {
        return `end Url ${firstUrl}`;
    }
    let res = await getPageImages(new Set(), pageNum, firstUrl, pageNum + maxTurnPage - 1);
    await downloadImg(res.srcUrlArr, 0);
    return await mainEntry(res.nextPage, res.nextUrl, maxTurnPage);
}

/**
 * 开始执行程序
 * 每轮爬取10页
 * 返回值为本次结束位的下一次url ( crawler.yml -> crawler.firstUrl )
 */
mainEntry(1, firstUrl, 10)
    .then(res => {
        console.log(res)
    });




