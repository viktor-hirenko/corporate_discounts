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

        // API endpoint to upload partner images (dev only - saves to public folder)
        server.middlewares.use('/api/upload-image', async (req, res) => {
          if (req.method === 'POST') {
            try {
              // Parse multipart form data manually
              const chunks: Buffer[] = []
              req.on('data', (chunk: Buffer) => chunks.push(chunk))
              req.on('end', async () => {
                try {
                  const buffer = Buffer.concat(chunks)
                  const contentType = req.headers['content-type'] || ''

                  // Extract boundary from content-type
                  const boundaryMatch = contentType.match(/boundary=(.+)$/)
                  if (!boundaryMatch) {
                    res.writeHead(400, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({ error: 'Invalid multipart data' }))
                    return
                  }

                  const boundary = boundaryMatch[1]
                  const parts = buffer.toString('binary').split(`--${boundary}`)

                  let fileData: Buffer | null = null
                  let fileName = ''
                  let fileType = ''
                  let slug = ''

                  for (const part of parts) {
                    if (part.includes('name="file"')) {
                      const fileNameMatch = part.match(/filename="([^"]+)"/)
                      const contentTypeMatch = part.match(/Content-Type: ([^\r\n]+)/)
                      if (fileNameMatch) fileName = fileNameMatch[1]
                      if (contentTypeMatch) fileType = contentTypeMatch[1]

                      // Extract file content (after double CRLF)
                      const headerEnd = part.indexOf('\r\n\r\n')
                      if (headerEnd !== -1) {
                        const content = part.slice(headerEnd + 4).replace(/\r\n$/, '')
                        fileData = Buffer.from(content, 'binary')
                      }
                    } else if (part.includes('name="slug"')) {
                      const headerEnd = part.indexOf('\r\n\r\n')
                      if (headerEnd !== -1) {
                        slug = part
                          .slice(headerEnd + 4)
                          .replace(/\r\n$/, '')
                          .trim()
                      }
                    }
                  }

                  if (!fileData || !slug) {
                    res.writeHead(400, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({ error: 'Missing file or slug' }))
                    return
                  }

                  // Determine extension
                  const ext =
                    fileType === 'image/webp'
                      ? 'webp'
                      : fileType === 'image/png'
                        ? 'png'
                        : fileType === 'image/gif'
                          ? 'gif'
                          : 'jpg'
                  const newFileName = `${slug}.${ext}`

                  // Save to public/images/partners/
                  const imagesDir = path.resolve(__dirname, 'public/images/partners')
                  if (!fs.existsSync(imagesDir)) {
                    fs.mkdirSync(imagesDir, { recursive: true })
                  }

                  const filePath = path.join(imagesDir, newFileName)
                  fs.writeFileSync(filePath, fileData)

                  const imagePath = `/images/partners/${newFileName}`

                  res.writeHead(200, { 'Content-Type': 'application/json' })
                  res.end(
                    JSON.stringify({
                      success: true,
                      message: 'Image uploaded successfully',
                      imagePath,
                      filename: newFileName,
                    }),
                  )
                } catch (error) {
                  console.error('Failed to process upload:', error)
                  res.writeHead(500, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ error: 'Failed to process upload' }))
                }
              })
            } catch (error) {
              console.error('Upload error:', error)
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
