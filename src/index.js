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
      FROM products p
      WHERE NOT EXISTS (
          SELECT 1
          FROM history h
          WHERE h.product_id = p.id
            AND DATE(h.created_at) = CURRENT_DATE
      );`);

    for (const product of products) {
      console.log(`Processing Product ID: ${product.id}, Slug: ${product.slug}`);

      try {
        const apiResponse = await fetchExternalData(product.slug);

        const insertQuery = `
          INSERT INTO history(product_id, sku, price, created_at, name)
          VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)
        `;
        const values = [product.id, apiResponse.sku, apiResponse.price, apiResponse.name];
        await client.query(insertQuery, values);

        console.log(`[OK] Inserted history for ${product.slug}.`);
        await delay(2000);
      } catch (err) {
        console.error(`[FETCH ERROR] ${product.slug}: ${err.message}`);
      }
    }

    const { rows: history } = await client.query(`
      WITH PreciosRecientes AS (
          SELECT
              p.id AS product_id,
              p.sku,
              p.slug,
              (SELECT h.price FROM history h WHERE h.product_id = p.id ORDER BY h.created_at DESC LIMIT 1) AS ultimo_precio,
              (SELECT h.price FROM history h WHERE h.product_id = p.id ORDER BY h.created_at DESC LIMIT 1 OFFSET 1) AS penultimo_precio
          FROM products p
      ),
      CalculosHistoricos AS (
          SELECT
              pr.sku,
              pr.ultimo_precio,
              pr.penultimo_precio,
              ROW_NUMBER() OVER (PARTITION BY pr.product_id ORDER BY pr.ultimo_precio DESC) AS rn,
              MAX(h.price) OVER (PARTITION BY h.product_id) AS precio_maximo,
              MIN(h.price) OVER (PARTITION BY h.product_id) AS precio_minimo,
              (SELECT h.name FROM history h WHERE h.product_id = pr.product_id ORDER BY h.created_at DESC LIMIT 1) AS name,
              pr.slug
          FROM PreciosRecientes pr
          INNER JOIN history h ON h.product_id = pr.product_id
      )
      SELECT
          ch.sku,
          ch.ultimo_precio,
          ch.penultimo_precio,
          (ch.ultimo_precio - ch.penultimo_precio) AS diferencia_vs_penultimo,
          ch.precio_maximo,
          ch.precio_minimo,
          ch.name,
          ch.slug
      FROM CalculosHistoricos ch
      WHERE ch.rn = 1
      ORDER BY ch.sku;
    `);

    const html = createTable(history);
    await sendEmail("Daily Product Price History", html);
    console.log("✅ Daily ingestion complete.");

  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await client.end();
  }
}

main();
