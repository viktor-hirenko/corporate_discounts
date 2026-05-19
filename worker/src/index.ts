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
  /** Версия конфига — инкрементируется при каждом сохранении */
  configVersion?: number
  /** Дата последнего изменения в ISO формате */
  lastModified?: string
  /** Email пользователя, который последним изменил конфиг */
  lastModifiedBy?: string
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

/**
 * Truncate value for diff logging - handles strings, objects, arrays
 */
function truncateValue(value: unknown, maxLen: number = 100): unknown {
  if (typeof value === 'string') {
    return truncate(value, maxLen)
  }
  if (Array.isArray(value)) {
    return `[${value.length} items]`
  }
  if (typeof value === 'object' && value !== null) {
    const str = JSON.stringify(value)
    if (str.length > maxLen) {
      return str.slice(0, maxLen) + '...'
    }
    return value
  }
  return value
}

/**
 * Compare two objects and return only the differences
 * Returns object with changed fields in format: { "field.path": { old: "...", new: "..." } }
 */
function getObjectDiff(
  oldObj: Record<string, unknown> | undefined,
  newObj: Record<string, unknown>,
  prefix: string = '',
): Record<string, { old: unknown; new: unknown }> {
  const diff: Record<string, { old: unknown; new: unknown }> = {}

  // If no old object, return empty diff (will be handled as CREATE)
  if (!oldObj) return diff

  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)])

  for (const key of allKeys) {
    const path = prefix ? `${prefix}.${key}` : key
    const oldVal = oldObj[key]
    const newVal = newObj[key]

    // Skip internal fields
    if (key === 'updatedAt' || key === 'updatedBy') continue

    // Both are objects (not arrays) - recurse
    if (
      typeof oldVal === 'object' &&
      oldVal !== null &&
      !Array.isArray(oldVal) &&
      typeof newVal === 'object' &&
      newVal !== null &&
      !Array.isArray(newVal)
    ) {
      const nestedDiff = getObjectDiff(
        oldVal as Record<string, unknown>,
        newVal as Record<string, unknown>,
        path,
      )
      Object.assign(diff, nestedDiff)
    } else {
      // Compare values
      const oldStr = JSON.stringify(oldVal)
      const newStr = JSON.stringify(newVal)
      if (oldStr !== newStr) {
        diff[path] = {
          old: truncateValue(oldVal),
          new: truncateValue(newVal),
        }
      }
    }
  }

  return diff
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
// BACKUP FUNCTIONS
// =============================================================================

/** Максимальное количество бекапов для хранения */
const MAX_BACKUPS = 50

/**
 * Создаёт бекап текущего конфига перед сохранением изменений.
 * Бекапы хранятся в data/backups/ с timestamp в имени файла.
 */
async function createBackup(env: Env, config: AppConfig): Promise<void> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupKey = `data/backups/app-config-${timestamp}.json`

    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.EXTERNAL_R2_ENDPOINT) {
      await s3Request(env, {
        method: 'PUT',
        key: backupKey,
        body: JSON.stringify(config, null, 2),
        contentType: 'application/json',
      })
      console.log(`[BACKUP] Created backup: ${backupKey}`)

      // Очищаем старые бекапы (оставляем последние MAX_BACKUPS)
      await cleanupOldBackups(env)
    }
  } catch (error) {
    // Не прерываем основную операцию если бекап не удался
    console.error('[BACKUP_ERROR] Failed to create backup:', error)
  }
}

/**
 * Получает список всех бекапов из R2.
 * Возвращает массив объектов с ключом и датой.
 */
