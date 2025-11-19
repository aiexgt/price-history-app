// src/fetchExternalData.js
const fetch = require("node-fetch");
const cheerio = require("cheerio");


const EXTERNAL_API_ENDPOINT = process.env.EXTERNAL_API_ENDPOINT;


async function processProductDataFromHtml(htmlContent) {
  const $ = cheerio.load(htmlContent);


  const jsonLdScript = $('script[type="application/ld+json"]')
    .filter((i, el) => $(el).html().includes('"@type":"Product"'))
    .first()
    .html();

  if (!jsonLdScript) {
    throw new Error("JSON-LD Product data block not found in HTML.");
  }

  let productData;
  try {
    productData = JSON.parse(jsonLdScript);
  } catch (e) {
    console.error("Error parsing JSON-LD:", e);
    throw new Error("Invalid JSON-LD format.");
  }

  if (!productData.offers || productData.offers.length === 0) {
    throw new Error("Product offers block missing or empty in JSON-LD.");
  }

  const price = parseFloat(productData.offers.offers[0].price);

  const sku = productData.sku;

  const name = productData.name;

  return { price, sku, name };
}

async function fetchExternalData(slug) {
  const productUrl = `${EXTERNAL_API_ENDPOINT}${slug}/p`;
  
  const response = await fetch(productUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const html = await response.text();
  
  return processProductDataFromHtml(html);
}

module.exports = { fetchExternalData, processProductDataFromHtml };