import { randomUUID } from 'node:crypto'
import { pool, query } from '../crumblyx-db.js'

const ORDER_STATUSES = ['new', 'preparing', 'ready', 'completed']
const ADD_ON_PRICES = { caramel: 30, cream: 25, oat: 25 }

class RequestError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function json(response, status, body) {
  return response.status(status).json(body)
}

function normalizeOrder(row) {
  const createdAt = new Date(row.created_at)
  const orderType = row.order_mode === 'dine-in'
    ? `Table ${row.table_number || ''}`.trim()
    : 'Take out'
  return {
    id: row.id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    mode: row.order_mode,
    tableNumber: row.table_number,
    orderType,
    items: row.items,
    total: Number(row.total),
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    timeAgo: Number.isNaN(createdAt.getTime()) ? '' : createdAt.toLocaleString(),
  }
}

async function listOrders(response, customerId = null) {
  const result = await query(`
    SELECT id, customer_name, customer_email, order_mode, table_number,
           items, total, status, notes, created_at
    FROM orders
    WHERE ($1::text IS NULL OR customer_id = $1)
    ORDER BY created_at DESC
  `, [customerId])
  const orders = result.rows.map(normalizeOrder)
  const counts = Object.fromEntries(ORDER_STATUSES.map((status) => [status, 0]))
  for (const order of orders) counts[order.status] += 1
  counts.all = orders.length
  return json(response, 200, { orders, counts })
}

async function getOrder(id, response) {
  if (typeof id !== 'string' || !id) {
    throw new RequestError(400, 'Order id is required.')
  }
  const result = await query(`
    SELECT id, customer_name, customer_email, order_mode, table_number,
           items, total, status, notes, created_at
    FROM orders
    WHERE id = $1
  `, [id])
  if (result.rowCount === 0) throw new RequestError(404, 'Order not found.')
  return json(response, 200, normalizeOrder(result.rows[0]))
}

