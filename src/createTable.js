// src/createTable.js
function createTable(products) {
  const formatPrice = (value) =>
    value != null
      ? new Intl.NumberFormat("es-GT", {
          style: "currency",
          currency: "GTQ",
          minimumFractionDigits: 2,
        }).format(value)
      : "-";

  let table = `
  <table style="
    width: 100%;
    border-collapse: collapse;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: #ffffff;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  ">
    <thead style="background-color: #aedf3c; color: black;">
      <tr>
        <th style="padding: 12px 10px; text-align: left;">Nombre</th>
        <th style="padding: 12px 10px; text-align: left;">SKU</th>
        <th style="padding: 12px 10px; text-align: left;">Último Precio</th>
        <th style="padding: 12px 10px; text-align: left;">Penúltimo Precio</th>
        <th style="padding: 12px 10px; text-align: left;">Diferencia vs Penúltimo</th>
        <th style="padding: 12px 10px; text-align: left;">Precio Máximo</th>
        <th style="padding: 12px 10px; text-align: left;">Precio Mínimo</th>
      </tr>
    </thead>
    <tbody>
  `;

  products.forEach((p) => {
    const diff = parseFloat(p.diferencia_vs_penultimo || 0);
    const diffColor =
      diff < 0 ? "#16a34a" : diff > 0 ? "#dc2626" : "#6b7280";
    const diffSymbol = diff > 0 ? "▲" : diff < 0 ? "▼" : "•";

    table += `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 10px 8px; color: #111827; font-weight: 600;"><a href="${process.env.EXTERNAL_API_ENDPOINT + p.slug}/p">${p.name}</a></td>
        <td style="padding: 10px 8px; color: #111827; font-weight: 500;">${p.sku}</td>
        <td style="padding: 10px 8px; color: #111827;">${formatPrice(p.ultimo_precio)}</td>
        <td style="padding: 10px 8px; color: #374151;">${formatPrice(p.penultimo_precio)}</td>
        <td style="padding: 10px 8px; color: ${diffColor}; font-weight: 600;">
          ${diffSymbol} ${formatPrice(Math.abs(diff))}
        </td>
        <td style="padding: 10px 8px; color: #1d4ed8;">${formatPrice(p.precio_maximo)}</td>
        <td style="padding: 10px 8px; color: #047857;">${formatPrice(p.precio_minimo)}</td>
      </tr>
    `;
  });

  table += `
    </tbody>
  </table>
  `;

  return table;
}

module.exports = { createTable };
