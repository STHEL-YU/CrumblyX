import { randomUUID } from 'node:crypto'
import { query } from '../crumblyx-db.js'

function json(response, status, body) {
  response.status(status).json(body)
}

export default async function handler(request, response) {
  const { action } = request.query

  try {
    if (request.method === 'GET' && (!action || action === 'list')) {
      const result = await query(`
        SELECT id, name, category, price, available, image
        FROM menu_items
        ORDER BY name ASC
      `)
      return json(response, 200, result.rows)
    }

    if (request.method === 'POST' && action === 'create') {
      const { id, name, category, price, available = true, image = '' } = request.body
      if (!name?.trim() || !category || !Number.isFinite(Number(price)) || Number(price) < 0) {
        return json(response, 400, { error: 'Valid name, category, and price are required.' })
      }

      const result = await query(`
        INSERT INTO menu_items (id, name, category, price, available, image)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, category, price, available, image
      `, [id || randomUUID(), name.trim(), category, Number(price), Boolean(available), image])
      return json(response, 201, result.rows[0])
    }

    if (request.method === 'PUT' && action === 'update') {
      const { id, name, category, price, available, image } = request.body
      if (!id || !name?.trim() || !category || !Number.isFinite(Number(price)) || Number(price) < 0) {
        return json(response, 400, { error: 'Valid id, name, category, and price are required.' })
      }

      const result = await query(`
        UPDATE menu_items
        SET name = $1, category = $2, price = $3, available = $4, image = $5
        WHERE id = $6
        RETURNING id, name, category, price, available, image
      `, [name.trim(), category, Number(price), Boolean(available), image || '', id])
      if (result.rowCount === 0) return json(response, 404, { error: 'Menu item not found.' })
      return json(response, 200, result.rows[0])
    }

    if (request.method === 'DELETE' && action === 'delete') {
      const id = request.query.id || request.body?.id
      if (!id) return json(response, 400, { error: 'Menu item id is required.' })

      const result = await query('DELETE FROM menu_items WHERE id = $1 RETURNING id', [id])
      if (result.rowCount === 0) return json(response, 404, { error: 'Menu item not found.' })
      return json(response, 200, { deleted: true, id })
    }

    return json(response, 405, { error: 'Method not allowed.' })
  } catch (error) {
    console.error('Menu API error:', error)
    return json(response, 500, { error: 'Database operation failed.' })
  }
}
