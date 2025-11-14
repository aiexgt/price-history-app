const { Client } = require("pg");
const fetch = require("node-fetch");
const dotenv = require("dotenv");
const cheerio = require("cheerio");
const nodemailer = require("nodemailer");

dotenv.config();

const EXTERNAL_API_ENDPOINT = process.env.EXTERNAL_API_ENDPOINT;

async function sendEmail(subject, htmlContent) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const emailAddresses = process.env.EMAIL_TO.split(',').map(email => email.trim());

  for (const email of emailAddresses) {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO,
      subject: subject,
      html: htmlContent,
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error("Error sending email:", error.message);
    }
  }
}

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
        const insertValues = [product.id, apiResponse.sku, apiResponse.price, true];

        await client.query(insertText, insertValues);

        console.log(
          `[SUCCESS] Inserted history for Product ID ${product.id}. SKU: ${apiResponse.sku}, Price: ${apiResponse.price}`
        );
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (fetchError) {
        console.error(`[FETCH ERROR] Failed to process ${product.slug}: ${fetchError.message}`);
      }
    }

    const history = await client.query(`WITH PreciosRecientes AS (
          SELECT
              p.id AS product_id,
              p.sku,
              (SELECT h.price FROM history h WHERE h.product_id = p.id ORDER BY h.created_at DESC LIMIT 1) AS ultimo_precio,
              (SELECT h.price FROM history h WHERE h.product_id = p.id ORDER BY h.created_at DESC LIMIT 1 OFFSET 1) AS penultimo_precio
          FROM
              products p
      ),
      CalculosHistoricos AS (
          SELECT
              pr.sku,
              pr.ultimo_precio,
              pr.penultimo_precio,
              ROW_NUMBER() OVER (PARTITION BY pr.product_id ORDER BY pr.ultimo_precio DESC) AS rn,
              MAX(h.price) OVER (PARTITION BY h.product_id) AS precio_maximo,
              MIN(h.price) OVER (PARTITION BY h.product_id) AS precio_minimo
          FROM
              PreciosRecientes pr
          INNER JOIN
              history h ON h.product_id = pr.product_id
      )
      SELECT
          ch.sku,
          ch.ultimo_precio,
          ch.penultimo_precio,
          (ch.ultimo_precio - ch.penultimo_precio) AS diferencia_vs_penultimo,
          ch.precio_maximo,
          ch.precio_minimo
      FROM
          CalculosHistoricos ch
      WHERE
          ch.rn = 1
      ORDER BY
          ch.sku; `);

    const emailContent = createTable(history.rows);

    await sendEmail("Daily Product Price History", emailContent);

    console.log("Daily ingestion complete.");
  } catch (dbError) {
    console.error("Database connection error:", dbError.message);
  } finally {
    if (client) {
      await client.end();
    }
  }
};

createTable = (products) => {
  let table = `
  <html>
    <body>
    <table border='1'><tr><th>SKU</th><th>Último Precio</th><th>Penúltimo Precio</th><th>Diferencia vs Penúltimo</th><th>Precio Máximo</th><th>Precio Mínimo</th></tr>`;

  products.forEach((product) => {
    table += `<tr>
      <td>${product.sku}</td>
      <td>${product.ultimo_precio}</td>
      <td>${product.penultimo_precio}</td>
      <td>${product.diferencia_vs_penultimo}</td>
      <td>${product.precio_maximo}</td>
      <td>${product.precio_minimo}</td>
    </tr>`;
  });

  table += `</table>
    </body>
  </html>`;
  return table;
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

  const jsonLdScript = $('script[type="application/ld+json"]')
    .filter((i, el) => {
      const content = $(el).html();
      return content && content.includes('"@type":"Product"');
    })
    .first()
    .html();

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

  if (!productData.offers || productData.offers.length === 0) {
    throw new Error("Product data offers block not found or empty.");
  }

  const price = parseFloat(productData.offers[0].price);
  const sku = productData.sku;

  return { price, sku };
};

main();
