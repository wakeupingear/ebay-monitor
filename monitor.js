const { parse } = require('node-html-parser');
const fs = require('fs');
const { type } = require('os');
const axios = require('axios').default;

const info = JSON.parse(fs.readFileSync('info.json', 'utf8'));
const { email } = info;

if (!info.queries) {
    console.warn("No queries found in info.json");
    process.exit(1);
}

const calculatePrice = (...keys) => {
    const price = keys.reduce((acc, key) => {
        const price = key.replaceAll(",", "").match(/(\d+)(\.\d+)?/);
        if (price) {
            return acc + parseFloat(price[0]);
        }
        return acc;
    }, 0);
    return price;
}

const parseUrlParams = (url) => {
    const params = {};
    const urlParams = url.split("?")[1];
    if (urlParams) {
        urlParams.split("&").forEach((param) => {
            const [key, value] = param.split("=");
            params[key] = value;
        });
    }
    return params;
}

let urls = [];

Promise.all(info.queries.map(query => axios.get(query.url).then(result => result.data).then(body => {
    const { excludedTerms = [], maxPrice = 10000, url } = query;
    const { _nkw: searchTerm } = parseUrlParams(url);
    const formattedSearchTerm = searchTerm.replaceAll("+", " ");

    const root = parse(body);
    const resultList = root.querySelector('#srp-river-results').childNodes[0];
    if (!resultList) {
        console.log(`-- No results found for ${formattedSearchTerm} --`);
        return;
    }
    console.log(`-- Parsing ${resultList.childNodes.length} results for ${formattedSearchTerm} --`);

    let lastTitle = "";
    let reachedIndex = resultList.childNodes.length;
    resultList.childNodes.forEach((result, i) => {
        if (i > reachedIndex || !result) return;

        const priceHolder = result.querySelector('.s-item__price');
        if (!priceHolder) return;
        const price = priceHolder.childNodes[0].rawText;
        const shippingPriceHolder = result.querySelector('.s-item__shipping');
        const shippingPrice = shippingPriceHolder ? shippingPriceHolder.childNodes[0].rawText : "0";
        const title = result.querySelector('.s-item__title').childNodes[0].rawText.replace("NEW LISTING", "").toUpperCase();

        if (excludedTerms.some(term => title.includes(term.toUpperCase()))) return;

        const subtitle = result.querySelector('.s-item__subtitle');
        const subtitleText = subtitle ? subtitle.childNodes[0].rawText : "";
        if (subtitleText == "Parts Only") return;

        const priceKey = (price + title).toUpperCase();
        if (!lastTitle) lastTitle = priceKey;
        if (priceKey === query.lastTitle) {
            reachedIndex = i;
            return;
        }

        const priceValue = calculatePrice(price, shippingPrice);
        if (priceValue > maxPrice) return;
        //console.log(`${title} - ${priceValue}`);

        const itemLink = result.querySelector('.s-item__title').parentNode._rawAttrs.href;
        urls.push(itemLink);
    });
    query.lastTitle = lastTitle;
}).catch(err => {
    console.error(err);
})
)).then(() => {
    fs.writeFileSync('info.json', JSON.stringify(info, null, 4));

    if (urls.length) {
        console.log("-- Sending email --");
        console.log(urls);
    }

    console.log("-- Done --");
});