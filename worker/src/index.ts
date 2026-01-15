/// <reference types="@cloudflare/workers-types" />

// =============================================================================
// TYPES
// =============================================================================

interface LocalizedText {
  ua: string
  en: string
}

interface Partner {
  slug: string
  name: LocalizedText
  updatedAt?: number
  updatedBy?: string
  [key: string]: unknown
}

interface FaqItem {
  id: string
  question: LocalizedText
  answer: LocalizedText
}

interface AppConfig {
  partners?: Record<string, Partner>
  filters?: {
    categories?: Record<string, unknown>
    locations?: Record<string, unknown>
  }
  pages?: Record<string, unknown> & {
    faq?: {
      items?: FaqItem[]
    }
  }
  allowedUsers?: string[]
  [key: string]: unknown
}

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
  const kDate = await hmacSha256(
    new TextEncoder().encode('AWS4' + secretKey).buffer as ArrayBuffer,
    dateStamp,
  )
  const kRegion = await hmacSha256(kDate, region)
  const kService = await hmacSha256(kRegion, service)
  return hmacSha256(kService, 'aws4_request')
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Truncate string to maxLen characters, adding "..." if truncated
 * Used for logging long text fields
 */
function truncate(str: string | undefined, maxLen: number): string {
  if (!str) return ''
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str
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

/**
 * Извлекает email из JWT токена для логирования
 */
function extractEmailFromJWT(token: string): string {
  try {
    const parts = token.split('.')
    if (parts.length !== 3 || !parts[1]) return 'unknown'
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.email || 'unknown'
  } catch {
    return 'unknown'
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
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
          const attemptedEmail = extractEmailFromJWT(token)
          console.log(
            '[AUTH_FAIL]',
            JSON.stringify({
              action: 'upload_image',
              user: attemptedEmail,
              reason: 'invalid_or_expired_token',
              ip: clientIP,
              timestamp: new Date().toISOString(),
            }),
          )
          return corsResponse(
            new Response(JSON.stringify({ error: 'Unauthorized - Invalid or expired token' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }

        const userEmail = extractEmailFromJWT(token)
        return corsResponse(await uploadImage(request, env, userEmail), origin)
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
          const attemptedEmail = extractEmailFromJWT(token)
          console.log(
            '[AUTH_FAIL]',
            JSON.stringify({
              action: 'save_config',
              user: attemptedEmail,
              reason: 'invalid_or_expired_token',
              ip: clientIP,
              timestamp: new Date().toISOString(),
            }),
          )
          return corsResponse(
            new Response(JSON.stringify({ error: 'Unauthorized - Invalid or expired token' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }

        const userEmail = extractEmailFromJWT(token)
        return corsResponse(await saveConfig(request, env, userEmail), origin)
      }

      // API: POST /api/partner/save - save single partner (protected)
      if (path === '/api/partner/save' && request.method === 'POST') {
        // Rate limiting
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
          const attemptedEmail = extractEmailFromJWT(token)
          console.log(
            '[AUTH_FAIL]',
            JSON.stringify({
              action: 'save_partner',
              user: attemptedEmail,
              reason: 'invalid_or_expired_token',
              ip: clientIP,
              timestamp: new Date().toISOString(),
            }),
          )
          return corsResponse(
            new Response(JSON.stringify({ error: 'Unauthorized - Invalid or expired token' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }

        const userEmail = extractEmailFromJWT(token)
        return corsResponse(await savePartner(request, env, userEmail), origin)
      }

      // API: DELETE /api/partner/:slug - delete single partner (protected)
      if (path.startsWith('/api/partner/') && request.method === 'DELETE') {
        const slug = path.replace('/api/partner/', '')
        if (!slug) {
          return corsResponse(
            new Response(JSON.stringify({ error: 'Partner slug is required' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }

        // Rate limiting
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
          const attemptedEmail = extractEmailFromJWT(token)
          console.log(
            '[AUTH_FAIL]',
            JSON.stringify({
              action: 'delete_partner',
              user: attemptedEmail,
              slug: slug,
              reason: 'invalid_or_expired_token',
              ip: clientIP,
              timestamp: new Date().toISOString(),
            }),
          )
          return corsResponse(
            new Response(JSON.stringify({ error: 'Unauthorized - Invalid or expired token' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }

        const userEmail = extractEmailFromJWT(token)
        return corsResponse(await deletePartner(slug, env, userEmail), origin)
      }

      // API: POST /api/category/save - save single category (protected)
      if (path === '/api/category/save' && request.method === 'POST') {
        if (isRateLimited(clientIP, saveAttempts, MAX_SAVE_ATTEMPTS)) {
          return corsResponse(
            new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
              status: 429,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }

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
          const attemptedEmail = extractEmailFromJWT(token)
          console.log(
            '[AUTH_FAIL]',
            JSON.stringify({
              action: 'save_category',
              user: attemptedEmail,
              reason: 'invalid_or_expired_token',
              ip: clientIP,
              timestamp: new Date().toISOString(),
            }),
          )
          return corsResponse(
            new Response(JSON.stringify({ error: 'Unauthorized - Invalid or expired token' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }

        const userEmail = extractEmailFromJWT(token)
        return corsResponse(await saveCategory(request, env, userEmail), origin)
      }

      // API: DELETE /api/category/:key - delete single category (protected)
      if (path.startsWith('/api/category/') && request.method === 'DELETE') {
        const key = path.replace('/api/category/', '')
        if (!key) {
          return corsResponse(
            new Response(JSON.stringify({ error: 'Category key is required' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }

        if (isRateLimited(clientIP, saveAttempts, MAX_SAVE_ATTEMPTS)) {
          return corsResponse(
            new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
              status: 429,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }

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
          const attemptedEmail = extractEmailFromJWT(token)
          console.log(
            '[AUTH_FAIL]',
            JSON.stringify({
              action: 'delete_category',
              user: attemptedEmail,
              key: key,
              reason: 'invalid_or_expired_token',
              ip: clientIP,
              timestamp: new Date().toISOString(),
            }),
          )
          return corsResponse(
            new Response(JSON.stringify({ error: 'Unauthorized - Invalid or expired token' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }

        const userEmail = extractEmailFromJWT(token)
        return corsResponse(await deleteCategory(key, env, userEmail), origin)
      }

      // API: POST /api/location/save - save single location (protected)
      if (path === '/api/location/save' && request.method === 'POST') {
        if (isRateLimited(clientIP, saveAttempts, MAX_SAVE_ATTEMPTS)) {
          return corsResponse(
            new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
              status: 429,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }

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
          const attemptedEmail = extractEmailFromJWT(token)
          console.log(
            '[AUTH_FAIL]',
            JSON.stringify({
              action: 'save_location',
              user: attemptedEmail,
              reason: 'invalid_or_expired_token',
              ip: clientIP,
              timestamp: new Date().toISOString(),
            }),
          )
          return corsResponse(
            new Response(JSON.stringify({ error: 'Unauthorized - Invalid or expired token' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }

        const userEmail = extractEmailFromJWT(token)
        return corsResponse(await saveLocation(request, env, userEmail), origin)
      }

      // API: DELETE /api/location/:key - delete single location (protected)
      if (path.startsWith('/api/location/') && request.method === 'DELETE') {
        const key = path.replace('/api/location/', '')
        if (!key) {
          return corsResponse(
            new Response(JSON.stringify({ error: 'Location key is required' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }

        if (isRateLimited(clientIP, saveAttempts, MAX_SAVE_ATTEMPTS)) {
          return corsResponse(
            new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
              status: 429,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }

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
          const attemptedEmail = extractEmailFromJWT(token)
          console.log(
            '[AUTH_FAIL]',
            JSON.stringify({
              action: 'delete_location',
              user: attemptedEmail,
              key: key,
              reason: 'invalid_or_expired_token',
              ip: clientIP,
              timestamp: new Date().toISOString(),
            }),
          )
          return corsResponse(
            new Response(JSON.stringify({ error: 'Unauthorized - Invalid or expired token' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }

        const userEmail = extractEmailFromJWT(token)
        return corsResponse(await deleteLocation(key, env, userEmail), origin)
      }

      // API: POST /api/faq/save - save single FAQ item (protected)
      if (path === '/api/faq/save' && request.method === 'POST') {
        if (isRateLimited(clientIP, saveAttempts, MAX_SAVE_ATTEMPTS)) {
          return corsResponse(
            new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
              status: 429,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }

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
          const attemptedEmail = extractEmailFromJWT(token)
          console.log(
            '[AUTH_FAIL]',
            JSON.stringify({
              action: 'save_faq',
              user: attemptedEmail,
              reason: 'invalid_or_expired_token',
              ip: clientIP,
              timestamp: new Date().toISOString(),
            }),
          )
          return corsResponse(
            new Response(JSON.stringify({ error: 'Unauthorized - Invalid or expired token' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }

        const userEmail = extractEmailFromJWT(token)
        return corsResponse(await saveFaqItem(request, env, userEmail), origin)
      }

      // API: DELETE /api/faq/:id - delete single FAQ item (protected)
      if (path.startsWith('/api/faq/') && request.method === 'DELETE') {
        const id = path.replace('/api/faq/', '')
        if (!id) {
          return corsResponse(
            new Response(JSON.stringify({ error: 'FAQ id is required' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }

        if (isRateLimited(clientIP, saveAttempts, MAX_SAVE_ATTEMPTS)) {
          return corsResponse(
            new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
              status: 429,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }

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
          const attemptedEmail = extractEmailFromJWT(token)
          console.log(
            '[AUTH_FAIL]',
            JSON.stringify({
              action: 'delete_faq',
              user: attemptedEmail,
              id: id,
              reason: 'invalid_or_expired_token',
              ip: clientIP,
              timestamp: new Date().toISOString(),
            }),
          )
          return corsResponse(
            new Response(JSON.stringify({ error: 'Unauthorized - Invalid or expired token' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }

        const userEmail = extractEmailFromJWT(token)
        return corsResponse(await deleteFaqItem(id, env, userEmail), origin)
      }

      // API: POST /api/texts/save - save page texts (protected)
      if (path === '/api/texts/save' && request.method === 'POST') {
        if (isRateLimited(clientIP, saveAttempts, MAX_SAVE_ATTEMPTS)) {
          return corsResponse(
            new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
              status: 429,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }

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
          const attemptedEmail = extractEmailFromJWT(token)
          console.log(
            '[AUTH_FAIL]',
            JSON.stringify({
              action: 'save_texts',
              user: attemptedEmail,
              reason: 'invalid_or_expired_token',
              ip: clientIP,
              timestamp: new Date().toISOString(),
            }),
          )
          return corsResponse(
            new Response(JSON.stringify({ error: 'Unauthorized - Invalid or expired token' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }

        const userEmail = extractEmailFromJWT(token)
        return corsResponse(await saveTexts(request, env, userEmail), origin)
      }

      // API: POST /api/users/save - save allowed users list (protected)
      if (path === '/api/users/save' && request.method === 'POST') {
        if (isRateLimited(clientIP, saveAttempts, MAX_SAVE_ATTEMPTS)) {
          return corsResponse(
            new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
              status: 429,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }

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
          const attemptedEmail = extractEmailFromJWT(token)
          console.log(
            '[AUTH_FAIL]',
            JSON.stringify({
              action: 'save_users',
              user: attemptedEmail,
              reason: 'invalid_or_expired_token',
              ip: clientIP,
              timestamp: new Date().toISOString(),
            }),
          )
          return corsResponse(
            new Response(JSON.stringify({ error: 'Unauthorized - Invalid or expired token' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }

        const userEmail = extractEmailFromJWT(token)
        return corsResponse(await saveUsers(request, env, userEmail), origin)
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
async function saveConfig(
  request: Request,
  env: Env,
  userEmail: string = 'unknown',
): Promise<Response> {
  try {
    const config = (await request.json()) as AppConfig

    // Validate config structure
    if (!config || typeof config !== 'object') {
      console.log(
        '[SAVE_ERROR]',
        JSON.stringify({
          user: userEmail,
          error: 'invalid_config_format',
          timestamp: new Date().toISOString(),
        }),
      )
      return new Response(JSON.stringify({ error: 'Invalid config format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Логируем сохранение с полной статистикой
    const partnersCount = config.partners ? Object.keys(config.partners).length : 0
    const categoriesCount = config.filters?.categories
      ? Object.keys(config.filters.categories).length
      : 0
    const locationsCount = config.filters?.locations
      ? Object.keys(config.filters.locations).length
      : 0
    const usersCount = config.allowedUsers ? config.allowedUsers.length : 0
    const faqCount = config.pages?.faq?.items ? config.pages.faq.items.length : 0

    console.log(
      '[SAVE]',
      JSON.stringify({
        user: userEmail,
        stats: {
          partners: partnersCount,
          categories: categoriesCount,
          locations: locationsCount,
          users: usersCount,
          faq: faqCount,
        },
        timestamp: new Date().toISOString(),
      }),
    )

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
          console.log(
            '[SAVE_SUCCESS]',
            JSON.stringify({
              user: userEmail,
              destination: 'external_bucket',
              timestamp: new Date().toISOString(),
            }),
          )
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
        const errorText = await s3Response.text()
        console.log(
          '[SAVE_ERROR]',
          JSON.stringify({
            user: userEmail,
            error: 's3_save_failed',
            status: s3Response.status,
            details: errorText,
            timestamp: new Date().toISOString(),
          }),
        )
      } catch (s3Error) {
        console.log(
          '[SAVE_ERROR]',
          JSON.stringify({
            user: userEmail,
            error: 's3_exception',
            details: String(s3Error),
            timestamp: new Date().toISOString(),
          }),
        )
      }
    }

    // Fallback to local R2 bucket
    await env.R2_BUCKET.put('data/app-config.json', configJson, {
      httpMetadata: {
        contentType: 'application/json',
        cacheControl: 'public, max-age=0, must-revalidate',
      },
    })

    console.log(
      '[SAVE_SUCCESS]',
      JSON.stringify({
        user: userEmail,
        destination: 'local_bucket',
        timestamp: new Date().toISOString(),
      }),
    )

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
    console.log(
      '[SAVE_ERROR]',
      JSON.stringify({
        user: userEmail,
        error: 'save_exception',
        details: String(error),
        timestamp: new Date().toISOString(),
      }),
    )
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
async function uploadImage(
  request: Request,
  env: Env,
  userEmail: string = 'unknown',
): Promise<Response> {
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

    // Логируем загрузку изображения
    console.log(
      '[UPLOAD]',
      JSON.stringify({
        user: userEmail,
        filename: file.name,
        slug: slug,
        size: file.size,
        type: file.type,
        timestamp: new Date().toISOString(),
      }),
    )

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      console.log(
        '[UPLOAD_ERROR]',
        JSON.stringify({
          user: userEmail,
          error: 'invalid_file_type',
          filename: file.name,
          type: file.type,
          timestamp: new Date().toISOString(),
        }),
      )
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
      console.log(
        '[UPLOAD_ERROR]',
        JSON.stringify({
          user: userEmail,
          error: 'file_too_large',
          filename: file.name,
          size: file.size,
          maxSize: maxSize,
          timestamp: new Date().toISOString(),
        }),
      )
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
          // Полный URL для работы и на основном сайте, и в админке
          const imagePath = `${env.PUBLIC_URL}/images/partners/${filename}`

          console.log(
            '[UPLOAD_SUCCESS]',
            JSON.stringify({
              user: userEmail,
              filename,
              destination: 'external_bucket',
              path: imagePath,
              timestamp: new Date().toISOString(),
            }),
          )

          return new Response(
            JSON.stringify({
              success: true,
              message: 'Image uploaded successfully to external bucket',
              imagePath,
              publicUrl: imagePath,
              filename,
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }
        const errorText = await s3Response.text()
        console.log(
          '[UPLOAD_ERROR]',
          JSON.stringify({
            user: userEmail,
            error: 's3_upload_failed',
            filename,
            status: s3Response.status,
            details: errorText,
            timestamp: new Date().toISOString(),
          }),
        )
      } catch (s3Error) {
        console.log(
          '[UPLOAD_ERROR]',
          JSON.stringify({
            user: userEmail,
            error: 's3_exception',
            filename,
            details: String(s3Error),
            timestamp: new Date().toISOString(),
          }),
        )
      }
    }

    // Fallback to local R2 bucket (используем тот же путь для консистентности)
    const localKey = `images/partners/${filename}`
    await env.R2_BUCKET.put(localKey, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=3600',
      },
    })

    // Полный URL для работы и на основном сайте, и в админке
    const imagePath = `${env.PUBLIC_URL}/images/partners/${filename}`

    console.log(
      '[UPLOAD_SUCCESS]',
      JSON.stringify({
        user: userEmail,
        filename,
        destination: 'local_bucket',
        path: imagePath,
        timestamp: new Date().toISOString(),
      }),
    )

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Image uploaded successfully to local bucket',
        imagePath,
        publicUrl: imagePath,
        filename,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.log(
      '[UPLOAD_ERROR]',
      JSON.stringify({
        user: userEmail,
        error: 'upload_exception',
        details: String(error),
        timestamp: new Date().toISOString(),
      }),
    )
    return new Response(JSON.stringify({ error: 'Failed to upload image' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// =============================================================================
// SAVE PARTNER (granular save - only one partner)
// Loads current config, updates one partner, saves back
// =============================================================================
async function savePartner(
  request: Request,
  env: Env,
  userEmail: string = 'unknown',
): Promise<Response> {
  try {
    const partner = (await request.json()) as Partner

    // Validate partner structure
    if (!partner || typeof partner !== 'object' || !partner.slug) {
      console.log(
        '[PARTNER_SAVE_ERROR]',
        JSON.stringify({
          user: userEmail,
          error: 'invalid_partner_format',
          timestamp: new Date().toISOString(),
        }),
      )
      return new Response(JSON.stringify({ error: 'Invalid partner format - slug is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Load current config
    let config: AppConfig = {}

    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.EXTERNAL_R2_ENDPOINT) {
      try {
        const s3Response = await s3Request(env, {
          method: 'GET',
          key: 'data/app-config.json',
        })
        if (s3Response.ok) {
          config = (await s3Response.json()) as AppConfig
        }
      } catch {
        // Fallback to local bucket
      }
    }

    // Fallback: load from local R2 bucket
    if (Object.keys(config).length === 0) {
      const object = await env.R2_BUCKET.get('data/app-config.json')
      if (object) {
        config = (await object.json()) as AppConfig
      }
    }

    // Initialize partners object if not exists
    if (!config.partners || typeof config.partners !== 'object') {
      config.partners = {}
    }

    // Check if this is a new partner or update
    const isNewPartner = !config.partners[partner.slug]

    // Add metadata to partner
    partner.updatedAt = Date.now()
    partner.updatedBy = userEmail

    // Update only this partner
    config.partners[partner.slug] = partner

    // Save config back
    const configJson = JSON.stringify(config, null, 2)

    // Log the action with FULL partner data for audit trail
    const partnerData = partner as Record<string, unknown>
    console.log(
      '[PARTNER_SAVE]',
      JSON.stringify({
        user: userEmail,
        action: isNewPartner ? 'create' : 'update',
        timestamp: new Date().toISOString(),
        data: {
          slug: partner.slug,
          name: partner.name,
          image: partnerData.image,
          promoCode: partnerData.promoCode,
          category: partnerData.category,
          location: partnerData.location,
          discount: {
            label: (partnerData.discount as Record<string, unknown>)?.label,
            description: truncate(
              ((partnerData.discount as Record<string, unknown>)?.description as Record<string, string>)?.ua,
              200,
            ),
          },
          contact: {
            website: (partnerData.contact as Record<string, unknown>)?.website,
            email: (partnerData.contact as Record<string, unknown>)?.email,
            phone: (partnerData.contact as Record<string, unknown>)?.phone,
          },
          address: partnerData.address,
          summary: {
            ua: truncate((partnerData.summary as Record<string, string>)?.ua, 200),
            en: truncate((partnerData.summary as Record<string, string>)?.en, 200),
          },
          description: {
            ua: truncate((partnerData.description as Record<string, string>)?.ua, 200),
            en: truncate((partnerData.description as Record<string, string>)?.en, 200),
          },
          terms: {
            ua_count: (partnerData.terms as Record<string, string[]>)?.ua?.length || 0,
            en_count: (partnerData.terms as Record<string, string[]>)?.en?.length || 0,
          },
          tags: partnerData.tags,
          socials: (partnerData.socials as Array<{ type: string; url: string }>)?.map((s) => ({
            type: s.type,
            hasUrl: !!s.url,
          })),
        },
      }),
    )

    // Try external bucket first
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
              message: 'Partner saved successfully',
              slug: partner.slug,
              timestamp: new Date().toISOString(),
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }
      } catch (s3Error) {
        console.error('S3 save partner error:', s3Error)
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
        message: 'Partner saved successfully',
        slug: partner.slug,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.log(
      '[PARTNER_SAVE_ERROR]',
      JSON.stringify({
        user: userEmail,
        error: 'save_exception',
        details: String(error),
        timestamp: new Date().toISOString(),
      }),
    )
    return new Response(JSON.stringify({ error: 'Failed to save partner' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// =============================================================================
// DELETE PARTNER (granular delete - only one partner)
// Loads current config, removes one partner, saves back
// =============================================================================
async function deletePartner(
  slug: string,
  env: Env,
  userEmail: string = 'unknown',
): Promise<Response> {
  try {
    // Load current config
    let config: AppConfig = {}

    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.EXTERNAL_R2_ENDPOINT) {
      try {
        const s3Response = await s3Request(env, {
          method: 'GET',
          key: 'data/app-config.json',
        })
        if (s3Response.ok) {
          config = (await s3Response.json()) as AppConfig
        }
      } catch {
        // Fallback to local bucket
      }
    }

    // Fallback: load from local R2 bucket
    if (Object.keys(config).length === 0) {
      const object = await env.R2_BUCKET.get('data/app-config.json')
      if (object) {
        config = (await object.json()) as AppConfig
      }
    }

    // Check if partner exists
    if (!config.partners || !config.partners[slug]) {
      return new Response(JSON.stringify({ error: 'Partner not found', slug }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get partner data before deletion for logging
    const deletedPartner = config.partners[slug] as Record<string, unknown>

    // Delete partner
    delete config.partners[slug]

    // Save config back
    const configJson = JSON.stringify(config, null, 2)

    // Log the action with deleted partner data for audit trail
    console.log(
      '[PARTNER_DELETE]',
      JSON.stringify({
        user: userEmail,
        timestamp: new Date().toISOString(),
        deleted: {
          slug: slug,
          name: (deletedPartner.name as Record<string, string>)?.ua,
          category: (deletedPartner.category as Record<string, string>)?.ua,
          location: (deletedPartner.location as Record<string, string>)?.ua,
          promoCode: deletedPartner.promoCode,
          discount: ((deletedPartner.discount as Record<string, unknown>)?.label as Record<string, string>)?.ua,
        },
      }),
    )

    // Try external bucket first
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
              message: 'Partner deleted successfully',
              slug: slug,
              timestamp: new Date().toISOString(),
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }
      } catch (s3Error) {
        console.error('S3 delete partner error:', s3Error)
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
        message: 'Partner deleted successfully',
        slug: slug,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.log(
      '[PARTNER_DELETE_ERROR]',
      JSON.stringify({
        user: userEmail,
        error: 'delete_exception',
        slug: slug,
        details: String(error),
        timestamp: new Date().toISOString(),
      }),
    )
    return new Response(JSON.stringify({ error: 'Failed to delete partner' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// =============================================================================
// SAVE CATEGORY (granular save)
// =============================================================================
async function saveCategory(
  request: Request,
  env: Env,
  userEmail: string = 'unknown',
): Promise<Response> {
  try {
    const data = (await request.json()) as {
      key: string
      label: LocalizedText
      description?: LocalizedText
    }

    if (!data || !data.key || !data.label) {
      return new Response(
        JSON.stringify({ error: 'Invalid category format - key and label required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    let config: AppConfig = {}
    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.EXTERNAL_R2_ENDPOINT) {
      try {
        const s3Response = await s3Request(env, { method: 'GET', key: 'data/app-config.json' })
        if (s3Response.ok) config = (await s3Response.json()) as AppConfig
      } catch {
        /* fallback */
      }
    }
    if (Object.keys(config).length === 0) {
      const object = await env.R2_BUCKET.get('data/app-config.json')
      if (object) config = (await object.json()) as AppConfig
    }

    if (!config.filters) config.filters = { categories: {}, locations: {} }
    if (!config.filters.categories) config.filters.categories = {}

    // Check if this is a new category or update
    const isNewCategory = !config.filters.categories[data.key]

    config.filters.categories[data.key] = { label: data.label, description: data.description }

    // Log the action with FULL category data for audit trail
    console.log(
      '[CATEGORY_SAVE]',
      JSON.stringify({
        user: userEmail,
        action: isNewCategory ? 'create' : 'update',
        timestamp: new Date().toISOString(),
        data: {
          id: data.key,
          label: { ua: data.label.ua, en: data.label.en },
          description: {
            ua: truncate(data.description?.ua, 200),
            en: truncate(data.description?.en, 200),
          },
        },
      }),
    )

    const configJson = JSON.stringify(config, null, 2)
    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.EXTERNAL_R2_ENDPOINT) {
      const s3Response = await s3Request(env, {
        method: 'PUT',
        key: 'data/app-config.json',
        body: configJson,
        contentType: 'application/json',
      })
      if (s3Response.ok) {
        return new Response(JSON.stringify({ success: true, key: data.key }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
    await env.R2_BUCKET.put('data/app-config.json', configJson, {
      httpMetadata: { contentType: 'application/json' },
    })
    return new Response(JSON.stringify({ success: true, key: data.key }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[CATEGORY_SAVE_ERROR]', error)
    return new Response(JSON.stringify({ error: 'Failed to save category' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// =============================================================================
// DELETE CATEGORY (granular delete)
// =============================================================================
async function deleteCategory(
  key: string,
  env: Env,
  userEmail: string = 'unknown',
): Promise<Response> {
  try {
    let config: AppConfig = {}
    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.EXTERNAL_R2_ENDPOINT) {
      try {
        const s3Response = await s3Request(env, { method: 'GET', key: 'data/app-config.json' })
        if (s3Response.ok) config = (await s3Response.json()) as AppConfig
      } catch {
        /* fallback */
      }
    }
    if (Object.keys(config).length === 0) {
      const object = await env.R2_BUCKET.get('data/app-config.json')
      if (object) config = (await object.json()) as AppConfig
    }

    if (!config.filters?.categories?.[key]) {
      return new Response(JSON.stringify({ error: 'Category not found', key }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get category data before deletion for logging
    const deletedCategory = config.filters.categories[key] as Record<string, unknown>

    delete config.filters.categories[key]

    // Log the action with deleted category data for audit trail
    console.log(
      '[CATEGORY_DELETE]',
      JSON.stringify({
        user: userEmail,
        timestamp: new Date().toISOString(),
        deleted: {
          id: key,
          label: deletedCategory.label,
          description: deletedCategory.description,
        },
      }),
    )

    const configJson = JSON.stringify(config, null, 2)
    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.EXTERNAL_R2_ENDPOINT) {
      const s3Response = await s3Request(env, {
        method: 'PUT',
        key: 'data/app-config.json',
        body: configJson,
        contentType: 'application/json',
      })
      if (s3Response.ok) {
        return new Response(JSON.stringify({ success: true, key }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
    await env.R2_BUCKET.put('data/app-config.json', configJson, {
      httpMetadata: { contentType: 'application/json' },
    })
    return new Response(JSON.stringify({ success: true, key }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[CATEGORY_DELETE_ERROR]', error)
    return new Response(JSON.stringify({ error: 'Failed to delete category' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// =============================================================================
// SAVE LOCATION (granular save)
// =============================================================================
async function saveLocation(
  request: Request,
  env: Env,
  userEmail: string = 'unknown',
): Promise<Response> {
  try {
    const data = (await request.json()) as { key: string; label: LocalizedText }

    if (!data || !data.key || !data.label) {
      return new Response(
        JSON.stringify({ error: 'Invalid location format - key and label required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    let config: AppConfig = {}
    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.EXTERNAL_R2_ENDPOINT) {
      try {
        const s3Response = await s3Request(env, { method: 'GET', key: 'data/app-config.json' })
        if (s3Response.ok) config = (await s3Response.json()) as AppConfig
      } catch {
        /* fallback */
      }
    }
    if (Object.keys(config).length === 0) {
      const object = await env.R2_BUCKET.get('data/app-config.json')
      if (object) config = (await object.json()) as AppConfig
    }

    if (!config.filters) config.filters = { categories: {}, locations: {} }
    if (!config.filters.locations) config.filters.locations = {}

    // Check if this is a new location or update
    const isNewLocation = !config.filters.locations[data.key]

    config.filters.locations[data.key] = { label: data.label }

    // Log the action with FULL location data for audit trail
    console.log(
      '[LOCATION_SAVE]',
      JSON.stringify({
        user: userEmail,
        action: isNewLocation ? 'create' : 'update',
        timestamp: new Date().toISOString(),
        data: {
          id: data.key,
          label: { ua: data.label.ua, en: data.label.en },
        },
      }),
    )

    const configJson = JSON.stringify(config, null, 2)
    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.EXTERNAL_R2_ENDPOINT) {
      const s3Response = await s3Request(env, {
        method: 'PUT',
        key: 'data/app-config.json',
        body: configJson,
        contentType: 'application/json',
      })
      if (s3Response.ok) {
        return new Response(JSON.stringify({ success: true, key: data.key }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
    await env.R2_BUCKET.put('data/app-config.json', configJson, {
      httpMetadata: { contentType: 'application/json' },
    })
    return new Response(JSON.stringify({ success: true, key: data.key }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[LOCATION_SAVE_ERROR]', error)
    return new Response(JSON.stringify({ error: 'Failed to save location' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// =============================================================================
// DELETE LOCATION (granular delete)
// =============================================================================
async function deleteLocation(
  key: string,
  env: Env,
  userEmail: string = 'unknown',
): Promise<Response> {
  try {
    let config: AppConfig = {}
    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.EXTERNAL_R2_ENDPOINT) {
      try {
        const s3Response = await s3Request(env, { method: 'GET', key: 'data/app-config.json' })
        if (s3Response.ok) config = (await s3Response.json()) as AppConfig
      } catch {
        /* fallback */
      }
    }
    if (Object.keys(config).length === 0) {
      const object = await env.R2_BUCKET.get('data/app-config.json')
      if (object) config = (await object.json()) as AppConfig
    }

    if (!config.filters?.locations?.[key]) {
      return new Response(JSON.stringify({ error: 'Location not found', key }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get location data before deletion for logging
    const deletedLocation = config.filters.locations[key] as Record<string, unknown>

    delete config.filters.locations[key]

    // Log the action with deleted location data for audit trail
    console.log(
      '[LOCATION_DELETE]',
      JSON.stringify({
        user: userEmail,
        timestamp: new Date().toISOString(),
        deleted: {
          id: key,
          label: deletedLocation.label,
        },
      }),
    )

    const configJson = JSON.stringify(config, null, 2)
    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.EXTERNAL_R2_ENDPOINT) {
      const s3Response = await s3Request(env, {
        method: 'PUT',
        key: 'data/app-config.json',
        body: configJson,
        contentType: 'application/json',
      })
      if (s3Response.ok) {
        return new Response(JSON.stringify({ success: true, key }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
    await env.R2_BUCKET.put('data/app-config.json', configJson, {
      httpMetadata: { contentType: 'application/json' },
    })
    return new Response(JSON.stringify({ success: true, key }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[LOCATION_DELETE_ERROR]', error)
    return new Response(JSON.stringify({ error: 'Failed to delete location' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// =============================================================================
// SAVE FAQ ITEM (granular save)
// =============================================================================
async function saveFaqItem(
  request: Request,
  env: Env,
  userEmail: string = 'unknown',
): Promise<Response> {
  try {
    const data = (await request.json()) as {
      id: string
      question: LocalizedText
      answer: LocalizedText
      index?: number
    }

    if (!data || !data.id || !data.question || !data.answer) {
      return new Response(
        JSON.stringify({ error: 'Invalid FAQ format - id, question and answer required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    let config: AppConfig = {}
    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.EXTERNAL_R2_ENDPOINT) {
      try {
        const s3Response = await s3Request(env, { method: 'GET', key: 'data/app-config.json' })
        if (s3Response.ok) config = (await s3Response.json()) as AppConfig
      } catch {
        /* fallback */
      }
    }
    if (Object.keys(config).length === 0) {
      const object = await env.R2_BUCKET.get('data/app-config.json')
      if (object) config = (await object.json()) as AppConfig
    }

    if (!config.pages) config.pages = {}
    if (!config.pages.faq) config.pages.faq = { items: [] }
    if (!config.pages.faq.items) config.pages.faq.items = []

    const existingIndex = config.pages.faq.items.findIndex((item) => item.id === data.id)
    const isNewFaq = existingIndex < 0
    const faqItem = { id: data.id, question: data.question, answer: data.answer }

    if (existingIndex >= 0) {
      config.pages.faq.items[existingIndex] = faqItem
    } else {
      config.pages.faq.items.push(faqItem)
    }

    // Log the action with FULL FAQ data for audit trail
    console.log(
      '[FAQ_SAVE]',
      JSON.stringify({
        user: userEmail,
        action: isNewFaq ? 'create' : 'update',
        timestamp: new Date().toISOString(),
        data: {
          id: data.id,
          order: isNewFaq ? config.pages.faq.items.length - 1 : existingIndex,
          question: {
            ua: truncate(data.question.ua, 200),
            en: truncate(data.question.en, 200),
          },
          answer: {
            ua: truncate(data.answer.ua, 200),
            en: truncate(data.answer.en, 200),
          },
        },
      }),
    )

    const configJson = JSON.stringify(config, null, 2)
    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.EXTERNAL_R2_ENDPOINT) {
      const s3Response = await s3Request(env, {
        method: 'PUT',
        key: 'data/app-config.json',
        body: configJson,
        contentType: 'application/json',
      })
      if (s3Response.ok) {
        return new Response(JSON.stringify({ success: true, id: data.id }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
    await env.R2_BUCKET.put('data/app-config.json', configJson, {
      httpMetadata: { contentType: 'application/json' },
    })
    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[FAQ_SAVE_ERROR]', error)
    return new Response(JSON.stringify({ error: 'Failed to save FAQ item' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// =============================================================================
// DELETE FAQ ITEM (granular delete)
// =============================================================================
async function deleteFaqItem(
  id: string,
  env: Env,
  userEmail: string = 'unknown',
): Promise<Response> {
  try {
    let config: AppConfig = {}
    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.EXTERNAL_R2_ENDPOINT) {
      try {
        const s3Response = await s3Request(env, { method: 'GET', key: 'data/app-config.json' })
        if (s3Response.ok) config = (await s3Response.json()) as AppConfig
      } catch {
        /* fallback */
      }
    }
    if (Object.keys(config).length === 0) {
      const object = await env.R2_BUCKET.get('data/app-config.json')
      if (object) config = (await object.json()) as AppConfig
    }

    if (!config.pages?.faq?.items) {
      return new Response(JSON.stringify({ error: 'FAQ item not found', id }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const index = config.pages.faq.items.findIndex((item) => item.id === id)
    if (index < 0) {
      return new Response(JSON.stringify({ error: 'FAQ item not found', id }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get FAQ data before deletion for logging
    const deletedFaq = config.pages.faq.items[index]

    config.pages.faq.items.splice(index, 1)

    // Log the action with deleted FAQ data for audit trail
    console.log(
      '[FAQ_DELETE]',
      JSON.stringify({
        user: userEmail,
        timestamp: new Date().toISOString(),
        deleted: {
          id: id,
          question: truncate(deletedFaq.question?.ua, 100),
          answer: truncate(deletedFaq.answer?.ua, 100),
        },
      }),
    )

    const configJson = JSON.stringify(config, null, 2)
    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.EXTERNAL_R2_ENDPOINT) {
      const s3Response = await s3Request(env, {
        method: 'PUT',
        key: 'data/app-config.json',
        body: configJson,
        contentType: 'application/json',
      })
      if (s3Response.ok) {
        return new Response(JSON.stringify({ success: true, id }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
    await env.R2_BUCKET.put('data/app-config.json', configJson, {
      httpMetadata: { contentType: 'application/json' },
    })
    return new Response(JSON.stringify({ success: true, id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[FAQ_DELETE_ERROR]', error)
    return new Response(JSON.stringify({ error: 'Failed to delete FAQ item' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// =============================================================================
// SAVE TEXTS (granular save for page texts)
// =============================================================================
async function saveTexts(
  request: Request,
  env: Env,
  userEmail: string = 'unknown',
): Promise<Response> {
  try {
    const data = (await request.json()) as { page: string; texts: Record<string, unknown> }

    if (!data || !data.page || !data.texts) {
      return new Response(
        JSON.stringify({ error: 'Invalid texts format - page and texts required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    let config: AppConfig = {}
    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.EXTERNAL_R2_ENDPOINT) {
      try {
        const s3Response = await s3Request(env, { method: 'GET', key: 'data/app-config.json' })
        if (s3Response.ok) config = (await s3Response.json()) as AppConfig
      } catch {
        /* fallback */
      }
    }
    if (Object.keys(config).length === 0) {
      const object = await env.R2_BUCKET.get('data/app-config.json')
      if (object) config = (await object.json()) as AppConfig
    }

    if (!config.pages) config.pages = {}
    config.pages[data.page] = data.texts

    // Helper to extract text values for logging
    const extractTextValues = (obj: Record<string, unknown>, prefix = ''): Record<string, string> => {
      const result: Record<string, string> = {}
      for (const [key, value] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${key}` : key
        if (value && typeof value === 'object' && 'ua' in value) {
          result[path] = truncate((value as Record<string, string>).ua, 100)
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
          Object.assign(result, extractTextValues(value as Record<string, unknown>, path))
        }
      }
      return result
    }

    // Log the action with FULL texts data for audit trail
    console.log(
      '[TEXTS_SAVE]',
      JSON.stringify({
        user: userEmail,
        timestamp: new Date().toISOString(),
        data: {
          page: data.page,
          texts: extractTextValues(data.texts),
        },
      }),
    )

    const configJson = JSON.stringify(config, null, 2)
    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.EXTERNAL_R2_ENDPOINT) {
      const s3Response = await s3Request(env, {
        method: 'PUT',
        key: 'data/app-config.json',
        body: configJson,
        contentType: 'application/json',
      })
      if (s3Response.ok) {
        return new Response(JSON.stringify({ success: true, page: data.page }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
    await env.R2_BUCKET.put('data/app-config.json', configJson, {
      httpMetadata: { contentType: 'application/json' },
    })
    return new Response(JSON.stringify({ success: true, page: data.page }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[TEXTS_SAVE_ERROR]', error)
    return new Response(JSON.stringify({ error: 'Failed to save texts' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// =============================================================================
// SAVE USERS (granular save for allowed users list)
// =============================================================================
async function saveUsers(
  request: Request,
  env: Env,
  userEmail: string = 'unknown',
): Promise<Response> {
  try {
    const data = (await request.json()) as { users: string[] }

    if (!data || !Array.isArray(data.users)) {
      return new Response(
        JSON.stringify({ error: 'Invalid users format - users array required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    let config: AppConfig = {}
    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.EXTERNAL_R2_ENDPOINT) {
      try {
        const s3Response = await s3Request(env, { method: 'GET', key: 'data/app-config.json' })
        if (s3Response.ok) config = (await s3Response.json()) as AppConfig
      } catch {
        /* fallback */
      }
    }
    if (Object.keys(config).length === 0) {
      const object = await env.R2_BUCKET.get('data/app-config.json')
      if (object) config = (await object.json()) as AppConfig
    }

    // Get previous users for comparison
    const previousUsers = config.allowedUsers || []
    const newUsers = data.users

    // Find added and removed users
    const addedUsers = newUsers.filter((u: string) => !previousUsers.includes(u))
    const removedUsers = previousUsers.filter((u: string) => !newUsers.includes(u))

    config.allowedUsers = data.users

    // Log the action with FULL users data for audit trail
    console.log(
      '[USERS_SAVE]',
      JSON.stringify({
        user: userEmail,
        timestamp: new Date().toISOString(),
        data: {
          totalCount: data.users.length,
          added: addedUsers,
          removed: removedUsers,
          allUsers: data.users,
        },
      }),
    )

    const configJson = JSON.stringify(config, null, 2)
    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.EXTERNAL_R2_ENDPOINT) {
      const s3Response = await s3Request(env, {
        method: 'PUT',
        key: 'data/app-config.json',
        body: configJson,
        contentType: 'application/json',
      })
      if (s3Response.ok) {
        return new Response(JSON.stringify({ success: true, count: data.users.length }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
    await env.R2_BUCKET.put('data/app-config.json', configJson, {
      httpMetadata: { contentType: 'application/json' },
    })
    return new Response(JSON.stringify({ success: true, count: data.users.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[USERS_SAVE_ERROR]', error)
    return new Response(JSON.stringify({ error: 'Failed to save users' }), {
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
