import { randomUUID } from 'node:crypto'
import { createDiningTablesTable, query } from '../crumblyx-db.js'

let schemaReady

function ensureSchema() {
  if (!schemaReady) {
    schemaReady = createDiningTablesTable().catch((error) => {
      schemaReady = undefined
      throw error
    })
  }
  return schemaReady
}

function json(response, status, body) {
  return response.status(status).json(body)
}

function isValidTable(table) {
  return typeof table.tableName === 'string'
    && table.tableName.trim().length > 0
    && table.tableName.trim().length <= 50
    && typeof table.tableType === 'string'
    && table.tableType.trim().length > 0
    && table.tableType.trim().length <= 50
    && Number.isInteger(table.seats)
    && table.seats >= 1
    && table.seats <= 1000
    && typeof table.available === 'boolean'
    && typeof table.image === 'string'
    && table.image.length <= 2_000_000
}

export default async function handler(request, response) {
  const { action } = request.query

  try {
    await ensureSchema()

    if (request.method === 'GET' && (!action || action === 'list')) {
      const result = await query(`
        SELECT id, table_name AS "tableName", table_type AS "tableType",
               seats, available, image
        FROM dining_tables
        ORDER BY table_name ASC
      `)
      return json(response, 200, result.rows)
    }

    if (request.method === 'POST' && action === 'create') {
      const table = request.body ?? {}
      if (!isValidTable(table)) {
        return json(response, 400, { error: 'Enter a table name, type, seat count, availability, and a valid image.' })
      }

      const result = await query(`
        INSERT INTO dining_tables (id, table_name, table_type, seats, available, image)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, table_name AS "tableName", table_type AS "tableType",
                  seats, available, image
      `, [
        randomUUID(),
        table.tableName.trim(),
        table.tableType.trim(),
        table.seats,
        table.available,
        table.image,
      ])
      return json(response, 201, result.rows[0])
    }

    if (request.method === 'PUT' && action === 'update') {
      const table = request.body ?? {}
      if (typeof table.id !== 'string' || !table.id || !isValidTable(table)) {
        return json(response, 400, { error: 'Enter a valid table id, name, type, seat count, availability, and image.' })
      }

      const result = await query(`
        UPDATE dining_tables
        SET table_name = $1, table_type = $2, seats = $3, available = $4, image = $5
        WHERE id = $6
        RETURNING id, table_name AS "tableName", table_type AS "tableType",
                  seats, available, image
      `, [
        table.tableName.trim(),
        table.tableType.trim(),
        table.seats,
        table.available,
        table.image,
        table.id,
      ])
      if (result.rowCount === 0) return json(response, 404, { error: 'Table not found.' })
      return json(response, 200, result.rows[0])
    }

    if (request.method === 'DELETE' && action === 'delete') {
      const id = request.query.id || request.body?.id
      if (typeof id !== 'string' || !id) {
        return json(response, 400, { error: 'Table id is required.' })
      }

      const result = await query('DELETE FROM dining_tables WHERE id = $1 RETURNING id', [id])
      if (result.rowCount === 0) return json(response, 404, { error: 'Table not found.' })
      return json(response, 200, { deleted: true, id })
    }

    return json(response, 405, { error: 'Method not allowed.' })
  } catch (error) {
    if (error.code === '23505') {
      return json(response, 409, { error: 'A table with that name already exists.' })
    }
    console.error('Tables API error:', error)
    return json(response, 500, { error: 'Database operation failed.' })
  }
}
