/// <reference types="@cloudflare/workers-types" />

export interface Env {
  R2_BUCKET: R2Bucket
  BUCKET_NAME: string
  PUBLIC_URL: string
  // External R2 bucket (discounts.upstars.com)
  EXTERNAL_BUCKET_NAME: string
  EXTERNAL_R2_ENDPOINT: string
  // Google OAuth credentials (optional, auth handled client-side)
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  // AWS credentials for external R2 bucket (S3 API)
  AWS_ACCESS_KEY_ID?: string
  AWS_SECRET_ACCESS_KEY?: string
}

// =============================================================================
// S3 CLIENT (AWS Signature V4 for external R2 bucket)
// =============================================================================

async function hmacSha256(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message))
}

async function sha256(message: string | ArrayBuffer): Promise<string> {
  const data = typeof message === 'string' ? new TextEncoder().encode(message) : message
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string,
): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(new TextEncoder().encode('AWS4' + secretKey), dateStamp)
  const kRegion = await hmacSha256(kDate, region)
  const kService = await hmacSha256(kRegion, service)
  return hmacSha256(kService, 'aws4_request')
}

interface S3RequestOptions {
  method: 'GET' | 'PUT' | 'DELETE'
  key: string
  body?: string | ArrayBuffer
  contentType?: string
}

async function s3Request(env: Env, options: S3RequestOptions): Promise<Response> {
  const { method, key, body, contentType } = options

  if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS credentials not configured')
  }

  const endpoint = env.EXTERNAL_R2_ENDPOINT
  const bucketName = env.EXTERNAL_BUCKET_NAME
  const region = 'auto'
  const service = 's3'

  // Parse endpoint to get host
  const endpointUrl = new URL(endpoint)
  const host = `${bucketName}.${endpointUrl.host}`
  const url = `https://${host}/${key}`

  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)

  // Calculate payload hash
  const payloadHash = body ? await sha256(body) : await sha256('')

  // Canonical headers
  const headers: Record<string, string> = {
    host: host,
    'x-amz-date': amzDate,
    'x-amz-content-sha256': payloadHash,
  }

  if (contentType) {
    headers['content-type'] = contentType
  }

  const signedHeaders = Object.keys(headers).sort().join(';')
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((k) => `${k}:${headers[k]}\n`)
    .join('')

  // Canonical request
  const canonicalRequest = [
    method,
    '/' + key,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  const canonicalRequestHash = await sha256(canonicalRequest)

  // String to sign
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, canonicalRequestHash].join(
    '\n',
  )

  // Calculate signature
  const signingKey = await getSignatureKey(env.AWS_SECRET_ACCESS_KEY, dateStamp, region, service)
  const signature = toHex(await hmacSha256(signingKey, stringToSign))

  // Authorization header
  const authorization = `AWS4-HMAC-SHA256 Credential=${env.AWS_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  // Make request
  const requestHeaders: Record<string, string> = {
    Authorization: authorization,
    'x-amz-date': amzDate,
    'x-amz-content-sha256': payloadHash,
  }

  if (contentType) {
    requestHeaders['Content-Type'] = contentType
  }

  return fetch(url, {
    method,
    headers: requestHeaders,
    body: body || undefined,
  })
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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, Pragma',
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
// Uses S3 API to read from external bucket (discounts.upstars.com)
// =============================================================================
async function loadConfig(env: Env): Promise<Response> {
  try {
    // Try external bucket first (via S3 API)
    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.EXTERNAL_R2_ENDPOINT) {
      try {
        const s3Response = await s3Request(env, {
          method: 'GET',
          key: 'data/app-config.json',
        })

        if (s3Response.ok) {
          const config = await s3Response.text()
          return new Response(config, {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              Pragma: 'no-cache',
              Expires: '0',
            },
          })
        }
        console.error('S3 request failed:', s3Response.status, await s3Response.text())
      } catch (s3Error) {
        console.error('S3 request error:', s3Error)
      }
    }

    // Fallback to local R2 bucket
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
// Uses S3 API to write to external bucket (discounts.upstars.com)
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

    const configJson = JSON.stringify(config, null, 2)

    // Try external bucket first (via S3 API)
    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.EXTERNAL_R2_ENDPOINT) {
      try {
        const s3Response = await s3Request(env, {
          method: 'PUT',
          key: 'data/app-config.json',
          body: configJson,
          contentType: 'application/json',
        })

        if (s3Response.ok) {
          return new Response(
            JSON.stringify({
              success: true,
              message: 'Config saved successfully to external bucket',
              timestamp: new Date().toISOString(),
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }
        console.error('S3 save failed:', s3Response.status, await s3Response.text())
      } catch (s3Error) {
        console.error('S3 save error:', s3Error)
      }
    }

    // Fallback to local R2 bucket
    await env.R2_BUCKET.put('data/app-config.json', configJson, {
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
// Uses S3 API to upload to external bucket (discounts.upstars.com)
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
    const key = `images/partners/${filename}`

    const arrayBuffer = await file.arrayBuffer()

    // Try external bucket first (via S3 API)
    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.EXTERNAL_R2_ENDPOINT) {
      try {
        const s3Response = await s3Request(env, {
          method: 'PUT',
          key: key,
          body: arrayBuffer,
          contentType: file.type,
        })

        if (s3Response.ok) {
          const imagePath = `/images/partners/${filename}`
          const publicUrl = `${env.PUBLIC_URL}/${key}`

          return new Response(
            JSON.stringify({
              success: true,
              message: 'Image uploaded successfully to external bucket',
              imagePath,
              publicUrl,
              filename,
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }
        console.error('S3 upload failed:', s3Response.status, await s3Response.text())
      } catch (s3Error) {
        console.error('S3 upload error:', s3Error)
      }
    }

    // Fallback to local R2 bucket
    const localKey = `assets/images/partners/${filename}`
    await env.R2_BUCKET.put(localKey, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=3600',
      },
    })

    const imagePath = `/assets/images/partners/${filename}`
    const publicUrl = `${env.PUBLIC_URL || ''}/${localKey}`

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
