// src/fetchExternalData.js
const fetch = require("node-fetch");
const cheerio = require("cheerio");

const EXTERNAL_API_ENDPOINT = process.env.EXTERNAL_API_ENDPOINT;

async function fetchExternalData(slug) {
  const productUrl = `${EXTERNAL_API_ENDPOINT}precios_stock_detallado/${slug}`;

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

  // 1. Unimos todos los scripts en una sola cadena y limpiamos escapes de comillas
  let fullScriptText = "";
  $("script").each((i, el) => {
    fullScriptText += $(el).html();
  });
  
  // Limpiamos los escapes de barras invertidas para que el texto sea legible por RegEx
  const cleanData = fullScriptText.replace(/\\"/g, '"');

  // 2. Extraer Nombre (Busca Descripcion)
  // Usamos [^"]+ para capturar todo hasta la siguiente comilla
  const nameMatch = cleanData.match(/"Descripcion":"([^"]+)"/);
  const name = nameMatch ? nameMatch[1] : null;

  // 3. Extraer Precio Normal
  const priceMatch = cleanData.match(/"PrecioNormal":(\d+)/);
  const price = priceMatch ? parseFloat(priceMatch[1]) : 0;

  // 4. Extraer SKU (Codigo)
  const skuMatch = cleanData.match(/"Codigo":"([^"]+)"/);
  const sku = skuMatch ? skuMatch[1] : slug;

  // 5. Lógica de Compra (Stock)
  // Buscamos la presencia de "EnBodega":true o si el array de Existencia tiene contenido
  const hasBodega = cleanData.includes('"EnBodega":true');
  
  // Para saber si Existencia no está vacío, buscamos si hay llaves de objetos dentro [ { ... } ]
  // Si está vacío se ve como "Existencia":[]
  const hasStoreStock = cleanData.includes('"Existencia":[{'); 
  
  const canBuy = hasBodega || hasStoreStock;

  // Validación final
  if (!name) {
    throw new Error("No se pudo extraer la información. El producto podría no existir o el formato cambió.");
  }

  return { 
    name,
    price, 
    sku, 
    canBuy,
    slug
  };
}

module.exports = { fetchExternalData };