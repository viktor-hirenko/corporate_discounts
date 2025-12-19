import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    vue(),
    vueDevTools(),
    // Custom plugin for saving app-config.json during development
    {
      name: 'save-config-api',
      configureServer(server) {
        // API endpoint for login (dev mode - simplified, no JWT verification)
        server.middlewares.use('/api/login', async (req, res) => {
          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => {
              body += chunk.toString()
            })
            req.on('end', () => {
              try {
                const { credential } = JSON.parse(body)
                if (!credential) {
                  res.writeHead(400, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ error: 'Missing credential' }))
                  return
                }

                // Decode Google JWT to get user info
                const parts = credential.split('.')
                if (parts.length < 2) {
                  res.writeHead(400, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ error: 'Invalid credential format' }))
                  return
                }

                const googlePayload = JSON.parse(Buffer.from(parts[1], 'base64').toString())

                // Load config to check whitelist
                const configPath = path.resolve(__dirname, 'src/data/app-config.json')
                const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
                const allowedUsers = configData.allowedUsers || []

                // Check whitelist
                const user = allowedUsers.find(
                  (u: { email: string }) =>
                    u.email.toLowerCase() === googlePayload.email.toLowerCase(),
                )

                if (!user) {
                  res.writeHead(403, { 'Content-Type': 'application/json' })
                  res.end(
                    JSON.stringify({
                      error: 'Access denied. Your email is not in the allowed list.',
                    }),
                  )
                  return
                }

                // In dev mode, return a simple token (not cryptographically secure)
                const devToken = Buffer.from(
                  JSON.stringify({
                    email: user.email,
                    name: user.name || googlePayload.name,
                    role: user.role,
                    exp: Date.now() + 24 * 60 * 60 * 1000,
                  }),
                ).toString('base64')

                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(
                  JSON.stringify({
                    success: true,
                    token: `dev.${devToken}`,
                    user: {
                      email: user.email,
                      name: user.name || googlePayload.name,
                      role: user.role,
                      picture: googlePayload.picture || null,
                    },
                  }),
                )
              } catch (error) {
                console.error('Login failed:', error)
                res.writeHead(500, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: String(error) }))
              }
            })
          } else {
            res.writeHead(405, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Method not allowed' }))
          }
        })

        // API endpoint to verify token (dev mode - simplified)
        server.middlewares.use('/api/verify', (req, res) => {
          if (req.method === 'GET') {
            const authHeader = req.headers.authorization
            if (!authHeader?.startsWith('Bearer ')) {
              res.writeHead(401, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Unauthorized' }))
              return
            }

            const token = authHeader.slice('Bearer '.length)
            try {
              // Dev token format: dev.<base64payload>
              if (token.startsWith('dev.')) {
                const payload = JSON.parse(Buffer.from(token.slice(4), 'base64').toString())
                if (payload.exp && payload.exp > Date.now()) {
                  res.writeHead(200, { 'Content-Type': 'application/json' })
                  res.end(
                    JSON.stringify({
                      valid: true,
                      email: payload.email,
                      name: payload.name,
                      role: payload.role,
                    }),
                  )
                  return
                }
              }
              res.writeHead(401, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Invalid or expired token' }))
            } catch {
              res.writeHead(401, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Invalid token' }))
            }
          } else {
            res.writeHead(405, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Method not allowed' }))
          }
        })

        // API endpoint to save app-config.json
        server.middlewares.use('/api/save-config', async (req, res) => {
          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => {
              body += chunk.toString()
            })
            req.on('end', () => {
              try {
                const configPath = path.resolve(__dirname, 'src/data/app-config.json')
                const config = JSON.parse(body)
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ success: true, message: 'Config saved successfully' }))
              } catch (error) {
                console.error('Failed to save config:', error)
                res.writeHead(500, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ success: false, error: String(error) }))
              }
            })
          } else {
            res.writeHead(405, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Method not allowed' }))
          }
        })

        // API endpoint to load current app-config.json
        server.middlewares.use('/api/load-config', (req, res) => {
          if (req.method === 'GET') {
            try {
              const configPath = path.resolve(__dirname, 'src/data/app-config.json')
              const config = fs.readFileSync(configPath, 'utf-8')
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(config)
            } catch (error) {
              console.error('Failed to load config:', error)
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: String(error) }))
            }
          } else {
            res.writeHead(405, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Method not allowed' }))
          }
        })
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/core" as *;`,
      },
    },
  },
  server: {
    watch: {
      // Ignore app-config.json to prevent HMR reload when admin saves changes
      ignored: ['**/src/data/app-config.json'],
    },
  },
})
