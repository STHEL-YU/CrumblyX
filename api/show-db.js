import dotenv from "dotenv";
import pg from "pg";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../.env.local"), override: false });

const { Pool } = pg;
const connectionUrl = new URL(process.env.DATABASE_URL || "");
connectionUrl.searchParams.delete("sslmode");

export const pool = new Pool({
  connectionString: connectionUrl.toString(),
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000,
});

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function getAndDisplayOrders() {
  try {
    const result = await query("SELECT * FROM orders");
    console.log("--- Orders Table Data ---");
    console.table(result.rows);
    return result.rows;
  } catch (error) {
    console.error("Error fetching orders:", error.message);
  } finally {
    await pool.end();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  getAndDisplayOrders();
}
