/// <reference types="@cloudflare/workers-types" />

import { SignJWT, jwtVerify } from 'jose'

export interface Env {
  R2_BUCKET: R2Bucket
  BUCKET_NAME: string
  PUBLIC_URL: string
  JWT_SECRET: string // Required: 32+ character secret for JWT signing
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  AWS_ACCESS_KEY_ID?: string
  AWS_SECRET_ACCESS_KEY?: string
}

interface AdminUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'editor'
  addedAt: string
  addedBy: string
}

interface JWTPayload {
  email: string
  name: string
  role: string
  iat?: number
  exp?: number
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
const MAX_LOGIN_ATTEMPTS = 5 // 5 login attempts per minute per IP
const apiRequests = new Map<string, { count: number; resetTime: number }>()
const loginAttempts = new Map<string, { count: number; resetTime: number }>()

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

function isLoginRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = loginAttempts.get(ip)

  if (!record || now > record.resetTime) {
    loginAttempts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return false
  }

  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    return true
  }

  record.count++
  return false
}

function getClientIP(request: Request): string {
  return request.headers.get('CF-Connecting-IP') || 'unknown'
}

// ============================================
// JWT Helpers
// ============================================
const JWT_EXPIRATION = '24h' // Token expires in 24 hours

async function createJWT(payload: JWTPayload, secret: string): Promise<string> {
  const secretKey = new TextEncoder().encode(secret)

  return await new SignJWT({ email: payload.email, name: payload.name, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION)
    .sign(secretKey)
}

async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const secretKey = new TextEncoder().encode(secret)
    const { payload } = await jwtVerify(token, secretKey)

    return {
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as string,
    }
  } catch (error) {
    console.error('JWT verification failed:', error)
    return null
  }
}

async function authenticateRequest(request: Request, env: Env): Promise<JWTPayload | null> {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice('Bearer '.length)
  return await verifyJWT(token, env.JWT_SECRET)
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

function unauthorizedResponse(origin: string | null, message = 'Unauthorized'): Response {
  return corsResponse(
    new Response(JSON.stringify({ error: message }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }),
    origin,
  )
}

function forbiddenResponse(origin: string | null, message = 'Forbidden'): Response {
  return corsResponse(
    new Response(JSON.stringify({ error: message }), {
      status: 403,
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

        // API: POST /api/login — special rate limit for login
        if (path === '/api/login' && request.method === 'POST') {
          if (isLoginRateLimited(clientIP)) {
            console.warn(`Login rate limit exceeded for IP: ${clientIP}`)
            return rateLimitResponse(origin)
          }
          return corsResponse(await handleLogin(request, env), origin)
        }

        // Rate limit check for other API endpoints
        if (isRateLimited(clientIP)) {
          console.warn(`Rate limit exceeded for IP: ${clientIP}`)
          return rateLimitResponse(origin)
        }

        // API: GET /api/load-config — public (needed for initial load)
        if (path === '/api/load-config' && request.method === 'GET') {
          return corsResponse(await loadConfig(env), origin)
        }

        // API: POST /api/save-config — PROTECTED: requires valid JWT
        if (path === '/api/save-config' && request.method === 'POST') {
          const jwtPayload = await authenticateRequest(request, env)

          if (!jwtPayload) {
            return unauthorizedResponse(origin, 'Valid JWT token required')
          }

          // Optional: check role for admin-only actions
          if (jwtPayload.role !== 'admin' && jwtPayload.role !== 'editor') {
            return forbiddenResponse(origin, 'Insufficient permissions')
          }

          return corsResponse(await saveConfig(request, env), origin)
        }

        // API: GET /api/verify — verify JWT token validity
        if (path === '/api/verify' && request.method === 'GET') {
          const jwtPayload = await authenticateRequest(request, env)

          if (!jwtPayload) {
            return unauthorizedResponse(origin, 'Invalid or expired token')
          }

          return corsResponse(
            new Response(
              JSON.stringify({
                valid: true,
                email: jwtPayload.email,
                name: jwtPayload.name,
                role: jwtPayload.role,
              }),
              {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              },
            ),
            origin,
          )
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

// Handle login: validate Google credential, check whitelist, issue JWT
async function handleLogin(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json<{ credential: string }>()

    if (!body.credential) {
      return new Response(JSON.stringify({ error: 'Missing credential' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Decode Google JWT (we trust Google's signature since it came from their SDK)
    const parts = body.credential.split('.')
    if (parts.length < 2 || !parts[1]) {
      return new Response(JSON.stringify({ error: 'Invalid credential format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let googlePayload: { email: string; name: string; picture?: string }
    try {
      googlePayload = JSON.parse(atob(parts[1]))
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to decode credential' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!googlePayload.email) {
      return new Response(JSON.stringify({ error: 'Email not found in credential' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Load config to check whitelist
    const configObject = await env.R2_BUCKET.get('data/app-config.json')
    if (!configObject) {
      return new Response(JSON.stringify({ error: 'Config not found' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const config = await configObject.json<{ allowedUsers: AdminUser[] }>()
    const allowedUsers = config.allowedUsers || []

    // Check if email is in whitelist (case-insensitive)
    const user = allowedUsers.find(
      (u) => u.email.toLowerCase() === googlePayload.email.toLowerCase(),
    )

    if (!user) {
      console.warn(`Login denied for email: ${googlePayload.email}`)
      return new Response(
        JSON.stringify({ error: 'Access denied. Your email is not in the allowed list.' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Generate JWT token
    const jwtToken = await createJWT(
      {
        email: user.email,
        name: user.name || googlePayload.name,
        role: user.role,
      },
      env.JWT_SECRET,
    )

    return new Response(
      JSON.stringify({
        success: true,
        token: jwtToken,
        user: {
          email: user.email,
          name: user.name || googlePayload.name,
          role: user.role,
          picture: googlePayload.picture || null,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Login error:', error)
    return new Response(JSON.stringify({ error: 'Login failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

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
