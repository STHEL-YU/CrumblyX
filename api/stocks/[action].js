import { randomUUID } from 'node:crypto'
import { query } from '../crumblyx-db.js'

function json(response, status, body) {
  response.status(status).json(body)
}

function isValidStock(stock) {
  return typeof stock.name === 'string'
    && stock.name.trim().length > 0
    && stock.name.trim().length <= 100
    && typeof stock.category === 'string'
    && stock.category.trim().length > 0
    && stock.category.trim().length <= 50
    && (stock.quantity == null
      || (Number.isInteger(stock.quantity) && stock.quantity >= 0 && stock.quantity <= 1000000))
}

export default async function handler(request, response) {
  const { action } = request.query

  try {
    if (request.method === 'GET' && (!action || action === 'list')) {
      const result = await query(`
        SELECT id, name, category, quantity
        FROM stock_items
        ORDER BY name ASC
      `)
      return json(response, 200, result.rows)
    }

    if (request.method === 'POST' && action === 'create') {
      const stock = request.body ?? {}
      if (!isValidStock(stock)) {
        return json(response, 400, { error: 'Valid name, category, and stock quantity are required.' })
      }

      const result = await query(`
        INSERT INTO stock_items (id, name, category, quantity)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, category, quantity
      `, [
        typeof stock.id === 'string' && stock.id ? stock.id : randomUUID(),
        stock.name.trim(),
        stock.category.trim(),
        stock.quantity ?? null,
      ])
      return json(response, 201, result.rows[0])
    }

    if (request.method === 'PUT' && action === 'update') {
      const stock = request.body ?? {}
      if (typeof stock.id !== 'string' || !stock.id || !isValidStock(stock)) {
        return json(response, 400, { error: 'Valid id, name, category, and stock quantity are required.' })
      }

      const result = await query(`
        UPDATE stock_items
        SET name = $1, category = $2, quantity = $3
        WHERE id = $4
        RETURNING id, name, category, quantity
      `, [stock.name.trim(), stock.category.trim(), stock.quantity ?? null, stock.id])
      if (result.rowCount === 0) return json(response, 404, { error: 'Stock item not found.' })
      return json(response, 200, result.rows[0])
    }

    if (request.method === 'DELETE' && action === 'delete') {
      const id = request.query.id || request.body?.id
      if (typeof id !== 'string' || !id) {
        return json(response, 400, { error: 'Stock item id is required.' })
      }

      const result = await query('DELETE FROM stock_items WHERE id = $1 RETURNING id', [id])
      if (result.rowCount === 0) return json(response, 404, { error: 'Stock item not found.' })
      return json(response, 200, { deleted: true, id })
    }

    return json(response, 405, { error: 'Method not allowed.' })
  } catch (error) {
    console.error('Stocks API error:', error)
    return json(response, 500, { error: 'Database operation failed.' })
  }
}