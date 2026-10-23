import dotenv from 'dotenv'
import pg from 'pg'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })
dotenv.config({ path: path.join(__dirname, '../.env.local'), override: false })

const { Pool } = pg
const connectionUrl = new URL(process.env.DATABASE_URL || '')
connectionUrl.searchParams.delete('sslmode')

export const pool = new Pool({
  connectionString: connectionUrl.toString(),
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000,
})

export async function query(text, params = []) {
  return pool.query(text, params)
}

export async function createMenuTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      category VARCHAR(50) NOT NULL,
      price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
      available BOOLEAN NOT NULL DEFAULT TRUE,
      image TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

export async function createStockTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS stock_items (
      id TEXT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      category VARCHAR(50) NOT NULL,
      quantity INTEGER CHECK (quantity >= 0),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

export async function createOrdersTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_name VARCHAR(100),
      customer_email VARCHAR(255),
      order_mode VARCHAR(20) NOT NULL CHECK (order_mode IN ('takeout', 'dine-in')),
      table_number VARCHAR(30),
      items JSONB NOT NULL CHECK (jsonb_typeof(items) = 'array'),
      total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
      status VARCHAR(20) NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'preparing', 'ready', 'completed')),
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await query('CREATE INDEX IF NOT EXISTS orders_status_created_at_idx ON orders (status, created_at DESC)')
}

const isDirectScript = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(__filename)

if (isDirectScript) {
  try {
    await createMenuTable()
    await createStockTable()
    await createOrdersTable()
    console.log('menu_items, stock_items, and orders tables created successfully')
  } catch (error) {
    console.error('Database setup failed:', error.message)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}