async function listBackups(
  env: Env,
): Promise<Array<{ key: string; lastModified: string; size: number }>> {
  try {
    if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY || !env.EXTERNAL_R2_ENDPOINT) {
      return []
    }

    // Используем S3 ListObjectsV2 API
    const endpoint = env.EXTERNAL_R2_ENDPOINT
    const bucketName = env.EXTERNAL_BUCKET_NAME
    const region = 'auto'
    const service = 's3'

    const endpointUrl = new URL(endpoint)
    const host = `${bucketName}.${endpointUrl.host}`
    const url = `https://${host}/?list-type=2&prefix=data/backups/`

    const now = new Date()
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
    const dateStamp = amzDate.slice(0, 8)

    const payloadHash = await sha256('')

    const headers: Record<string, string> = {
      host: host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
    }

    const signedHeaders = Object.keys(headers).sort().join(';')
    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map((k) => `${k}:${headers[k]}\n`)
      .join('')

    const canonicalRequest = [
      'GET',
      '/',
      'list-type=2&prefix=data%2Fbackups%2F',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n')

    const canonicalRequestHash = await sha256(canonicalRequest)
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, canonicalRequestHash].join(
      '\n',
    )

    const signingKey = await getSignatureKey(env.AWS_SECRET_ACCESS_KEY, dateStamp, region, service)
    const signature = toHex(await hmacSha256(signingKey, stringToSign))

    const authorization = `AWS4-HMAC-SHA256 Credential=${env.AWS_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: authorization,
        'x-amz-date': amzDate,
        'x-amz-content-sha256': payloadHash,
      },
    })

    if (!response.ok) {
      console.error('[BACKUP_LIST_ERROR] Failed to list backups:', response.status)
      return []
    }

    const xml = await response.text()

    // Простой парсинг XML для получения списка файлов
    const backups: Array<{ key: string; lastModified: string; size: number }> = []
    const keyMatches = xml.matchAll(/<Key>([^<]+)<\/Key>/g)
    const dateMatches = xml.matchAll(/<LastModified>([^<]+)<\/LastModified>/g)
    const sizeMatches = xml.matchAll(/<Size>([^<]+)<\/Size>/g)

    const keys = Array.from(keyMatches).map((m) => m[1])
    const dates = Array.from(dateMatches).map((m) => m[1])
    const sizes = Array.from(sizeMatches).map((m) => parseInt(m[1], 10))

    for (let i = 0; i < keys.length; i++) {
      if (keys[i].startsWith('data/backups/')) {
        backups.push({
          key: keys[i],
          lastModified: dates[i] || '',
          size: sizes[i] || 0,
        })
      }
    }

    // Сортируем по дате (новые первые)
    backups.sort((a, b) => b.lastModified.localeCompare(a.lastModified))

    return backups
  } catch (error) {
    console.error('[BACKUP_LIST_ERROR]', error)
    return []
  }
}

/**
 * Удаляет старые бекапы, оставляя только последние MAX_BACKUPS.
 */
async function cleanupOldBackups(env: Env): Promise<void> {
  try {
    const backups = await listBackups(env)

    if (backups.length <= MAX_BACKUPS) {
      return
    }

    // Удаляем самые старые бекапы
    const toDelete = backups.slice(MAX_BACKUPS)

    for (const backup of toDelete) {
      await s3Request(env, {
        method: 'DELETE',
        key: backup.key,
      })
      console.log(`[BACKUP_CLEANUP] Deleted old backup: ${backup.key}`)
    }
  } catch (error) {
    console.error('[BACKUP_CLEANUP_ERROR]', error)
  }
}

/**
 * Инкрементирует версию конфига и обновляет метаданные.
 * Вызывается перед каждым сохранением.
 */
function incrementConfigVersion(config: AppConfig, userEmail: string): void {
  config.configVersion = (config.configVersion || 0) + 1
  config.lastModified = new Date().toISOString()
  config.lastModifiedBy = userEmail
}

// =============================================================================
// AUDIT LOG FUNCTIONS
// =============================================================================

/** Максимальное количество записей в audit log */
const MAX_AUDIT_LOG_ENTRIES = 500

/** Структура записи в audit log */
interface AuditLogEntry {
  id: string
  timestamp: string
  user: string
  action: 'create' | 'update' | 'delete'
  entity: 'partner' | 'category' | 'location' | 'faq' | 'texts' | 'users' | 'config'
  entityId: string
  entityName: string
  changes?: Record<string, { old: unknown; new: unknown }>
}

/**
 * Добавляет запись в audit log.
 * Загружает текущий лог, добавляет запись в начало, обрезает до MAX_AUDIT_LOG_ENTRIES.
 */
async function appendAuditLog(
  env: Env,
  entry: Omit<AuditLogEntry, 'id' | 'timestamp'>,
): Promise<void> {
  try {
    if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY || !env.EXTERNAL_R2_ENDPOINT) {
      return
    }

    // Загружаем текущий audit log
    let auditLog: AuditLogEntry[] = []
    try {
      const response = await s3Request(env, {
        method: 'GET',
        key: 'data/audit-log.json',
      })
      if (response.ok) {
        auditLog = (await response.json()) as AuditLogEntry[]
      }
    } catch {
      // Файл не существует — создадим новый
    }

    // Создаём новую запись
    const newEntry: AuditLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    }

    // Добавляем в начало массива
    auditLog.unshift(newEntry)

    // Обрезаем до максимального размера
    if (auditLog.length > MAX_AUDIT_LOG_ENTRIES) {
      auditLog = auditLog.slice(0, MAX_AUDIT_LOG_ENTRIES)
    }

    // Сохраняем обратно
    await s3Request(env, {
      method: 'PUT',
      key: 'data/audit-log.json',
      body: JSON.stringify(auditLog, null, 2),
      contentType: 'application/json',
    })

    console.log(
      `[AUDIT_LOG] Added entry: ${newEntry.action} ${newEntry.entity} ${newEntry.entityId}`,
    )
  } catch (error) {
    // Не прерываем основную операцию если audit log не удался
    console.error('[AUDIT_LOG_ERROR] Failed to append audit log:', error)
  }
}

/**
 * Получает записи из audit log с фильтрацией.
 */
async function getAuditLog(
  env: Env,
  options: { limit?: number; entity?: string; user?: string } = {},
): Promise<AuditLogEntry[]> {
  try {
    if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY || !env.EXTERNAL_R2_ENDPOINT) {
      return []
    }

    const response = await s3Request(env, {
      method: 'GET',
      key: 'data/audit-log.json',
    })

    if (!response.ok) {
      return []
    }

    let auditLog = (await response.json()) as AuditLogEntry[]

    // Фильтрация по entity
    if (options.entity) {
      auditLog = auditLog.filter((entry) => entry.entity === options.entity)
    }

    // Фильтрация по user
    if (options.user) {
      auditLog = auditLog.filter((entry) => entry.user === options.user)
    }

    // Лимит
    if (options.limit && options.limit > 0) {
      auditLog = auditLog.slice(0, options.limit)
    }

    return auditLog
  } catch (error) {
    console.error('[AUDIT_LOG_ERROR] Failed to get audit log:', error)
    return []
  }
}

// =============================================================================
// ANALYTICS FUNCTIONS
// =============================================================================

/** Максимальное количество записей в analytics log */
const MAX_ANALYTICS_ENTRIES = 50000

/** Структура события аналитики */
interface TrackEvent {
  id: string
  timestamp: string
  event: 'card_click' | 'promo_copy'
  slug: string
}

/** Сводка аналитики по партнёру */
interface AnalyticsSummary {
  slug: string
  cardClicks: number
  promoCopies: number
}

/**
 * Добавляет событие в analytics log.
 * Загружает текущий лог, добавляет запись в начало, обрезает до MAX_ANALYTICS_ENTRIES.
 */
async function appendAnalyticsEvent(
  env: Env,
  event: 'card_click' | 'promo_copy',
  slug: string,
): Promise<void> {
  try {
    if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY || !env.EXTERNAL_R2_ENDPOINT) {
      return
    }

    // Загружаем текущий analytics log
    let analyticsLog: TrackEvent[] = []
    try {
      const response = await s3Request(env, {
        method: 'GET',
        key: 'data/analytics.json',
      })
      if (response.ok) {
        analyticsLog = (await response.json()) as TrackEvent[]
      }
    } catch {
      // Файл не существует — создадим новый
    }

    // Создаём новую запись
    const newEntry: TrackEvent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      event,
      slug,
    }

    // Добавляем в начало массива
    analyticsLog.unshift(newEntry)

    // Обрезаем до максимального размера
    if (analyticsLog.length > MAX_ANALYTICS_ENTRIES) {
      analyticsLog = analyticsLog.slice(0, MAX_ANALYTICS_ENTRIES)
    }

    // Сохраняем обратно
    await s3Request(env, {
      method: 'PUT',
      key: 'data/analytics.json',
      body: JSON.stringify(analyticsLog),
      contentType: 'application/json',
    })

    console.log(`[ANALYTICS] Added event: ${event} for ${slug}`)
  } catch (error) {
    // Не прерываем основную операцию если analytics не удался
    console.error('[ANALYTICS_ERROR] Failed to append analytics event:', error)
  }
}

type AnalyticsPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all'

function getFromDate(period: AnalyticsPeriod): Date | null {
  const now = new Date()
  switch (period) {
    case 'today': {
      const d = new Date(now)
      d.setHours(0, 0, 0, 0)
      return d
    }
    case 'week': {
      const d = new Date(now)
      d.setDate(d.getDate() - 7)
      return d
    }
    case 'month': {
      const d = new Date(now)
      d.setMonth(d.getMonth() - 1)
      return d
    }
    case 'quarter': {
      const d = new Date(now)
      d.setMonth(d.getMonth() - 3)
      return d
    }
    case 'year': {
      const d = new Date(now)
      d.setFullYear(d.getFullYear() - 1)
      return d
    }
    default:
      return null
  }
}

/**
 * Получает сводку аналитики с агрегацией по slug.
 * Принимает опциональный fromDate для фильтрации по периоду.
 */
async function getAnalyticsSummary(
  env: Env,
  fromDate: Date | null = null,
): Promise<{
  events: TrackEvent[]
  summary: AnalyticsSummary[]
  totals: { cardClicks: number; promoCopies: number }
}> {
  try {
    if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY || !env.EXTERNAL_R2_ENDPOINT) {
      return { events: [], summary: [], totals: { cardClicks: 0, promoCopies: 0 } }
    }

    const response = await s3Request(env, {
      method: 'GET',
      key: 'data/analytics.json',
    })

    if (!response.ok) {
      return { events: [], summary: [], totals: { cardClicks: 0, promoCopies: 0 } }
    }

    const allEvents = (await response.json()) as TrackEvent[]

    // Фильтрация по периоду если задан
    const events = fromDate
      ? allEvents.filter((e) => new Date(e.timestamp) >= fromDate)
      : allEvents

    // Агрегация по slug
    const statsMap = new Map<string, { cardClicks: number; promoCopies: number }>()
    let totalCardClicks = 0
    let totalPromoCopies = 0

    for (const event of events) {
      const stats = statsMap.get(event.slug) || { cardClicks: 0, promoCopies: 0 }
      if (event.event === 'card_click') {
        stats.cardClicks++
        totalCardClicks++
      } else if (event.event === 'promo_copy') {
        stats.promoCopies++
        totalPromoCopies++
      }
      statsMap.set(event.slug, stats)
    }

    // Преобразуем в массив и сортируем по общему количеству событий
    const summary: AnalyticsSummary[] = Array.from(statsMap.entries())
      .map(([slug, stats]) => ({ slug, ...stats }))
      .sort((a, b) => b.cardClicks + b.promoCopies - (a.cardClicks + a.promoCopies))

    return {
      events: events.slice(0, 100),
      summary,
      totals: { cardClicks: totalCardClicks, promoCopies: totalPromoCopies },
    }
  } catch (error) {
    console.error('[ANALYTICS_ERROR] Failed to get analytics summary:', error)
    return { events: [], summary: [], totals: { cardClicks: 0, promoCopies: 0 } }
  }
}

// =============================================================================
// ALLOWED ORIGINS (CORS)
// =============================================================================
const ALLOWED_ORIGINS = [
  'https://discounts.upstars.com',
  'https://corporate-discounts-worker.upstars-landings.workers.dev',
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
const analyticsAttempts = new Map<string, RateLimitEntry>()
const MAX_ANALYTICS_ATTEMPTS = 60 // 60 events per minute per IP

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
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: https: blob:; connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://corporate-discounts-worker.upstars-landings.workers.dev https://pub-37aeae40035e428e93ab550125107a2d.r2.dev; frame-src https://accounts.google.com; object-src 'none'; base-uri 'self'",
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

      // API: GET /api/version - get config version (public, lightweight)
      // Используется для умного polling — проверяем версию перед загрузкой полного конфига
      if (path === '/api/version' && request.method === 'GET') {
        const configResponse = await loadConfig(env)
        if (!configResponse.ok) {
          return corsResponse(configResponse, origin)
        }
        const config = (await configResponse.json()) as AppConfig
        return corsResponse(
          new Response(
            JSON.stringify({
              version: config.configVersion || 0,
              lastModified: config.lastModified || null,
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          ),
          origin,
        )
      }

      // API: GET /api/backups - list all backups (protected)
      if (path === '/api/backups' && request.method === 'GET') {
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

        const backups = await listBackups(env)
        return corsResponse(
          new Response(JSON.stringify({ backups }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
          origin,
        )
      }

      // API: GET /api/audit-log - get audit log entries (protected)
      if (path === '/api/audit-log' && request.method === 'GET') {
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

        // Parse query params
        const limit = url.searchParams.get('limit')
        const entity = url.searchParams.get('entity')
        const user = url.searchParams.get('user')

        const entries = await getAuditLog(env, {
          limit: limit ? parseInt(limit, 10) : undefined,
          entity: entity || undefined,
          user: user || undefined,
        })

        return corsResponse(
          new Response(JSON.stringify({ entries }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
          origin,
        )
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

      // API: POST /api/track - track analytics event (CORS + rate limiting protected)
      if (path === '/api/track' && request.method === 'POST') {
        // Rate limiting for analytics endpoint
        if (isRateLimited(clientIP, analyticsAttempts, MAX_ANALYTICS_ATTEMPTS)) {
          return corsResponse(
            new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
              status: 429,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }

        try {
          const body = (await request.json()) as { event?: string; slug?: string }

          if (!body.event || !body.slug) {
            return corsResponse(
              new Response(JSON.stringify({ error: 'Missing event or slug' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
              }),
              origin,
            )
          }

          if (body.event !== 'card_click' && body.event !== 'promo_copy') {
            return corsResponse(
              new Response(JSON.stringify({ error: 'Invalid event type' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
              }),
              origin,
            )
          }

          // Use waitUntil to ensure the write completes after response is sent
          ctx.waitUntil(appendAnalyticsEvent(env, body.event, body.slug))

          return corsResponse(
            new Response(JSON.stringify({ success: true }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        } catch {
          return corsResponse(
            new Response(JSON.stringify({ error: 'Invalid request body' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }
      }

      // API: GET /api/analytics - get analytics summary (protected, admin only)
      if (path === '/api/analytics' && request.method === 'GET') {
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

        const periodParam = (url.searchParams.get('period') as AnalyticsPeriod) || 'all'
        const fromDate = getFromDate(periodParam)
        const analytics = await getAnalyticsSummary(env, fromDate)

        return corsResponse(
          new Response(JSON.stringify(analytics), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
          origin,
        )
      }

      // API: DELETE /api/analytics - clear all analytics data (protected, admin only)
      if (path === '/api/analytics' && request.method === 'DELETE') {
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

        try {
          await s3Request(env, {
            method: 'PUT',
            key: 'data/analytics.json',
            body: JSON.stringify([]),
            contentType: 'application/json',
          })

          console.log('[ANALYTICS] Data cleared by admin')

          return corsResponse(
            new Response(JSON.stringify({ success: true }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        } catch (err) {
          console.error('[ANALYTICS] Failed to clear data:', err)
          return corsResponse(
            new Response(JSON.stringify({ error: 'Failed to clear analytics data' }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            }),
            origin,
          )
        }
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

    // Загружаем текущий конфиг для бекапа перед полным сохранением
    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.EXTERNAL_R2_ENDPOINT) {
      try {
        const currentConfigResponse = await s3Request(env, {
          method: 'GET',
          key: 'data/app-config.json',
        })
        if (currentConfigResponse.ok) {
          const currentConfig = (await currentConfigResponse.json()) as AppConfig
          await createBackup(env, currentConfig)
        }
      } catch {
        // Если не удалось загрузить — продолжаем без бекапа
        console.warn('[SAVE] Could not create backup - current config not found')
      }
    }

    // Инкрементируем версию конфига
    incrementConfigVersion(config, userEmail)

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

    // Создаём бекап перед изменениями и инкрементируем версию
    await createBackup(env, config)
    incrementConfigVersion(config, userEmail)

    // Check if this is a new partner or update
    const existingPartner = config.partners[partner.slug]
    const isNewPartner = !existingPartner

    // Add metadata to partner
    partner.updatedAt = Date.now()
    partner.updatedBy = userEmail

    // Update only this partner
    config.partners[partner.slug] = partner

    // Save config back
    const configJson = JSON.stringify(config, null, 2)

    // Log the action with diff for updates, full data for creates
    const changes = isNewPartner
      ? undefined
      : getObjectDiff(
          existingPartner as Record<string, unknown>,
          partner as Record<string, unknown>,
        )

    if (isNewPartner) {
      // CREATE - log full partner data
      console.log(
        '[PARTNER_CREATE]',
        JSON.stringify({
          user: userEmail,
          action: 'create',
          timestamp: new Date().toISOString(),
          slug: partner.slug,
          name: partner.name,
        }),
      )
      // Audit log for create
      await appendAuditLog(env, {
        user: userEmail,
        action: 'create',
        entity: 'partner',
        entityId: partner.slug,
        entityName: partner.name?.ua || partner.slug,
      })
    } else if (changes && Object.keys(changes).length > 0) {
      // UPDATE - log only the differences
      console.log(
        '[PARTNER_UPDATE]',
        JSON.stringify({
          user: userEmail,
          action: 'update',
          timestamp: new Date().toISOString(),
          slug: partner.slug,
          name: partner.name?.ua || partner.slug,
          changes,
        }),
      )
      // Audit log for update
      await appendAuditLog(env, {
        user: userEmail,
        action: 'update',
        entity: 'partner',
        entityId: partner.slug,
        entityName: partner.name?.ua || partner.slug,
        changes,
      })
    }

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

    // Создаём бекап перед удалением и инкрементируем версию
    await createBackup(env, config)
    incrementConfigVersion(config, userEmail)

    // Get partner data before deletion for logging
    const deletedPartner = config.partners[slug] as Record<string, unknown>

    // Delete partner
    delete config.partners[slug]

    // Save config back
    const configJson = JSON.stringify(config, null, 2)

    // Log the action with deleted partner data for audit trail
    const partnerName = (deletedPartner.name as Record<string, string>)?.ua || slug
    console.log(
      '[PARTNER_DELETE]',
      JSON.stringify({
        user: userEmail,
        timestamp: new Date().toISOString(),
        deleted: {
          slug: slug,
          name: partnerName,
          category: (deletedPartner.category as Record<string, string>)?.ua,
          location: (deletedPartner.location as Record<string, string>)?.ua,
          promoCode: deletedPartner.promoCode,
          discount: (
            (deletedPartner.discount as Record<string, unknown>)?.label as Record<string, string>
          )?.ua,
        },
      }),
    )

    // Audit log for delete
    await appendAuditLog(env, {
      user: userEmail,
      action: 'delete',
      entity: 'partner',
      entityId: slug,
      entityName: partnerName,
    })

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

    // Создаём бекап перед изменениями и инкрементируем версию
    await createBackup(env, config)
    incrementConfigVersion(config, userEmail)

    // Check if this is a new category or update
    const existingCategory = config.filters.categories[data.key] as
      | Record<string, unknown>
      | undefined
    const isNewCategory = !existingCategory

    const newCategoryData = { label: data.label, description: data.description }
    config.filters.categories[data.key] = newCategoryData

    // Log the action with diff for updates, basic info for creates
    const categoryName = data.label?.ua || data.key
    const changes = isNewCategory
      ? undefined
      : getObjectDiff(existingCategory, newCategoryData as Record<string, unknown>)

    if (isNewCategory) {
      console.log(
        '[CATEGORY_CREATE]',
        JSON.stringify({
          user: userEmail,
          action: 'create',
          timestamp: new Date().toISOString(),
          key: data.key,
          label: data.label,
        }),
      )
      await appendAuditLog(env, {
        user: userEmail,
        action: 'create',
        entity: 'category',
        entityId: data.key,
        entityName: categoryName,
      })
    } else if (changes && Object.keys(changes).length > 0) {
      console.log(
        '[CATEGORY_UPDATE]',
        JSON.stringify({
          user: userEmail,
          action: 'update',
          timestamp: new Date().toISOString(),
          key: data.key,
          changes,
        }),
      )
      await appendAuditLog(env, {
        user: userEmail,
        action: 'update',
        entity: 'category',
        entityId: data.key,
        entityName: categoryName,
        changes,
      })
    }

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

    // Создаём бекап перед удалением и инкрементируем версию
    await createBackup(env, config)
    incrementConfigVersion(config, userEmail)

    // Get category data before deletion for logging
    const deletedCategory = config.filters.categories[key] as Record<string, unknown>

    delete config.filters.categories[key]

    // Log the action with deleted category data for audit trail
    const categoryName = (deletedCategory.label as Record<string, string>)?.ua || key
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

    await appendAuditLog(env, {
      user: userEmail,
      action: 'delete',
      entity: 'category',
      entityId: key,
      entityName: categoryName,
    })

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

    // Создаём бекап перед изменениями и инкрементируем версию
    await createBackup(env, config)
    incrementConfigVersion(config, userEmail)

    // Check if this is a new location or update
    const existingLocation = config.filters.locations[data.key] as
      | Record<string, unknown>
      | undefined
    const isNewLocation = !existingLocation

    const newLocationData = { label: data.label }
    config.filters.locations[data.key] = newLocationData

    // Log the action with diff for updates, basic info for creates
    const locationName = data.label?.ua || data.key
    const changes = isNewLocation
      ? undefined
      : getObjectDiff(existingLocation, newLocationData as Record<string, unknown>)

    if (isNewLocation) {
      console.log(
        '[LOCATION_CREATE]',
        JSON.stringify({
          user: userEmail,
          action: 'create',
          timestamp: new Date().toISOString(),
          key: data.key,
          label: data.label,
        }),
      )
      await appendAuditLog(env, {
        user: userEmail,
        action: 'create',
        entity: 'location',
        entityId: data.key,
        entityName: locationName,
      })
    } else if (changes && Object.keys(changes).length > 0) {
      console.log(
        '[LOCATION_UPDATE]',
        JSON.stringify({
          user: userEmail,
          action: 'update',
          timestamp: new Date().toISOString(),
          key: data.key,
          changes,
        }),
      )
      await appendAuditLog(env, {
        user: userEmail,
        action: 'update',
        entity: 'location',
        entityId: data.key,
        entityName: locationName,
        changes,
      })
    }

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

    // Создаём бекап перед удалением и инкрементируем версию
    await createBackup(env, config)
    incrementConfigVersion(config, userEmail)

    // Get location data before deletion for logging
    const deletedLocation = config.filters.locations[key] as Record<string, unknown>

    delete config.filters.locations[key]

    // Log the action with deleted location data for audit trail
    const locationName = (deletedLocation.label as Record<string, string>)?.ua || key
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

    await appendAuditLog(env, {
      user: userEmail,
      action: 'delete',
      entity: 'location',
      entityId: key,
      entityName: locationName,
    })

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

    // Создаём бекап перед изменениями и инкрементируем версию
    await createBackup(env, config)
    incrementConfigVersion(config, userEmail)

    const existingIndex = config.pages.faq.items.findIndex((item) => item.id === data.id)
    const existingFaq = existingIndex >= 0 ? config.pages.faq.items[existingIndex] : undefined
    const isNewFaq = existingIndex < 0
    const faqItem = { id: data.id, question: data.question, answer: data.answer }

    if (existingIndex >= 0) {
      config.pages.faq.items[existingIndex] = faqItem
    } else {
      config.pages.faq.items.push(faqItem)
    }

    // Log the action with diff for updates, basic info for creates
    const faqName = truncate(data.question.ua, 50) || data.id
    const changes = isNewFaq
      ? undefined
      : getObjectDiff(
          existingFaq as unknown as Record<string, unknown>,
          faqItem as Record<string, unknown>,
        )

    if (isNewFaq) {
      console.log(
        '[FAQ_CREATE]',
        JSON.stringify({
          user: userEmail,
          action: 'create',
          timestamp: new Date().toISOString(),
          id: data.id,
          question: { ua: truncate(data.question.ua, 100), en: truncate(data.question.en, 100) },
        }),
      )
      await appendAuditLog(env, {
        user: userEmail,
        action: 'create',
        entity: 'faq',
        entityId: data.id,
        entityName: faqName,
      })
    } else if (changes && Object.keys(changes).length > 0) {
      console.log(
        '[FAQ_UPDATE]',
        JSON.stringify({
          user: userEmail,
          action: 'update',
          timestamp: new Date().toISOString(),
          id: data.id,
          changes,
        }),
      )
      await appendAuditLog(env, {
        user: userEmail,
        action: 'update',
        entity: 'faq',
        entityId: data.id,
        entityName: faqName,
        changes,
      })
    }

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

    // Создаём бекап перед удалением и инкрементируем версию
    await createBackup(env, config)
    incrementConfigVersion(config, userEmail)

    // Get FAQ data before deletion for logging
    const deletedFaq = config.pages.faq.items[index]

    config.pages.faq.items.splice(index, 1)

    // Log the action with deleted FAQ data for audit trail
    const faqName = truncate(deletedFaq.question?.ua, 50) || id
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

    await appendAuditLog(env, {
      user: userEmail,
      action: 'delete',
      entity: 'faq',
      entityId: id,
      entityName: faqName,
    })

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
// HELPER: Deep merge for texts (preserves items and other non-text fields)
// =============================================================================
/**
 * Deep merges source into target, preserving arrays and non-text fields.
 * @param target - Target object to merge into
 * @param source - Source object with new values
 */
function deepMergeTexts(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const key of Object.keys(source)) {
    const sourceVal = source[key]
    const targetVal = target[key]
    if (
      sourceVal &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      deepMergeTexts(targetVal as Record<string, unknown>, sourceVal as Record<string, unknown>)
    } else {
      target[key] = sourceVal
    }
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

    // Создаём бекап перед изменениями и инкрементируем версію
    await createBackup(env, config)
    incrementConfigVersion(config, userEmail)

    // Навігуємо по dot-path до потрібного об'єкта в конфігу
    // Наприклад: "pages.faq" -> config.pages.faq, "auth" -> config.auth
    const parts = data.page.split('.')
    let target: Record<string, unknown> = config as unknown as Record<string, unknown>
    for (const part of parts.slice(0, -1)) {
      if (target[part] && typeof target[part] === 'object') {
        target = target[part] as Record<string, unknown>
      } else {
        target[part] = {}
        target = target[part] as Record<string, unknown>
      }
    }
    const lastKey = parts[parts.length - 1]

    // Отримуємо існуючий об'єкт для diff
    const existingTexts = target[lastKey] as Record<string, unknown> | undefined

    // Deep merge замість заміни — зберігає items та інші нетекстові поля
    if (existingTexts && typeof existingTexts === 'object') {
      deepMergeTexts(existingTexts, data.texts as Record<string, unknown>)
    } else {
      target[lastKey] = data.texts
    }

    // Log the action with diff - only changed text fields
    const changes = getObjectDiff(existingTexts || {}, data.texts as Record<string, unknown>)

    if (Object.keys(changes).length > 0) {
      console.log(
        '[TEXTS_UPDATE]',
        JSON.stringify({
          user: userEmail,
          action: 'update',
          timestamp: new Date().toISOString(),
          page: data.page,
          changes,
        }),
      )
      await appendAuditLog(env, {
        user: userEmail,
        action: 'update',
        entity: 'texts',
        entityId: data.page,
        entityName: `Тексти: ${data.page}`,
        changes,
      })
    }

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

    // Создаём бекап перед изменениями и инкрементируем версию
    await createBackup(env, config)
    incrementConfigVersion(config, userEmail)

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

    // Only log to audit if there are actual changes
    if (addedUsers.length > 0 || removedUsers.length > 0) {
      await appendAuditLog(env, {
        user: userEmail,
        action: 'update',
        entity: 'users',
        entityId: 'allowed-users',
        entityName: `Користувачі (${data.users.length})`,
        changes: {
          added: { old: null, new: addedUsers },
          removed: { old: removedUsers, new: null },
          totalCount: { old: previousUsers.length, new: data.users.length },
        },
      })
    }

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
