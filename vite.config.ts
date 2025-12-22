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
