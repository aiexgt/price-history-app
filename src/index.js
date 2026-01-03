// src/index.js
require("dotenv").config();
const { connectDB } = require("./db");
const { fetchExternalData } = require("./fetchExternalData");
const { sendEmail } = require("./emailService");
const { createTable } = require("./createTable");
const { delay } = require("./utils/delay");

async function main() {
  const client = await connectDB();
  console.log("Connected to database.");

  try {
    const { rows: products } = await client.query(`SELECT p.id, p.slug
      FROM products p;`);

    for (const product of products) {
      console.log(`Processing Product ID: ${product.id}, Slug: ${product.slug}`);

      try {
        const apiResponse = await fetchExternalData(product.slug);

        if (apiResponse.canBuy === true) {
          const html = createTable(apiResponse);
        await sendEmail(apiResponse.slug + ' YA SE PUEDE COMPRAR', html);
        }

        await delay(2000);
      } catch (err) {
        console.error(`[FETCH ERROR] ${product.slug}: ${err.message}`);
      }
    }

  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await client.end();
  }
}

main();
