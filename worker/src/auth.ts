/// <reference types="@cloudflare/workers-types" />

/**
 * Google ID Token verification via JWKS.
 * Validates RS256 signature, iss, aud, exp, and email_verified.
 */

interface JwksKey {
  kid: string
  n: string
  e: string
  kty: string
  alg?: string
  use?: string
}

interface JwksResponse {
  keys: JwksKey[]
}

export interface VerifiedUser {
  email: string
  name?: string
  picture?: string
  sub: string
}

/** Допустимі значення claim iss для Google ID Token. */
const VALID_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com'])

/** Запас часу для перевірки exp/iat (захист від рассинхронізації годинників). */
const CLOCK_SKEW_SECONDS = 60

/** TTL за замовчуванням якщо Cache-Control не повідомив max-age. */
const DEFAULT_JWKS_TTL_MS = 60 * 60 * 1000

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs'

let jwksCache: { keys: JwksKey[]; expiresAt: number } | null = null

function base64UrlToBytes(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=')
  const binary = atob(padded)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

function base64UrlToString(input: string): string {
  return new TextDecoder().decode(base64UrlToBytes(input))
}

async function fetchJwks(): Promise<JwksKey[]> {
  if (jwksCache && jwksCache.expiresAt > Date.now()) return jwksCache.keys

  const response = await fetch(GOOGLE_JWKS_URL, { cf: { cacheTtl: 3600, cacheEverything: true } })
  if (!response.ok) {
    throw new Error(`Failed to fetch Google JWKS: ${response.status}`)
  }

  const data = (await response.json()) as JwksResponse
  if (!data.keys?.length) {
    throw new Error('Empty JWKS response')
  }

  const cacheControl = response.headers.get('cache-control') ?? ''
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i)
  const ttlMs = maxAgeMatch && maxAgeMatch[1] ? parseInt(maxAgeMatch[1], 10) * 1000 : DEFAULT_JWKS_TTL_MS

  jwksCache = { keys: data.keys, expiresAt: Date.now() + ttlMs }
  return data.keys
}

/**
 * Verifies a Google ID Token and returns the authenticated user.
 * Throws on any validation failure — caller must respond 401.
 *
 * @param token - Raw JWT string from Authorization: Bearer header
 * @param expectedAudience - Google OAuth Client ID expected in aud claim
 */
export async function verifyGoogleIdToken(
  token: string,
  expectedAudience: string,
): Promise<VerifiedUser> {
  const parts = token.split('.')
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw new Error('Malformed token')
  }

  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string]

  let header: { kid?: string; alg?: string }
  let payload: {
    iss?: string
    aud?: string | string[]
    exp?: number
    iat?: number
    sub?: string
    email?: string
    email_verified?: boolean | string
    name?: string
    picture?: string
    hd?: string
  }

  try {
    header = JSON.parse(base64UrlToString(headerB64))
    payload = JSON.parse(base64UrlToString(payloadB64))
  } catch {
    throw new Error('Invalid token encoding')
  }

  if (header.alg !== 'RS256') {
    throw new Error(`Unsupported alg: ${header.alg}`)
  }
  if (!header.kid) {
    throw new Error('Missing kid in header')
  }

  // Claim checks (before signature — fast path для очевидно битых токенов).
  const now = Math.floor(Date.now() / 1000)

  if (!payload.iss || !VALID_ISSUERS.has(payload.iss)) {
    throw new Error(`Invalid issuer: ${payload.iss}`)
  }

  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
  if (!audiences.includes(expectedAudience)) {
    throw new Error('Invalid audience')
  }

  if (!payload.exp || payload.exp + CLOCK_SKEW_SECONDS < now) {
    throw new Error('Token expired')
  }
  if (payload.iat && payload.iat - CLOCK_SKEW_SECONDS > now) {
    throw new Error('Token issued in the future')
  }

  if (!payload.email) {
    throw new Error('Email missing')
  }
  // Google повертає email_verified як boolean або рядок "true".
  const emailVerified = payload.email_verified === true || payload.email_verified === 'true'
  if (!emailVerified) {
    throw new Error('Email not verified')
  }
  if (!payload.sub) {
    throw new Error('Subject missing')
  }

  // Signature verification.
  const jwks = await fetchJwks()
  let key = jwks.find((k) => k.kid === header.kid)
  if (!key) {
    // Спроба обновити кеш — ключі могли ротуватися.
    jwksCache = null
    const refreshed = await fetchJwks()
    key = refreshed.find((k) => k.kid === header.kid)
  }
  if (!key) {
    throw new Error('Signing key not found')
  }

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    { kty: key.kty, n: key.n, e: key.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  )

  const signatureBytes = base64UrlToBytes(signatureB64)
  const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`)

  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    signatureBytes,
    signedData,
  )
  if (!valid) {
    throw new Error('Invalid signature')
  }

  return {
    email: payload.email.toLowerCase(),
    name: payload.name,
    picture: payload.picture,
    sub: payload.sub,
  }
}
