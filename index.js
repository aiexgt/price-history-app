const { Client } = require("pg");
const fetch = require("node-fetch");
const dotenv = require("dotenv");
const cheerio = require('cheerio');
dotenv.config();

const EXTERNAL_API_ENDPOINT = process.env.EXTERNAL_API_ENDPOINT;

main = async (args) => {
  const CONNECTION_STRING = process.env.DB_CONNECTION_STRING;
  let client;

  if (!CONNECTION_STRING) {
    console.error("ERROR: Missing DB_CONNECTION_STRING environment variable.");
    return { statusCode: 500, body: "Missing connection string." };
  }

  console.log("Connecting to the database...");
  client = new Client({
    connectionString: CONNECTION_STRING,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    console.log("Connected to the database.");

    const productsResult = await client.query("SELECT id, slug FROM products;"); 

    for (const product of productsResult.rows) {
      console.log(`Product ID: ${product.id}, Slug: ${product.slug}`);

      try {
        const apiResponse = await fetchExternalData(product.slug);

        const insertText = `
          INSERT INTO history(product_id, sku, price, active, created_at) 
          VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        `;
        const insertValues = [
          product.id,
          apiResponse.sku,
          apiResponse.price,
          true
        ];
        
        await client.query(insertText, insertValues);

        console.log(`[SUCCESS] Inserted history for Product ID ${product.id}. SKU: ${apiResponse.sku}, Price: ${apiResponse.price}`);

      } catch (fetchError) {
        console.error(`[FETCH ERROR] Failed to process ${product.slug}: ${fetchError.message}`);
      }
    }

    console.log("Daily ingestion complete.");

  } catch (dbError) {
    console.error("Database connection error:", dbError.message);
  } finally {
    if (client) {
        await client.end();
    }
  }
};

fetchExternalData = async (slug) => {
  const productUrl = `${EXTERNAL_API_ENDPOINT}${slug}`; 

  const response = await fetch(productUrl, {
    method: "GET",
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

    const jsonLdScript = $('script[type="application/ld+json"]').filter((i, el) => {
        const content = $(el).html();
        return content && content.includes('"@type":"Product"');
    }).first().html();

    if (!jsonLdScript) {
        throw new Error("JSON-LD Product data block not found in HTML.");
    }
    
    let productData;
    try {
        productData = JSON.parse(jsonLdScript);
    } catch (e) {
        console.error("Failed to parse JSON-LD:", e);
        throw new Error("Invalid JSON-LD format.");
    }

    const price = parseFloat(productData.offers[0].price); 
    const sku = productData.sku;

    return { price, sku };
}

main();