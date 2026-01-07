/**
 * Simple HTTP Server to Serve Test Dashboard
 *
 * Allows testing the HTML dashboard locally without full Next.js setup
 */

import { createServer } from 'http'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const PORT = 3334 // Different port to avoid conflicts

const server = createServer((req, res) => {
  const url = req.url

  if (url === '/' || url === '/test-dashboard.html') {
    // Serve the test dashboard
    try {
      const filePath = join(__dirname, '../public/test-dashboard.html')
      const content = readFileSync(filePath, 'utf8')

      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*'
      })
      res.end(content)
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end('Error loading test dashboard')
    }
  } else {
    // Handle other routes with simple responses
    const mockResponses: Record<string, { status: number, body: any }> = {
      '/api/health': { status: 200, body: { status: 'healthy' } },
      '/api/v1/health': { status: 200, body: { status: 'healthy' } },
      '/api/v1/agent/invalid-address': { status: 400, body: { error: 'Invalid Solana address format' } },
      '/api/v1/agent/11111111111111111111111111111112': { status: 404, body: { error: 'Agent not found' } },
      '/api/non-existent': { status: 404, body: { error: 'API endpoint not found' } }
    }

    const mockResponse = mockResponses[url || '']
    if (mockResponse) {
      res.writeHead(mockResponse.status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      })
      res.end(JSON.stringify(mockResponse.body))
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Not found')
    }
  }
})

server.listen(PORT, () => {
  console.log(`🚀 Test Dashboard Server running at http://localhost:${PORT}`)
  console.log(`📊 Open http://localhost:${PORT} to access the testing dashboard`)
  console.log(`🎯 Click "Run All Tests" to see comprehensive wide event logging in action!`)
  console.log(`\nPress Ctrl+C to stop the server`)
})

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down test server...')
  server.close(() => {
    console.log('✅ Server stopped')
    process.exit(0)
  })
})

export { server }