/**
 * API Configuration
 * Автоматически определяет какой API использовать: локальный (dev) или worker (production)
 */

const WORKER_URL = 'https://corporate-discounts-worker.upstars-marbella.workers.dev'

// Ключ для хранения JWT токена
const JWT_STORAGE_KEY = 'corporate_discounts_jwt'

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
 * Сохраняет JWT токен в localStorage
 */
export function saveJwtToken(token: string): void {
  localStorage.setItem(JWT_STORAGE_KEY, token)
}

/**
 * Получает JWT токен из localStorage
 */
export function getJwtToken(): string | null {
  return localStorage.getItem(JWT_STORAGE_KEY)
}

/**
 * Удаляет JWT токен из localStorage
 */
export function clearJwtToken(): void {
  localStorage.removeItem(JWT_STORAGE_KEY)
}

/**
 * Возвращает заголовки для аутентифицированных запросов
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getJwtToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return headers
}

/**
 * Проверяет валидность JWT токена через API
 */
export async function verifyJwtToken(): Promise<boolean> {
  const token = getJwtToken()
  if (!token) {
    return false
  }

  try {
    const response = await fetch(getApiUrl('/api/verify'), {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      clearJwtToken()
      return false
    }

    const data = await response.json()
    return data.valid === true
  } catch (error) {
    console.error('JWT verification failed:', error)
    return false
  }
}