async function countOrders(response) {
  const result = await query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'new') AS "new",
      COUNT(*) FILTER (WHERE status = 'preparing') AS "preparing",
      COUNT(*) FILTER (WHERE status = 'ready') AS "ready",
      COUNT(*) FILTER (WHERE status = 'completed') AS "completed",
      COUNT(*) AS "all"
    FROM orders
  `)
  const counts = Object.fromEntries(
    Object.entries(result.rows[0]).map(([status, count]) => [status, Number(count)]),
  )
  return json(response, 200, { counts })
}

function validateCreateBody(body) {
  if (!body || !Array.isArray(body.items) || body.items.length === 0 || body.items.length > 50) {
    throw new RequestError(400, 'At least one valid order item is required.')
  }
  if (!['takeout', 'dine-in'].includes(body.mode)) {
    throw new RequestError(400, 'Order mode must be takeout or dine-in.')
  }
  if (body.mode === 'dine-in' && (typeof body.tableNumber !== 'string' || !body.tableNumber.trim())) {
    throw new RequestError(400, 'A table number is required for dine-in orders.')
  }
  for (const item of body.items) {
    if (typeof item.productId !== 'string' || !item.productId
      || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000
      || (item.customization != null && (typeof item.customization !== 'string' || item.customization.length > 500))
      || (item.customizationData != null && (
        typeof item.customizationData !== 'object'
        || Array.isArray(item.customizationData)
        || !['ICED', 'HOT'].includes(item.customizationData.coffeeType)
        || !['SMALL', 'MEDIUM', 'LARGE'].includes(item.customizationData.cupSize)
        || !['0%', '25%', '50%', '75%', '100%'].includes(item.customizationData.sugar)
        || !Array.isArray(item.customizationData.addonIds)
        || item.customizationData.addonIds.some((id) => !Object.hasOwn(ADD_ON_PRICES, id))
        || new Set(item.customizationData.addonIds).size !== item.customizationData.addonIds.length
      ))) {
      throw new RequestError(400, 'Order items must include a valid product and quantity.')
    }
  }
}

async function createOrder(body, response) {
  validateCreateBody(body)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const productIds = [...new Set(body.items.map((item) => item.productId))]
    const menuResult = await client.query(`
      SELECT id, name, category, price, available, image
      FROM menu_items
      WHERE id = ANY($1::text[])
      ORDER BY id
      FOR SHARE
    `, [productIds])
    const menuById = new Map(menuResult.rows.map((item) => [item.id, item]))
    if (menuById.size !== productIds.length) {
      throw new RequestError(400, 'One or more menu items no longer exist.')
    }
    for (const item of body.items) {
      if (!menuById.get(item.productId).available) {
        throw new RequestError(409, `${menuById.get(item.productId).name} is no longer available.`)
      }
    }

    const names = [...new Set(menuResult.rows.map((item) => item.name.trim().toLocaleLowerCase()))]
    const stockResult = await client.query(`
      SELECT id, name, quantity
      FROM stock_items
      WHERE id = ANY($1::text[])
         OR lower(trim(name)) = ANY($2::text[])
      ORDER BY id
      FOR UPDATE
    `, [productIds, names])
    const stockById = new Map(stockResult.rows.map((record) => [record.id, record]))
    const stockByName = new Map(stockResult.rows.map((record) => [
      String(record.name).trim().toLocaleLowerCase(),
      record,
    ]))
    const stockDeductions = new Map()
    const orderItems = body.items.map((item) => {
      const product = menuById.get(item.productId)
      const stock = stockById.get(product.id)
        || stockByName.get(product.name.trim().toLocaleLowerCase())
      if (stock?.quantity != null) {
        const requested = (stockDeductions.get(stock.id)?.quantity || 0) + item.quantity
        if (Number(stock.quantity) < requested) {
          throw new RequestError(409, `Not enough stock for ${product.name}.`)
        }
        stockDeductions.set(stock.id, { stock, quantity: requested })
      }
      const price = Number(product.price)
      let unitPrice = price
      if (item.customizationData) {
        if (product.category !== 'Beverages') {
          throw new RequestError(400, `${product.name} does not support customizations.`)
        }
        const sizeAdjustments = { SMALL: -20, MEDIUM: 0, LARGE: 30 }
        unitPrice += sizeAdjustments[item.customizationData.cupSize]
          + item.customizationData.addonIds.reduce((sum, id) => sum + ADD_ON_PRICES[id], 0)
      }
      return {
        id: randomUUID(),
        productId: product.id,
        name: product.name,
        quantity: item.quantity,
        price: Math.max(0, unitPrice),
        image: product.image || '',
        customization: item.customization || '',
        customizationData: item.customizationData || null,
        checked: false,
      }
    })

    for (const { stock, quantity } of stockDeductions.values()) {
      await client.query(
        'UPDATE stock_items SET quantity = quantity - $1 WHERE id = $2',
        [quantity, stock.id],
      )
    }

    const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const id = randomUUID()
    const customerName = typeof body.customerName === 'string'
      ? body.customerName.trim().slice(0, 100) || null
      : null
    const customerEmail = typeof body.customerEmail === 'string'
      ? body.customerEmail.trim().toLowerCase().slice(0, 255) || null
      : null
    let customerId = null
    if (customerEmail) {
      const customerResult = await client.query(`
        INSERT INTO customers (id, name, email)
        VALUES ($1, $2, $3)
        ON CONFLICT (email) DO UPDATE
        SET name = COALESCE(EXCLUDED.name, customers.name), updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `, [randomUUID(), customerName, customerEmail])
      customerId = customerResult.rows[0].id
    } else if (customerName) {
      const customerResult = await client.query(`
        INSERT INTO customers (id, name)
        VALUES ($1, $2)
        RETURNING id
      `, [randomUUID(), customerName])
      customerId = customerResult.rows[0].id
    }
    const result = await client.query(`
      INSERT INTO orders (
        id, customer_id, customer_name, customer_email, order_mode, table_number, items, total, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
      RETURNING id, customer_name, customer_email, order_mode, table_number,
                items, total, status, notes, created_at
    `, [
      id,
      customerId,
      customerName,
      customerEmail,
      body.mode,
      body.mode === 'dine-in' ? body.tableNumber.trim().slice(0, 30) : null,
      JSON.stringify(orderItems),
      total,
      typeof body.notes === 'string' ? body.notes.trim().slice(0, 2000) : '',
    ])
    await client.query('COMMIT')
    return json(response, 201, normalizeOrder(result.rows[0]))
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function updateOrder(body, response) {
  if (!body || typeof body.id !== 'string' || !body.id) {
    throw new RequestError(400, 'Order id is required.')
  }
  if (typeof body.status === 'string') {
    if (!ORDER_STATUSES.includes(body.status)) {
      throw new RequestError(400, 'Invalid order status.')
    }
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const currentResult = await client.query(
        'SELECT status, items FROM orders WHERE id = $1 FOR UPDATE',
        [body.id],
      )
      if (currentResult.rowCount === 0) throw new RequestError(404, 'Order not found.')
      const current = currentResult.rows[0]
      const nextByCurrent = { new: 'preparing', preparing: 'ready', ready: 'completed' }
      if (nextByCurrent[current.status] !== body.status) {
        throw new RequestError(409, 'Order status cannot be changed to that value.')
      }
      if (body.status === 'ready' && current.items.some((item) => !item.checked)) {
        throw new RequestError(409, 'Mark all order items prepared before setting the order ready.')
      }
      const result = await client.query(`
        UPDATE orders
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, customer_name, customer_email, order_mode, table_number,
                  items, total, status, notes, created_at
      `, [body.status, body.id])
      await client.query('COMMIT')
      return json(response, 200, normalizeOrder(result.rows[0]))
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  if (typeof body.itemId !== 'string' || typeof body.checked !== 'boolean') {
    throw new RequestError(400, 'Provide a valid order status or item preparation update.')
  }
  const result = await query(`
    UPDATE orders
    SET items = (
      SELECT jsonb_agg(
        CASE WHEN item->>'id' = $1 THEN jsonb_set(item, '{checked}', to_jsonb($2::boolean))
        ELSE item END
        ORDER BY position
      )
      FROM jsonb_array_elements(items) WITH ORDINALITY AS elements(item, position)
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
      AND status IN ('new', 'preparing')
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(items) AS element
        WHERE element->>'id' = $1
      )
    RETURNING id, customer_name, customer_email, order_mode, table_number,
              items, total, status, notes, created_at
  `, [body.itemId, body.checked, body.id])
  if (result.rowCount === 0) throw new RequestError(404, 'Order or editable order item not found.')
  return json(response, 200, normalizeOrder(result.rows[0]))
}

export default async function handler(request, response) {
  const { action } = request.query
  try {
    if (request.method === 'GET' && action === 'get') {
      return await getOrder(request.query.id, response)
    }
    if (request.method === 'GET' && action === 'count') {
      return await countOrders(response)
    }
    if (request.method === 'GET' && (!action || action === 'list')) {
      const customerId = request.query.customerId
      if (customerId !== undefined && (typeof customerId !== 'string' || !customerId)) {
        throw new RequestError(400, 'Customer id must be a non-empty string.')
      }
      return await listOrders(response, customerId || null)
    }
    if (request.method === 'POST' && action === 'create') {
      return await createOrder(request.body, response)
    }
    if (request.method === 'PUT' && action === 'update') {
      return await updateOrder(request.body, response)
    }
    return json(response, 405, { error: 'Method not allowed.' })
  } catch (error) {
    if (error instanceof RequestError) return json(response, error.status, { error: error.message })
    console.error('Orders API error:', error)
    return json(response, 500, { error: 'Order operation failed.' })
  }
}