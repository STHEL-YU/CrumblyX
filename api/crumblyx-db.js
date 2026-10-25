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

export async function createCustomersTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name VARCHAR(100),
      email VARCHAR(255) UNIQUE,
      password_hash TEXT,
      phone VARCHAR(20),
      location VARCHAR(120),
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await query(`
    ALTER TABLE customers
      ADD COLUMN IF NOT EXISTS name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS password_hash TEXT,
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS location VARCHAR(120),
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
  `)
  await query("UPDATE customers SET status = 'active' WHERE status IS NULL")
  await query("ALTER TABLE customers ALTER COLUMN status SET DEFAULT 'active'")
  await query('ALTER TABLE customers ALTER COLUMN status SET NOT NULL')
  await query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'customers'::regclass AND conname = 'customers_status_check'
      ) THEN
        ALTER TABLE customers DROP CONSTRAINT customers_status_check;
      END IF;
    END $$
  `)
  await query(`
    ALTER TABLE customers
    ADD CONSTRAINT customers_status_check CHECK (status IN ('active', 'inactive'))
  `)
}

export async function createMessagesTable() {
  await createCustomersTable()
  await query(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('customer', 'staff')),
      message TEXT NOT NULL CHECK (length(trim(message)) > 0),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      read_at TIMESTAMP WITH TIME ZONE
    )
  `)
  await query(`
    ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS customer_id TEXT,
      ADD COLUMN IF NOT EXISTS sender_type VARCHAR(20) NOT NULL DEFAULT 'customer',
      ADD COLUMN IF NOT EXISTS message TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE
  `)
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'messages'::regclass AND conname = 'messages_customer_id_fkey'
      ) THEN
        ALTER TABLE messages
        ADD CONSTRAINT messages_customer_id_fkey
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
      END IF;
    END $$
  `)
  await query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'messages'::regclass AND conname = 'messages_sender_type_check'
      ) THEN
        ALTER TABLE messages DROP CONSTRAINT messages_sender_type_check;
      END IF;
    END $$
  `)
  await query(`
    ALTER TABLE messages
    ADD CONSTRAINT messages_sender_type_check CHECK (sender_type IN ('customer', 'staff'))
  `)
  await query('CREATE INDEX IF NOT EXISTS messages_customer_created_at_idx ON messages (customer_id, created_at ASC)')
}

export async function createOrdersTable() {
  await createCustomersTable()
  await query(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
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

  await query(`
    ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS customer_id TEXT,
      ADD COLUMN IF NOT EXISTS customer_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS order_mode VARCHAR(20) NOT NULL DEFAULT 'takeout',
      ADD COLUMN IF NOT EXISTS table_number VARCHAR(30),
      ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS total NUMERIC(10, 2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'new',
      ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
  `)
  await query(`
    INSERT INTO customers (id, name, email)
    SELECT 'legacy-' || md5(lower(trim(customer_email))), MAX(customer_name), lower(trim(customer_email))
    FROM orders
    WHERE customer_email IS NOT NULL AND trim(customer_email) <> ''
    GROUP BY lower(trim(customer_email))
    ON CONFLICT (email) DO NOTHING
  `)
  await query(`
    UPDATE orders AS order_record
    SET customer_id = customer.id
    FROM customers AS customer
    WHERE order_record.customer_id IS NULL
      AND order_record.customer_email IS NOT NULL
      AND lower(trim(order_record.customer_email)) = customer.email
  `)
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'orders'::regclass AND conname = 'orders_customer_id_fkey'
      ) THEN
        ALTER TABLE orders
        ADD CONSTRAINT orders_customer_id_fkey
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
      END IF;
    END $$
  `)
  await query(`UPDATE orders SET status = 'new' WHERE status IS NULL`)
  await query('ALTER TABLE orders ALTER COLUMN status SET DEFAULT \'new\'')
  await query('ALTER TABLE orders ALTER COLUMN status SET NOT NULL')
  await query(`
    DO $$
    DECLARE existing_constraint RECORD;
    BEGIN
      FOR existing_constraint IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'orders'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%status%'
      LOOP
        EXECUTE format('ALTER TABLE orders DROP CONSTRAINT %I', existing_constraint.conname);
      END LOOP;
    END $$
  `)
  await query(`
    ALTER TABLE orders
    ADD CONSTRAINT orders_status_check
    CHECK (status IN ('new', 'preparing', 'ready', 'completed'))
  `)
  await query('CREATE INDEX IF NOT EXISTS orders_status_created_at_idx ON orders (status, created_at DESC)')
}

const isDirectScript = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(__filename)

if (isDirectScript) {
  try {
    await createMenuTable()
    await createStockTable()
    await createCustomersTable()
    await createMessagesTable()
    await createOrdersTable()
    console.log('menu_items, stock_items, customers, messages, and orders tables created successfully')
  } catch (error) {
    console.error('Database setup failed:', error.message)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}
