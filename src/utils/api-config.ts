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
