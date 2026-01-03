// src/createTable.js (puedes renombrar el archivo a createEmail.js)
function createTable(product) {
  const formatPrice = (value) =>
    value != null
      ? new Intl.NumberFormat("es-GT", {
          style: "currency",
          currency: "GTQ",
          minimumFractionDigits: 2,
        }).format(value)
      : "-";

  // Buscamos el producto que disparó la alerta de compra
  const p = product;

  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      
      ${p.canBuy ? `
        <div style="text-align: center; background-color: #16a34a; color: white; padding: 40px 20px; border-radius: 15px; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 42px; letter-spacing: 2px;">¡YA SE PUEDE COMPRAR!</h1>
        </div>
      ` : ''}

      <div style="background-color: #f3f4f6; padding: 25px; border-radius: 12px; border: 1px solid #e5e7eb;">
        <h2 style="margin-top: 0; color: #111827; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
          Detalles del Producto
        </h2>
        
        <p style="font-size: 18px; margin: 15px 0;">
          <strong style="color: #4b5563;">Nombre:</strong><br>
          <span style="font-weight: 600; color: #111827;">${p.name}</span>
        </p>

        <p style="font-size: 18px; margin: 15px 0;">
          <strong style="color: #4b5563;">SKU:</strong><br>
          <span style="font-family: monospace; background: #ddd; padding: 2px 5px; border-radius: 4px;">${p.sku}</span>
        </p>

        <p style="font-size: 24px; margin: 20px 0; color: #1d4ed8; font-weight: bold;">
          Precio: ${formatPrice(p.price)}
        </p>

        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.EXTERNAL_API_ENDPOINT}precios_stock_detallado/${p.slug}" 
             style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; font-size: 18px; font-weight: bold; border-radius: 8px; display: inline-block;">
             VER PRODUCTO EN TIENDA
          </a>
        </div>
      </div>

      <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 20px;">
        Este es un aviso automático de disponibilidad de stock.
      </p>
    </div>
  `;
}

module.exports = { createTable };