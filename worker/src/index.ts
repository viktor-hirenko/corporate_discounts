/// <reference types="@cloudflare/workers-types" />

export interface Env {
  R2_BUCKET: R2Bucket
  BUCKET_NAME: string
  PUBLIC_URL: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  AWS_ACCESS_KEY_ID?: string
  AWS_SECRET_ACCESS_KEY?: string
}

// ============================================
// CORS Configuration - Allowed Origins
// ============================================
const ALLOWED_ORIGINS = [
  'https://corporate-discounts-worker.upstars-marbella.workers.dev',
  'https://pub-37aeae40035e428e93ab550125107a2d.r2.dev',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
]

function getCorsHeaders(origin: string | null): Record<string, string> {
  // Check if origin is allowed
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]!

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }
}

// ============================================
// Security Headers
// ============================================
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: https: blob:; connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://corporate-discounts-worker.upstars-marbella.workers.dev; frame-src https://accounts.google.com; object-src 'none'; base-uri 'self'",
}

// ============================================
// Rate Limiting (in-memory, resets on worker restart)
// ============================================
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const MAX_API_REQUESTS = 30 // 30 requests per minute per IP
const apiRequests = new Map<string, { count: number; resetTime: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = apiRequests.get(ip)

  if (!record || now > record.resetTime) {
    apiRequests.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return false
  }

  if (record.count >= MAX_API_REQUESTS) {
    return true
  }

  record.count++
  return false
}

function getClientIP(request: Request): string {
  return request.headers.get('CF-Connecting-IP') || 'unknown'
}

// ============================================
// Response Helpers
// ============================================
function corsResponse(response: Response, origin: string | null): Response {
  const newResponse = new Response(response.body, response)
  const corsHeaders = getCorsHeaders(origin)

  Object.entries({ ...corsHeaders, ...securityHeaders }).forEach(([key, value]) => {
    newResponse.headers.set(key, value)
  })
  return newResponse
}

function rateLimitResponse(origin: string | null): Response {
  return corsResponse(
    new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    }),
    origin,
  )
}

// ============================================
// Main Worker Handler
// ============================================
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = request.headers.get('Origin')
    const corsHeaders = getCorsHeaders(origin)

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: { ...corsHeaders, ...securityHeaders } })
    }

    const url = new URL(request.url)
    const path = url.pathname

    try {
      // API endpoints - apply rate limiting
      if (path.startsWith('/api/')) {
        const clientIP = getClientIP(request)

        // Rate limit check
        if (isRateLimited(clientIP)) {
          console.warn(`Rate limit exceeded for IP: ${clientIP}`)
          return rateLimitResponse(origin)
        }

        // API: GET /api/load-config
        if (path === '/api/load-config' && request.method === 'GET') {
          return corsResponse(await loadConfig(env), origin)
        }

        // API: POST /api/save-config
        if (path === '/api/save-config' && request.method === 'POST') {
          return corsResponse(await saveConfig(request, env), origin)
        }

        // Unknown API endpoint
        return corsResponse(
          new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }),
          origin,
        )
      }

      // Serve static files from R2
      return await serveStaticFile(request, env)
    } catch (error) {
      console.error('Worker error:', error)
      return corsResponse(
        new Response(JSON.stringify({ error: 'Internal server error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
        origin,
      )
    }
  },
}

// ============================================
// API Handlers
// ============================================

// Load app-config.json from R2
async function loadConfig(env: Env): Promise<Response> {
  try {
    const object = await env.R2_BUCKET.get('data/app-config.json')

    if (!object) {
      return new Response(JSON.stringify({ error: 'Config not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const config = await object.text()

    return new Response(config, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Failed to load config:', error)
    return new Response(JSON.stringify({ error: 'Failed to load config' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// Save app-config.json to R2
async function saveConfig(request: Request, env: Env): Promise<Response> {
  try {
    const config = await request.json()

    // Validate config structure
    if (!config || typeof config !== 'object') {
      return new Response(JSON.stringify({ error: 'Invalid config format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Save to R2
    await env.R2_BUCKET.put('data/app-config.json', JSON.stringify(config, null, 2), {
      httpMetadata: {
        contentType: 'application/json',
        cacheControl: 'public, max-age=0, must-revalidate',
      },
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Config saved successfully',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Failed to save config:', error)
    return new Response(JSON.stringify({ error: 'Failed to save config' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// ============================================
// Static File Server
// ============================================

async function serveStaticFile(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  let path = url.pathname

  // Root redirect to index.html
  if (path === '/' || path === '') {
    path = '/index.html'
  }

  // Remove leading slash
  const key = path.startsWith('/') ? path.slice(1) : path

  try {
    const object = await env.R2_BUCKET.get(key)

    if (!object) {
      // Try index.html for SPA routes
      const indexObject = await env.R2_BUCKET.get('index.html')
      if (!indexObject) {
        return new Response('Not found', { status: 404 })
      }

      const body = await indexObject.arrayBuffer()
      return new Response(body, {
        headers: {
          'Content-Type': 'text/html',
          ...securityHeaders,
        },
      })
    }

    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('etag', object.httpEtag)

    // Add security headers
    Object.entries(securityHeaders).forEach(([k, v]) => {
      headers.set(k, v)
    })

    // Set proper content type if not set
    if (!headers.has('Content-Type')) {
      const contentType = getContentType(key)
      if (contentType) {
        headers.set('Content-Type', contentType)
      }
    }

    return new Response(object.body, { headers })
  } catch (error) {
    console.error('Failed to serve file:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

// Get content type based on file extension
function getContentType(filename: string): string | null {
  const ext = filename.split('.').pop()?.toLowerCase()
  const contentTypes: Record<string, string> = {
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
    eot: 'application/vnd.ms-fontobject',
  }
  return ext ? contentTypes[ext] || null : null
}
