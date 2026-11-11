import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureStaffAuthSchema, hashStaffPassword } from './staff-auth/_helpers.js'
import { pool, query } from './crumblyx-db.js'

const isDirectScript = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))

if (isDirectScript) {
  try {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
    const password = process.env.ADMIN_PASSWORD
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
      throw new Error('Set ADMIN_EMAIL to a valid email address.')
    }
    if (!password || password.length < 8 || password.length > 128) {
      throw new Error('Set ADMIN_PASSWORD to a password between 8 and 128 characters.')
    }

    await ensureStaffAuthSchema()
    const result = await query(`
      INSERT INTO staff_accounts (id, email, password_hash, must_change_password)
      VALUES ($1, $2, $3, FALSE)
      ON CONFLICT (email) DO NOTHING
      RETURNING email
    `, [randomUUID(), email, await hashStaffPassword(password)])
    console.log(result.rowCount ? `Admin account created: ${email}` : `Account already exists: ${email}`)
  } catch (error) {
    console.error('Admin account setup failed:', error.message)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}
