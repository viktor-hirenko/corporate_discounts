/**
 * API Configuration
 * Автоматически определяет какой API использовать: локальный (dev) или worker (production)
 */

const WORKER_URL = 'https://corporate-discounts-worker.upstars-marbella.workers.dev'

/**
 * Определяет базовый URL для API запросов
 * - localhost:5173 → используем локальный Vite server (/api/*)
 * - production (R2/Worker) → используем Worker URL
 */
export function getApiBaseUrl(): string {
  // Если запущен на localhost - используем локальный API
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return ''
  }

  // На production - используем Worker URL
  return WORKER_URL
}

/**
 * Возвращает полный URL для API endpoint
 */
export function getApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl()
  return `${baseUrl}${endpoint}`
}

/**
 * Возвращает headers для авторизованных запросов (с JWT токеном)
 */
export function getAuthHeaders(): Record<string, string> {
  let token: string | null = null

  // Читаем токен из auth store (localStorage)
  const stored = localStorage.getItem('corporate_discounts_auth')

  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      token = parsed.token ?? null
    } catch {
      token = null
    }
  }

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

/**
 * Загружает конфиг с API с принудительным обходом кэша
 * Используй эту функцию вместо прямого fetch для /api/load-config
 */
export async function fetchConfig(): Promise<Response> {
  const cacheBuster = Date.now()
  return fetch(`${getApiUrl('/api/load-config')}?t=${cacheBuster}`, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
    },
  })
}

/**
 * Возвращает Authorization header с токеном для multipart запросов
 */
export function getAuthHeadersForUpload(): Record<string, string> {
  let token: string | null = null

  const stored = localStorage.getItem('corporate_discounts_auth')

  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      token = parsed.token ?? null
    } catch {
      token = null
    }
  }

  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * Загружает изображение партнера на сервер
 */
export async function uploadPartnerImage(
  file: File,
  slug: string,
): Promise<{
  success: boolean
  imagePath?: string
  publicUrl?: string
  error?: string
}> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('slug', slug)

    const response = await fetch(getApiUrl('/api/upload-image'), {
      method: 'POST',
      headers: getAuthHeadersForUpload(),
      body: formData,
    })

    const result = await response.json()

    if (!response.ok) {
      return { success: false, error: result.error || 'Upload failed' }
    }

    return {
      success: true,
      imagePath: result.imagePath,
      publicUrl: result.publicUrl,
    }
  } catch (error) {
    console.error('Failed to upload image:', error)
    return { success: false, error: 'Network error' }
  }
}
