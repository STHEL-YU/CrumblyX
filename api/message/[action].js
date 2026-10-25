import { randomUUID } from 'node:crypto'
import { query } from '../crumblyx-db.js'

class RequestError extends Error {
	constructor(status, message) {
		super(message)
		this.status = status
	}
}

function json(response, status, body) {
	return response.status(status).json(body)
}

function messageInput(body) {
	if (!body || typeof body.customerId !== 'string' || !body.customerId.trim()) {
		throw new RequestError(400, 'Customer id is required.')
	}
	if (typeof body.message !== 'string' || !body.message.trim() || body.message.trim().length > 2000) {
		throw new RequestError(400, 'Message must be between 1 and 2000 characters.')
	}
	const senderType = body.senderType ?? 'customer'
	if (!['customer', 'staff'].includes(senderType)) {
		throw new RequestError(400, 'Sender type must be customer or staff.')
	}
	return {
		customerId: body.customerId.trim(),
		message: body.message.trim(),
		senderType,
	}
}

function handleError(error, response) {
	if (error instanceof RequestError) return json(response, error.status, { error: error.message })
	if (error.code === '23503') return json(response, 404, { error: 'Customer not found.' })
	console.error('Messages API error:', error)
	return json(response, 500, { error: 'Message operation failed.' })
}

export default async function handler(request, response) {
	const { action } = request.query

	try {
		if (request.method === 'GET' && action === 'list') {
			const customerId = request.query.customerId
			if (typeof customerId !== 'string' || !customerId.trim()) {
				throw new RequestError(400, 'Customer id is required.')
			}
			const result = await query(`
				SELECT id, customer_id AS "customerId", sender_type AS sender,
				       message AS text, created_at AS "createdAt", read_at AS "readAt"
				FROM messages
				WHERE customer_id = $1
				ORDER BY created_at ASC, id ASC
				LIMIT 200
			`, [customerId.trim()])
			return json(response, 200, { messages: result.rows })
		}

		if (request.method === 'GET' && action === 'conversations') {
			const result = await query(`
				SELECT customer.id AS "customerId", customer.name, customer.email,
				       latest.message AS preview, latest.sender_type AS "lastSender",
				       latest.created_at AS "lastMessageAt",
			       latest_order.id AS "orderId", latest_order.status AS "orderStatus",
			       latest_order.order_mode AS "orderMode", latest_order.table_number AS "tableNumber",
				       COUNT(unread.id)::int AS "unreadCount"
				FROM customers AS customer
				JOIN LATERAL (
					SELECT message, sender_type, created_at
					FROM messages
					WHERE customer_id = customer.id
					ORDER BY created_at DESC, id DESC
					LIMIT 1
				) AS latest ON TRUE
				LEFT JOIN LATERAL (
					SELECT id, status, order_mode, table_number
					FROM orders
					WHERE customer_id = customer.id
					ORDER BY created_at DESC, id DESC
					LIMIT 1
				) AS latest_order ON TRUE
				LEFT JOIN messages AS unread
					ON unread.customer_id = customer.id
					AND unread.sender_type = 'customer'
					AND unread.read_at IS NULL
				GROUP BY customer.id, latest.message, latest.sender_type, latest.created_at,
				         latest_order.id, latest_order.status, latest_order.order_mode, latest_order.table_number
				ORDER BY latest.created_at DESC
			`)
			return json(response, 200, { conversations: result.rows })
		}

		if (request.method === 'POST' && action === 'send') {
			const input = messageInput(request.body)
			const result = await query(`
				INSERT INTO messages (id, customer_id, sender_type, message)
				VALUES ($1, $2, $3, $4)
				RETURNING id, customer_id AS "customerId", sender_type AS sender,
				          message AS text, created_at AS "createdAt", read_at AS "readAt"
			`, [randomUUID(), input.customerId, input.senderType, input.message])
			return json(response, 201, { message: result.rows[0] })
		}

		if (request.method === 'PUT' && action === 'read') {
			const { customerId, readerType = 'customer' } = request.body || {}
			if (typeof customerId !== 'string' || !customerId.trim()) {
				throw new RequestError(400, 'Customer id is required.')
			}
			if (!['customer', 'staff'].includes(readerType)) {
				throw new RequestError(400, 'Reader type must be customer or staff.')
			}
			const result = await query(`
				UPDATE messages
				SET read_at = CURRENT_TIMESTAMP
				WHERE customer_id = $1 AND sender_type <> $2 AND read_at IS NULL
			`, [customerId.trim(), readerType])
			return json(response, 200, { updated: result.rowCount })
		}

		return json(response, 405, { error: 'Method not allowed.' })
	} catch (error) {
		return handleError(error, response)
	}
}
