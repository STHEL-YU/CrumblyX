import dotenv from 'dotenv';
import pkg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

// Safely resolve the root directory path where .env.local is located
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load from root .env.local (or fall back to .env if your variable is in there)
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const { Pool } = pkg;

async function runTest() {
    console.log('Testing DATABASE_URL...');

    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL is missing! Make sure DATABASE_URL is defined inside your root .env.local or .env file.');
        return;
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false, // Required for Aiven SSL
        },
        connectionTimeoutMillis: 5000,
    });

    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();
        await pool.end();

        console.log('✅ Connection Successful!');
        console.log('Server Time:', result.rows[0].now);
    } catch (error) {
        console.error('❌ Connection Failed:', error.message);
    }
}

runTest();