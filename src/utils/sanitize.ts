/**
 * Утиліти для санітизації та валідації вводу
 * Захист від XSS та ін'єкцій
 */

/**
 * Екранує HTML-сутності для запобігання XSS
 */
export function escapeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }
  return str.replace(/[&<>"'/]/g, (char) => htmlEscapes[char] || char)
}

/**
 * Видаляє потенційно небезпечні HTML теги
 */
export function stripHtmlTags(str: string): string {
  return str.replace(/<[^>]*>/g, '')
}

/**
 * Санітизує рядок для безпечного використання
 */
export function sanitizeString(str: string | undefined | null): string {
  if (!str) return ''
  return stripHtmlTags(str.trim())
}

/**
 * Санітизує email
 */
export function sanitizeEmail(email: string): string {
  return email
    .toLowerCase()
    .trim()
    .replace(/[<>'"]/g, '')
}

/**
 * Санітизує URL
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim()
  // Дозволяємо тільки http, https та відносні URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    return trimmed
  }
  // Додаємо https:// якщо немає протоколу
  if (trimmed && !trimmed.includes('://')) {
    return `https://${trimmed}`
  }
  return trimmed
}

/**
 * Санітизує об'єкт рекурсивно
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj }

  for (const key in result) {
    const value = result[key]
    if (typeof value === 'string') {
      ;(result as Record<string, unknown>)[key] = sanitizeString(value)
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      ;(result as Record<string, unknown>)[key] = sanitizeObject(value as Record<string, unknown>)
    } else if (Array.isArray(value)) {
      ;(result as Record<string, unknown>)[key] = value.map((item) =>
        typeof item === 'string'
          ? sanitizeString(item)
          : typeof item === 'object' && item !== null
            ? sanitizeObject(item as Record<string, unknown>)
            : item,
      )
    }
  }

  return result
}

/**
 * Валідує email формат
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Валідує URL формат
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Обмежує довжину рядка
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength)
}
