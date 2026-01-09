/**
 * API Configuration
 * Автоматически определяет какой API использовать: локальный (dev) или worker (production)
 */

import { useAuthStore } from '@/stores/auth'

const WORKER_URL = 'https://corporate-discounts-worker.upstars-marbella.workers.dev'

/** Флаг для предотвращения рекурсивного refresh */
let isRefreshing = false

/** Очередь запросов, ожидающих refresh */
let refreshQueue: Array<{
  resolve: (value: Response) => void
  reject: (error: Error) => void
  retryFn: () => Promise<Response>
}> = []

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
 * Обрабатывает очередь запросов после успешного refresh
 */
function processRefreshQueue(success: boolean): void {
  refreshQueue.forEach(({ resolve, reject, retryFn }) => {
    if (success) {
      retryFn().then(resolve).catch(reject)
    } else {
      reject(new Error('Token refresh failed'))
    }
  })
  refreshQueue = []
}

/**
 * Fetch с автоматическим refresh токена при 401
 * Если сервер возвращает 401, пытается обновить токен и повторить запрос
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const authStore = useAuthStore()

  // Проверяем не истёк ли токен перед запросом
  if (authStore.isTokenExpired && !isRefreshing) {
    isRefreshing = true
    const refreshSuccess = await authStore.silentRefresh()
    isRefreshing = false

    if (!refreshSuccess) {
      authStore.logout(true) // Редирект на /login
      throw new Error('Token expired and refresh failed')
    }
  }

  // Добавляем актуальный токен
  const headers = {
    ...options.headers,
    ...getAuthHeaders(),
  }

  const response = await fetch(url, { ...options, headers })

  // Если 401 — пытаемся refresh
  if (response.status === 401) {

    // Если уже идёт refresh — добавляем запрос в очередь
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({
          resolve,
          reject,
          retryFn: () =>
            fetch(url, { ...options, headers: { ...options.headers, ...getAuthHeaders() } }),
        })
      })
    }

    isRefreshing = true

    try {
      const refreshSuccess = await authStore.silentRefresh()
      isRefreshing = false

      if (refreshSuccess) {
        // Обрабатываем очередь
        processRefreshQueue(true)

        // Повторяем оригинальный запрос с новым токеном
        const retryHeaders = {
          ...options.headers,
          ...getAuthHeaders(),
        }
        return fetch(url, { ...options, headers: retryHeaders })
      } else {
        // Refresh не удался — logout с редиректом на логин
        processRefreshQueue(false)
        authStore.logout(true) // true = редирект на /login
        throw new Error('Authentication required')
      }
    } catch (error) {
      isRefreshing = false
      processRefreshQueue(false)
      throw error
    }
  }

  return response
}

/**
 * Fetch для multipart запросов с автоматическим refresh токена при 401
 */
export async function fetchMultipartWithAuth(url: string, formData: FormData): Promise<Response> {
  const authStore = useAuthStore()

  // Проверяем не истёк ли токен перед запросом
  if (authStore.isTokenExpired && !isRefreshing) {
    isRefreshing = true
    const refreshSuccess = await authStore.silentRefresh()
    isRefreshing = false

    if (!refreshSuccess) {
      authStore.logout(true) // Редирект на /login
      throw new Error('Token expired and refresh failed')
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: getAuthHeadersForUpload(),
    body: formData,
  })

  // Если 401 — пытаемся refresh
  if (response.status === 401) {

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({
          resolve,
          reject,
          retryFn: () =>
            fetch(url, {
              method: 'POST',
              headers: getAuthHeadersForUpload(),
              body: formData,
            }),
        })
      })
    }

    isRefreshing = true

    try {
      const refreshSuccess = await authStore.silentRefresh()
      isRefreshing = false

      if (refreshSuccess) {
        processRefreshQueue(true)
        return fetch(url, {
          method: 'POST',
          headers: getAuthHeadersForUpload(),
          body: formData,
        })
      } else {
        // Refresh не удался — logout с редиректом на логин
        processRefreshQueue(false)
        authStore.logout(true) // true = редирект на /login
        throw new Error('Authentication required')
      }
    } catch (error) {
      isRefreshing = false
      processRefreshQueue(false)
      throw error
    }
  }

  return response
}

/**
 * Загружает изображение партнера на сервер
 * Использует fetchMultipartWithAuth для автоматического refresh при 401
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

    const response = await fetchMultipartWithAuth(getApiUrl('/api/upload-image'), formData)

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
    if (error instanceof Error && error.message === 'Authentication required') {
      return { success: false, error: 'Сессия закончилась. Пожалуйста, войдите снова.' }
    }
    return { success: false, error: 'Network error' }
  }
}
