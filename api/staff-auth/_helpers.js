import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { createStaffAuthTables, query } from '../crumblyx-db.js'

const scrypt = promisify(scryptCallback)
const SESSION_COOKIE = 'crumblyx_staff_session'
const SESSION_DURATION_SECONDS = 8 * 60 * 60
let schemaReady

export class StaffAuthError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function ensureStaffAuthSchema() {
  if (!schemaReady) {
    schemaReady = createStaffAuthTables().catch((error) => {
      schemaReady = undefined
      throw error
    })
  }
  return schemaReady
}

export async function hashStaffPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const digest = await scrypt(password, salt, 64)
  return `scrypt$${salt}$${digest.toString('hex')}`
}

export async function verifyStaffPassword(password, storedHash) {
  const [scheme, salt, digest] = String(storedHash || '').split('$')
  if (scheme !== 'scrypt' || !salt || !digest || !/^[a-f\d]{128}$/i.test(digest)) return false
  const expected = Buffer.from(digest, 'hex')
  const actual = await scrypt(password, salt, expected.length)
  return timingSafeEqual(expected, actual)
}

function cookieToken(request) {
  const cookie = request.headers.cookie || ''
  const entry = cookie.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
  return entry ? entry.slice(SESSION_COOKIE.length + 1) : ''
}

export function sessionCookie(token, maxAge = SESSION_DURATION_SECONDS) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${maxAge}${secure}`
}

export function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

export async function getStaffSession(request) {
  const token = cookieToken(request)
  if (!token) return null
  await ensureStaffAuthSchema()
  const result = await query(`
    SELECT account.id, account.email,
           session.token_hash AS "tokenHash"
    FROM staff_sessions AS session
    JOIN staff_accounts AS account ON account.id = session.staff_id
    WHERE session.token_hash = $1 AND session.expires_at > CURRENT_TIMESTAMP
  `, [hashSessionToken(token)])
  return result.rows[0] || null
}

export async function requireStaffSession(request, response) {
  const staff = await getStaffSession(request)
  if (!staff) {
    response.status(401).json({ error: 'Staff sign-in required.' })
    return null
  }
  return staff
}

export function sessionToken() {
  return randomBytes(32).toString('hex')
}

export { SESSION_DURATION_SECONDS }
