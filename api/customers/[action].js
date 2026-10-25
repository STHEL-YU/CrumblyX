import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { query } from '../crumblyx-db.js'

const scrypt = promisify(scryptCallback)

class RequestError extends Error {
	constructor(status, message) {
		super(message)
		this.status = status
	}
}

function json(response, status, body) {
	return response.status(status).json(body)
}

function validateCustomer(body) {
	if (!body || typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 100) {
		throw new RequestError(400, 'Customer name is required and must be at most 100 characters.')
	}
	if (typeof body.email !== 'string' || body.email.trim().length > 255
		|| !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
		throw new RequestError(400, 'A valid customer email is required.')
	}
	if (typeof body.phone !== 'string' || !/^09\d{2}\s?\d{3}\s?\d{4}$/.test(body.phone.trim())) {
		throw new RequestError(400, 'Enter a valid PH mobile number, such as 0917 123 4567.')
	}
	if (typeof body.location !== 'string' || !body.location.trim() || body.location.trim().length > 120) {
		throw new RequestError(400, 'Customer location is required and must be at most 120 characters.')
	}
	const status = body.status ?? 'active'
	if (!['active', 'inactive'].includes(status)) {
		throw new RequestError(400, 'Customer status must be active or inactive.')
	}

	return {
		name: body.name.trim(),
		email: body.email.trim().toLowerCase(),
		phone: body.phone.trim(),
		location: body.location.trim(),
		status,
	}
}

function handleError(error, response) {
	if (error instanceof RequestError) return json(response, error.status, { error: error.message })
	if (error.code === '23505') return json(response, 409, { error: 'That email address is already assigned to another customer.' })
	console.error('Customers API error:', error)
	return json(response, 500, { error: 'Customer operation failed.' })
}

function validateCredentials(body, requireName = false) {
	if (!body || typeof body.email !== 'string'
		|| !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
		|| body.email.trim().length > 255) {
		throw new RequestError(400, 'Enter a valid email address.')
	}
	if (typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 128) {
		throw new RequestError(400, 'Password must be between 8 and 128 characters.')
	}
	if (requireName && (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 100)) {
		throw new RequestError(400, 'Name is required and must be at most 100 characters.')
	}
	return {
		name: typeof body.name === 'string' ? body.name.trim() : '',
		email: body.email.trim().toLowerCase(),
		password: body.password,
	}
}

async function hashPassword(password) {
	const salt = randomBytes(16).toString('hex')
	const digest = await scrypt(password, salt, 64)
	return `scrypt$${salt}$${digest.toString('hex')}`
}

async function verifyPassword(password, storedHash) {
	const [scheme, salt, digest] = String(storedHash || '').split('$')
	if (scheme !== 'scrypt' || !salt || !digest || !/^[a-f\d]{128}$/i.test(digest)) return false
	const expected = Buffer.from(digest, 'hex')
	const actual = await scrypt(password, salt, expected.length)
	return timingSafeEqual(expected, actual)
}

export default async function handler(request, response) {
	const { action } = request.query

	try {
		if (request.method === 'POST' && action === 'register') {
			const credentials = validateCredentials(request.body, true)
			const passwordHash = await hashPassword(credentials.password)
			const result = await query(`
				INSERT INTO customers (id, name, email, password_hash, status)
				VALUES ($1, $2, $3, $4, 'active')
				RETURNING id, name, email, status
			`, [randomUUID(), credentials.name, credentials.email, passwordHash])
			return json(response, 201, { customer: result.rows[0] })
		}

		if (request.method === 'POST' && action === 'login') {
			const credentials = validateCredentials(request.body)
			const result = await query(`
				SELECT id, name, email, password_hash, status
				FROM customers
				WHERE lower(email) = $1
			`, [credentials.email])
			const customer = result.rows[0]
			if (!customer || customer.status !== 'active'
				|| !await verifyPassword(credentials.password, customer.password_hash)) {
				throw new RequestError(401, 'Email or password is incorrect.')
			}
			const { password_hash, ...publicCustomer } = customer
			return json(response, 200, { customer: publicCustomer })
		}

		if (request.method === 'GET' && (!action || action === 'list')) {
			const result = await query(`
				SELECT id, name, email, phone, location, status, created_at AS "joinedAt"
				FROM customers
				ORDER BY created_at DESC, name ASC
			`)
			return json(response, 200, result.rows)
		}

		if (request.method === 'GET' && action === 'get') {
			const { id, email } = request.query
			if ((!id || typeof id !== 'string') && (!email || typeof email !== 'string')) {
				throw new RequestError(400, 'Customer id or email is required.')
			}
			const result = await query(`
				SELECT id, name, email, phone, location, status, created_at AS "joinedAt"
				FROM customers
				WHERE ($1::text IS NOT NULL AND id = $1)
					 OR ($2::text IS NOT NULL AND lower(email) = lower($2))
				LIMIT 1
			`, [id || null, email || null])
			if (result.rowCount === 0) throw new RequestError(404, 'Customer not found.')
			return json(response, 200, result.rows[0])
		}

		if (request.method === 'POST' && action === 'create') {
			const customer = validateCustomer(request.body)
			const result = await query(`
				INSERT INTO customers (id, name, email, phone, location, status)
				VALUES ($1, $2, $3, $4, $5, $6)
				RETURNING id, name, email, phone, location, status, created_at AS "joinedAt"
			`, [randomUUID(), customer.name, customer.email, customer.phone, customer.location, customer.status])
			return json(response, 201, result.rows[0])
		}

		if (request.method === 'PUT' && action === 'update') {
			if (typeof request.body?.id !== 'string' || !request.body.id.trim()) {
				throw new RequestError(400, 'Customer id is required.')
			}
			const customer = validateCustomer(request.body)
			const result = await query(`
				UPDATE customers
				SET name = $1, email = $2, phone = $3, location = $4, status = $5,
						updated_at = CURRENT_TIMESTAMP
				WHERE id = $6
				RETURNING id, name, email, phone, location, status, created_at AS "joinedAt"
			`, [customer.name, customer.email, customer.phone, customer.location, customer.status, request.body.id.trim()])
			if (result.rowCount === 0) throw new RequestError(404, 'Customer not found.')
			return json(response, 200, result.rows[0])
		}

		if (request.method === 'DELETE' && action === 'delete') {
			const id = request.query.id || request.body?.id
			if (typeof id !== 'string' || !id.trim()) {
				throw new RequestError(400, 'Customer id is required.')
			}
			const result = await query('DELETE FROM customers WHERE id = $1 RETURNING id', [id.trim()])
			if (result.rowCount === 0) throw new RequestError(404, 'Customer not found.')
			return json(response, 200, { deleted: true, id: result.rows[0].id })
		}

		return json(response, 405, { error: 'Method not allowed.' })
	} catch (error) {
		return handleError(error, response)
	}
}
