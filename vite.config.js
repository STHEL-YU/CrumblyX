import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

function localApiPlugin() {
  return {
    name: 'local-api',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url, 'http://localhost')
        const match = url.pathname.match(/^\/api\/menu\/([^/]+)$/)
        if (!match) return next()

        let body = {}
        if (request.method !== 'GET' && request.method !== 'DELETE') {
          try {
            const chunks = []
            for await (const chunk of request) chunks.push(chunk)
            const rawBody = Buffer.concat(chunks).toString('utf8')
            body = rawBody ? JSON.parse(rawBody) : {}
          } catch {
            response.statusCode = 400
            response.setHeader('Content-Type', 'application/json')
            response.end(JSON.stringify({ error: 'Invalid JSON body.' }))
            return
          }
        }

        const adaptedRequest = {
          method: request.method,
          query: Object.fromEntries(url.searchParams.entries()),
          body,
        }
        adaptedRequest.query.action = match[1]

        response.status = (status) => {
          response.statusCode = status
          return response
        }
        response.json = (data) => {
          response.setHeader('Content-Type', 'application/json')
          response.end(JSON.stringify(data))
        }

        try {
          const { default: menuHandler } = await import('./api/menu/[action].js')
          await menuHandler(adaptedRequest, response)
        } catch (error) {
          console.error('Local menu API error:', error)
          response.statusCode = 500
          response.setHeader('Content-Type', 'application/json')
          response.end(JSON.stringify({ error: 'Database operation failed.' }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localApiPlugin()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
