// src/fetchExternalData.js
const fetch = require("node-fetch");
const cheerio = require("cheerio");

const EXTERNAL_API_ENDPOINT = process.env.EXTERNAL_API_ENDPOINT;

async function fetchExternalData(slug) {
  const productUrl = `${EXTERNAL_API_ENDPOINT}${slug}`;

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
  const $ = cheerio.load(html);

  const jsonLdScript = $('script[type="application/ld+json"]')
    .filter((i, el) => $(el).html().includes('"@type":"Product"'))
    .first()
    .html();

  if (!jsonLdScript) throw new Error("JSON-LD Product data block not found.");

  let productData;
  try {
    productData = JSON.parse(jsonLdScript);
  } catch {
    throw new Error("Invalid JSON-LD format.");
  }

  if (!productData.offers || productData.offers.length === 0) {
    throw new Error("Product offers block missing or empty.");
  }

  const price = parseFloat(productData.offers[0].price);
  const sku = productData.sku;
  const name = productData.name;

  return { price, sku, name };
}

module.exports = { fetchExternalData };
