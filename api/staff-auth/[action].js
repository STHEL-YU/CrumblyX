import { query } from '../crumblyx-db.js'
import {
  ensureStaffAuthSchema,
  getStaffSession,
  hashSessionToken,
  hashStaffPassword,
  requireStaffSession,
  SESSION_DURATION_SECONDS,
  sessionCookie,
  sessionToken,
  StaffAuthError,
  verifyStaffPassword,
} from './_helpers.js'

function json(response, status, body) {
  return response.status(status).json(body)
}

function validateCredentials(body) {
  if (typeof body?.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
    || body.email.trim().length > 255) {
    throw new StaffAuthError(400, 'Enter a valid email address.')
  }
  if (typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 128) {
    throw new StaffAuthError(400, 'Password must be between 8 and 128 characters.')
  }
  return { email: body.email.trim().toLowerCase(), password: body.password }
}

function handleError(error, response) {
  if (error instanceof StaffAuthError) return json(response, error.status, { error: error.message })
  console.error('Staff authentication error:', error)
  return json(response, 500, { error: 'Staff authentication failed.' })
}

export default async function handler(request, response) {
  const { action } = request.query
  try {
    await ensureStaffAuthSchema()

    if (request.method === 'POST' && action === 'login') {
      const credentials = validateCredentials(request.body)
      const result = await query(`
        SELECT id, email, password_hash
        FROM staff_accounts
        WHERE lower(email) = $1
      `, [credentials.email])
      const account = result.rows[0]
      if (!account || !await verifyStaffPassword(credentials.password, account.password_hash)) {
        throw new StaffAuthError(401, 'Email or password is incorrect.')
      }

      const token = sessionToken()
      await query('DELETE FROM staff_sessions WHERE expires_at <= CURRENT_TIMESTAMP')
      await query(`
        INSERT INTO staff_sessions (token_hash, staff_id, expires_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP + ($3 * INTERVAL '1 second'))
      `, [hashSessionToken(token), account.id, SESSION_DURATION_SECONDS])
      response.setHeader('Set-Cookie', sessionCookie(token))
      return json(response, 200, {
        staff: { email: account.email },
      })
    }

    if (request.method === 'GET' && action === 'session') {
      const staff = await getStaffSession(request)
      if (!staff) return json(response, 401, { error: 'Staff sign-in required.' })
      return json(response, 200, {
        staff: { email: staff.email },
      })
    }

    if (request.method === 'POST' && action === 'password') {
      const staff = await requireStaffSession(request, response)
      if (!staff) return
      const { currentPassword, newPassword } = request.body || {}
      if (typeof currentPassword !== 'string' || currentPassword.length < 8 || currentPassword.length > 128) {
        throw new StaffAuthError(400, 'Enter your current password.')
      }
      if (typeof newPassword !== 'string' || newPassword.length < 12 || newPassword.length > 128) {
        throw new StaffAuthError(400, 'New password must be between 12 and 128 characters.')
      }
      const accountResult = await query(
        'SELECT password_hash FROM staff_accounts WHERE id = $1',
        [staff.id],
      )
      const account = accountResult.rows[0]
      if (!account || !await verifyStaffPassword(currentPassword, account.password_hash)) {
        throw new StaffAuthError(401, 'Current password is incorrect.')
      }
      if (currentPassword === newPassword) {
        throw new StaffAuthError(400, 'Choose a new password different from your current password.')
      }
      await query(`
        UPDATE staff_accounts
        SET password_hash = $1, must_change_password = FALSE
        WHERE id = $2
      `, [await hashStaffPassword(newPassword), staff.id])
      await query(
        'DELETE FROM staff_sessions WHERE staff_id = $1 AND token_hash <> $2',
        [staff.id, staff.tokenHash],
      )
      return json(response, 200, { updated: true })
    }

    if (request.method === 'POST' && action === 'logout') {
      const staff = await getStaffSession(request)
      if (staff) await query('DELETE FROM staff_sessions WHERE token_hash = $1', [staff.tokenHash])
      response.setHeader('Set-Cookie', sessionCookie('', 0))
      return json(response, 200, { loggedOut: true })
    }

    return json(response, 405, { error: 'Method not allowed.' })
  } catch (error) {
    return handleError(error, response)
  }
}
