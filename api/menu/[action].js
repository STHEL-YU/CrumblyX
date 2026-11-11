import { randomUUID } from 'node:crypto'
import { pool, query } from '../crumblyx-db.js'
import { requireStaffSession } from '../staff-auth/_helpers.js'

function json(response, status, body) {
  response.status(status).json(body)
}

function validStockRecord(record) {
  return record
    && typeof record.id === 'string'
    && record.id.length > 0
    && typeof record.name === 'string'
    && record.name.trim().length > 0
    && record.name.trim().length <= 100
    && typeof record.category === 'string'
    && record.category.trim().length > 0
    && record.category.trim().length <= 50
    && (record.quantity == null
      || (Number.isInteger(record.quantity) && record.quantity >= 0 && record.quantity <= 1000000))
}

export default async function handler(request, response) {
  const { action } = request.query

  try {
    if (request.method !== 'GET' && !await requireStaffSession(request, response)) return

    if (request.method === 'GET' && (!action || action === 'list')) {
      const result = await query(`
        SELECT id, name, category, price, description, available, image
        FROM menu_items
        ORDER BY name ASC
      `)
      return json(response, 200, result.rows)
    }

    if (request.method === 'POST' && action === 'create') {
      const { id, name, category, price, description = '', available = true, image = '', stockRecords } = request.body
      if (!name?.trim() || !category || !Number.isFinite(Number(price)) || Number(price) < 0
        || typeof description !== 'string' || description.length > 500
        || (stockRecords !== undefined
          && (!Array.isArray(stockRecords) || stockRecords.length > 100 || stockRecords.some((record) => !validStockRecord(record))))) {
        return json(response, 400, { error: 'Valid name, category, price, and description are required.' })
      }

      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const result = await client.query(`
          INSERT INTO menu_items (id, name, category, price, description, available, image)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, name, category, price, description, available, image
        `, [id || randomUUID(), name.trim(), category, Number(price), description.trim(), Boolean(available), image])
        for (const record of stockRecords || []) {
          await client.query(`
            INSERT INTO stock_items (id, name, category, quantity)
            VALUES ($1, $2, $3, $4)
          `, [record.id, record.name.trim(), record.category.trim(), record.quantity ?? null])
        }
        await client.query('COMMIT')
        return json(response, 201, result.rows[0])
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    }

    if (request.method === 'PUT' && action === 'update') {
      const { id, name, category, price, description = '', available, image } = request.body
      if (!id || !name?.trim() || !category || !Number.isFinite(Number(price)) || Number(price) < 0
        || typeof description !== 'string' || description.length > 500) {
        return json(response, 400, { error: 'Valid id, name, category, price, and description are required.' })
      }

      const result = await query(`
        UPDATE menu_items
        SET name = $1, category = $2, price = $3, description = $4, available = $5, image = $6
        WHERE id = $7
        RETURNING id, name, category, price, description, available, image
      `, [name.trim(), category, Number(price), description.trim(), Boolean(available), image || '', id])
      if (result.rowCount === 0) return json(response, 404, { error: 'Menu item not found.' })
      return json(response, 200, result.rows[0])
    }

    if (request.method === 'DELETE' && action === 'delete') {
      const id = request.query.id || request.body?.id
      if (!id) return json(response, 400, { error: 'Menu item id is required.' })

      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const itemResult = await client.query(
          'SELECT id, name FROM menu_items WHERE id = $1 FOR UPDATE',
          [id],
        )
        if (itemResult.rowCount === 0) {
          await client.query('ROLLBACK')
          return json(response, 404, { error: 'Menu item not found.' })
        }
        await client.query('DELETE FROM menu_items WHERE id = $1', [id])
        let stockResult = await client.query(
          'DELETE FROM stock_items WHERE id = $1 RETURNING id, name, category, quantity',
          [id],
        )
        if (stockResult.rowCount === 0) {
          stockResult = await client.query(`
            DELETE FROM stock_items
            WHERE lower(trim(name)) = lower(trim($1))
            RETURNING id, name, category, quantity
          `, [itemResult.rows[0].name])
        }
        await client.query('COMMIT')
        return json(response, 200, { deleted: true, id, stockRecords: stockResult.rows })
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    }

    return json(response, 405, { error: 'Method not allowed.' })
  } catch (error) {
    console.error('Menu API error:', error)
    return json(response, 500, { error: 'Database operation failed.' })
  }
}
