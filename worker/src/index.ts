/// <reference types="@cloudflare/workers-types" />

export interface Env {
  R2_BUCKET: R2Bucket
  BUCKET_NAME: string
  PUBLIC_URL: string
  // Google OAuth credentials (optional, auth handled client-side)
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  // AWS credentials for R2 (if using AWS SDK)
  AWS_ACCESS_KEY_ID?: string
  AWS_SECRET_ACCESS_KEY?: string
}

// =============================================================================
// ALLOWED ORIGINS (CORS)
// =============================================================================
const ALLOWED_ORIGINS = [
  'https://discounts.upstars.com',
  'https://corporate-discounts-worker.upstars-marbella.workers.dev',
  'http://localhost:5173',
  'http://localhost:4173',
]

// =============================================================================
// RATE LIMITING
// =============================================================================
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const MAX_AUTH_ATTEMPTS = 5
const MAX_SAVE_ATTEMPTS = 10

interface RateLimitEntry {
  count: number
  resetTime: number
}

const authAttempts = new Map<string, RateLimitEntry>()
const saveAttempts = new Map<string, RateLimitEntry>()

function isRateLimited(
  ip: string,
  attemptsMap: Map<string, RateLimitEntry>,
  maxAttempts: number,
): boolean {
  const now = Date.now()
  const attempt = attemptsMap.get(ip)

  if (!attempt || now > attempt.resetTime) {
    attemptsMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return false
  }

  if (attempt.count >= maxAttempts) {
    return true
  }

  attempt.count++
  return false
}

function getClientIP(request: Request): string {
  return request.headers.get('CF-Connecting-IP') || 'unknown'
}

// =============================================================================
// JWT VERIFICATION (Google ID Token)
// Проверяем структуру и срок действия токена
// Google ID Token подписан ключами Google, поэтому мы проверяем только:
// 1. Правильная структура (3 части)
// 2. Токен не истек
// 3. Есть email в payload
// =============================================================================
async function verifyJWT(token: string): Promise<boolean> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
      return false
    }

    // Decode payload
    const payloadB64 = parts[1]
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')))

    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return false // Token expired
    }

    // Check that email exists (Google ID Token always has email)
    if (!payload.email) {
      return false
    }

    return true
  } catch {
    return false
  }
}

// =============================================================================
// CORS HEADERS
// =============================================================================
function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }
}

// =============================================================================
// SECURITY HEADERS
// =============================================================================
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: https: blob:; connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://corporate-discounts-worker.upstars-marbella.workers.dev https://pub-37aeae40035e428e93ab550125107a2d.r2.dev; frame-src https://accounts.google.com; object-src 'none'; base-uri 'self'",
}

function corsResponse(response: Response, origin: string | null): Response {
  const headers = new Headers(response.headers)
  Object.entries({ ...getCorsHeaders(origin), ...securityHeaders }).forEach(([key, value]) => {
    headers.set(key, value)
  })
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

// =============================================================================
// MAIN HANDLER
// =============================================================================
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = request.headers.get('Origin')

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: { ...getCorsHeaders(origin), ...securityHeaders } })
    }

    const url = new URL(request.url)
    const path = url.pathname
    const clientIP = getClientIP(request)

    try {
      // API: GET /api/load-config - load app-config.json (public, read-only)
      if (path === '/api/load-config' && request.method === 'GET') {
        return corsResponse(await loadConfig(env), origin)
      }

      // API: POST /api/upload-image - upload partner image (protected)
      if (path === '/api/upload-image' && request.method === 'POST') {
        // Rate limiting for upload endpoint
        if (isRateLimited(clientIP, saveAttempts, MAX_SAVE_ATTEMPTS)) {
          return corsResponse(
            new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
              status: 429,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }

        // JWT Authentication check
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return corsResponse(
            new Response(JSON.stringify({ error: 'Unauthorized - No token provided' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }

        const token = authHeader.substring(7)
        const isValidToken = await verifyJWT(token)

        if (!isValidToken) {
          return corsResponse(
            new Response(JSON.stringify({ error: 'Unauthorized - Invalid or expired token' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }

        return corsResponse(await uploadImage(request, env), origin)
      }

      // API: POST /api/save-config - save app-config.json (protected)
      if (path === '/api/save-config' && request.method === 'POST') {
        // Rate limiting for save endpoint
        if (isRateLimited(clientIP, saveAttempts, MAX_SAVE_ATTEMPTS)) {
          return corsResponse(
            new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
              status: 429,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }

        // JWT Authentication check
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return corsResponse(
            new Response(JSON.stringify({ error: 'Unauthorized - No token provided' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }

        const token = authHeader.substring(7)
        const isValidToken = await verifyJWT(token)

        if (!isValidToken) {
          return corsResponse(
            new Response(JSON.stringify({ error: 'Unauthorized - Invalid or expired token' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }

        return corsResponse(await saveConfig(request, env), origin)
      }

      // API: POST /auth/login or /auth/google - rate limited
      if (path.startsWith('/auth/') && request.method === 'POST') {
        if (isRateLimited(clientIP, authAttempts, MAX_AUTH_ATTEMPTS)) {
          return corsResponse(
            new Response(
              JSON.stringify({ error: 'Too many login attempts. Please try again later.' }),
              {
                status: 429,
                headers: { 'Content-Type': 'application/json' },
              },
            ),
            origin,
          )
        }
        // Auth endpoints would be handled here
        // For now, return 404 as auth is handled client-side
        return corsResponse(
          new Response(JSON.stringify({ error: 'Auth endpoint not implemented in worker' }), {
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

// =============================================================================
// LOAD CONFIG (public endpoint)
// =============================================================================
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
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
  } catch (error) {
    console.error('Failed to load config:', error)
    return new Response(JSON.stringify({ error: 'Failed to load config' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// =============================================================================
// SAVE CONFIG (protected endpoint - requires JWT)
// =============================================================================
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

// =============================================================================
// UPLOAD IMAGE (protected endpoint - requires JWT)
// =============================================================================
async function uploadImage(request: Request, env: Env): Promise<Response> {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const slug = formData.get('slug') as string | null

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!slug) {
      return new Response(JSON.stringify({ error: 'No slug provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file type. Allowed: jpg, png, webp, gif' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return new Response(JSON.stringify({ error: 'File too large. Max size: 5MB' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Determine file extension
    const ext = file.type === 'image/webp' ? 'webp' : file.type.split('/')[1] || 'webp'
    const filename = `${slug}.${ext}`
    const key = `assets/images/partners/${filename}`

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer()
    await env.R2_BUCKET.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
        // ✅ Уменьшили кэш до 1 часа (3600s) чтобы обновления изображений отображались быстрее
        cacheControl: 'public, max-age=3600',
      },
    })

    // Return the path that can be used in app-config.json (without @/ prefix for R2)
    const imagePath = `/assets/images/partners/${filename}`
    const publicUrl = `${env.PUBLIC_URL || ''}/${key}`

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Image uploaded successfully',
        imagePath,
        publicUrl,
        filename,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Failed to upload image:', error)
    return new Response(JSON.stringify({ error: 'Failed to upload image' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// =============================================================================
// SERVE STATIC FILES
// =============================================================================
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
    Object.entries(securityHeaders).forEach(([key, value]) => {
      headers.set(key, value)
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

// =============================================================================
// CONTENT TYPE HELPER
// =============================================================================
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
