// src/db.js
const { Client } = require("pg");

async function connectDB() {
  const CONNECTION_STRING = process.env.DB_CONNECTION_STRING;

  if (!CONNECTION_STRING) {
    throw new Error("Missing DB_CONNECTION_STRING environment variable.");
  }

  const client = new Client({
    connectionString: CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  return client;
}

module.exports = { connectDB };
