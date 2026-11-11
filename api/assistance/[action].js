import { randomUUID } from 'node:crypto'
import { query } from '../crumblyx-db.js'
import { requireStaffSession } from '../staff-auth/_helpers.js'

let schemaReady

function ensureSchema() {
  if (!schemaReady) {
    schemaReady = query(`
      CREATE TABLE IF NOT EXISTS staff_assistance_calls (
        id TEXT PRIMARY KEY,
        table_number VARCHAR(30) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'assisted')),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        assisted_at TIMESTAMP WITH TIME ZONE
      )
    `)
      .then(() => query(`
        CREATE UNIQUE INDEX IF NOT EXISTS staff_assistance_one_pending_per_table_idx
        ON staff_assistance_calls (table_number)
        WHERE status = 'pending'
      `))
      .catch((error) => {
        schemaReady = undefined
        throw error
      })
  }
  return schemaReady
}

function json(response, status, body) {
  return response.status(status).json(body)
}

export default async function handler(request, response) {
  const action = request.query.action
  try {
    await ensureSchema()

    if (request.method === 'POST' && action === 'create') {
      const tableNumber = request.body?.tableNumber
      if (typeof tableNumber !== 'string' || !tableNumber.trim() || tableNumber.trim().length > 30) {
        return json(response, 400, { error: 'A valid table number is required.' })
      }

      const result = await query(`
        INSERT INTO staff_assistance_calls (id, table_number)
        VALUES ($1, $2)
        ON CONFLICT (table_number) WHERE status = 'pending' DO NOTHING
        RETURNING id, table_number AS "tableNumber", status,
                  created_at AS "createdAt"
      `, [randomUUID(), tableNumber.trim()])
      if (result.rowCount > 0) return json(response, 201, result.rows[0])

      const existing = await query(`
        SELECT id, table_number AS "tableNumber", status,
               created_at AS "createdAt"
        FROM staff_assistance_calls
        WHERE table_number = $1 AND status = 'pending'
      `, [tableNumber.trim()])
      if (existing.rowCount === 0) {
        return json(response, 409, { error: 'Could not create the assistance call. Please try again.' })
      }
      return json(response, 200, existing.rows[0])
    }

    if (!await requireStaffSession(request, response)) return

    if (request.method === 'GET' && (!action || action === 'list')) {
      const result = await query(`
        SELECT id, table_number AS "tableNumber", status,
               created_at AS "createdAt"
        FROM staff_assistance_calls
        WHERE status = 'pending'
        ORDER BY created_at ASC
      `)
      return json(response, 200, { calls: result.rows })
    }

    if (request.method === 'POST' && action === 'assisted') {
      const id = request.body?.id
      if (typeof id !== 'string' || !id) {
        return json(response, 400, { error: 'Assistance call id is required.' })
      }
      const result = await query(`
        UPDATE staff_assistance_calls
        SET status = 'assisted', assisted_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND status = 'pending'
        RETURNING id
      `, [id])
      if (result.rowCount === 0) {
        return json(response, 404, { error: 'Active assistance call not found.' })
      }
      return json(response, 200, { assisted: true })
    }

    return json(response, 405, { error: 'Method not allowed.' })
  } catch (error) {
    console.error('Assistance API error:', error)
    return json(response, 500, { error: 'Could not process the assistance request.' })
  }
}
