import { defineStore } from 'pinia'
import { useAdminUsersStore } from './adminUsers'

interface AuthState {
  isAuthenticated: boolean
  user: {
    email: string
    name: string
    picture: string | null
  } | null
  token: string | null
  /** ID таймера для проактивного refresh токена */
  refreshTimerId: ReturnType<typeof setTimeout> | null
}

const STORAGE_KEY = 'corporate_discounts_auth'
const LAST_USER_KEY = 'corporate_discounts_last_user'

/**
 * Буфер для проактивного оновлення токена
 * Токен Google живе 60 хвилин.
 *
 * PRODUCTION: 5 * 60 * 1000 (5 хвилин) — розлогін через ~55 хвилин
 * ТЕСТ: 59 * 60 * 1000 (59 хвилин) — розлогін через ~1 хвилину
 */
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000 // ← PRODUCTION
// const TOKEN_REFRESH_BUFFER_MS = 59 * 60 * 1000 // ← ТЕСТ (1 хвилина)

/** Глобальний callback для silent refresh (встановлюється з компонента логіну) */
let globalRefreshCallback: (() => Promise<void>) | null = null

/**
 * Встановлює глобальний callback для silent refresh
 * Викликається з компонента AuthLogin після ініціалізації Google Identity Services
 */
export function setGlobalRefreshCallback(callback: () => Promise<void>): void {
  globalRefreshCallback = callback
}

/**
 * Декодує JWT payload без верифікації підпису
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3 || !parts[1]) return null
    const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(payload)
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    isAuthenticated: false,
    user: null,
    token: null,
    refreshTimerId: null,
  }),

  getters: {
    isLoggedIn(state): boolean {
      return state.isAuthenticated && state.user !== null
    },

    /**
     * Повертає час закінчення токена (timestamp в мс) або null якщо токен недійсний
     */
    tokenExpirationTime(state): number | null {
      if (!state.token) return null
      const payload = decodeJwtPayload(state.token)
      if (!payload || typeof payload.exp !== 'number') return null
      return payload.exp * 1000
    },

    /**
     * Перевіряє, чи закінчився токен (з буфером для проактивного оновлення)
     */
    isTokenExpired(): boolean {
      const expTime = this.tokenExpirationTime
      if (!expTime) return true
      return expTime < Date.now() + TOKEN_REFRESH_BUFFER_MS
    },

    /**
     * Перевіряє, чи токен дійсний (не закінчився і має правильну структуру)
     */
    isTokenValid(state): boolean {
      if (!state.token) return false
      const payload = decodeJwtPayload(state.token)
      if (!payload) return false
      if (typeof payload.exp !== 'number') return false
      if (typeof payload.email !== 'string') return false
      // Перевіряємо без буфера — чи токен взагалі діє
      return payload.exp * 1000 > Date.now()
    },

    /**
     * Проверяет, имеет ли пользователь доступ к админке (роль admin или editor)
     */
    hasAdminAccess(): boolean {
      if (!this.isLoggedIn || !this.user) return false

      const usersStore = useAdminUsersStore()
      const adminUser = usersStore.users.find(
        (u) => u.email.toLowerCase() === this.user!.email.toLowerCase(),
      )

      return adminUser?.role === 'admin' || adminUser?.role === 'editor'
    },

    /**
     * Проверяет, является ли пользователь админом (может управлять пользователями)
     */
    isAdmin(): boolean {
      if (!this.isLoggedIn || !this.user) return false

      const usersStore = useAdminUsersStore()
      const adminUser = usersStore.users.find(
        (u) => u.email.toLowerCase() === this.user!.email.toLowerCase(),
      )

      return adminUser?.role === 'admin'
    },

    /**
     * Возвращает роль текущего пользователя
     */
    userRole(): 'admin' | 'editor' | null {
      if (!this.isLoggedIn || !this.user) return null

      const usersStore = useAdminUsersStore()
      const adminUser = usersStore.users.find(
        (u) => u.email.toLowerCase() === this.user!.email.toLowerCase(),
      )

      return adminUser?.role || null
    },
  },

  actions: {
    init(): void {
      // Восстанавливаем состояние из localStorage при инициализации
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          this.isAuthenticated = parsed.isAuthenticated ?? false
          this.user = parsed.user ?? null
          this.token = parsed.token ?? null

          // Проверяем, что picture не потерялся при восстановлении
          if (this.user && !this.user.picture && parsed.user?.picture) {
            this.user.picture = parsed.user.picture
            this.saveToStorage()
          }

          // ✅ Запускаємо таймер refresh якщо токен валідний
          if (this.isTokenValid) {
            this.startTokenRefreshTimer()
          }
        } catch (error) {
          console.error('[auth-store] failed to restore state', error)
          this.logout()
        }
      } else {
        // Явно сбрасываем состояние, если данных нет в localStorage
        this.isAuthenticated = false
        this.user = null
        this.token = null
      }
    },

    async loginWithGoogle(credential: string): Promise<void> {
      try {
        // Декодируем JWT токен от Google
        const parts = credential.split('.')
        if (parts.length < 2 || !parts[1]) {
          throw new Error('Invalid credential format')
        }
        const payload = JSON.parse(atob(parts[1]))

        // ✅ Проверка домена email — только @upstars.com
        const email = payload.email?.toLowerCase() || ''
        const allowedDomain = '@upstars.com'

        if (!email.endsWith(allowedDomain)) {
          console.warn('[auth-store] email domain not allowed:', email)
          throw new Error(`Доступ разрешён только для сотрудников ${allowedDomain}`)
        }

        // Google JWT может содержать picture в разных полях
        // Проверяем несколько возможных вариантов
        const pictureUrl = payload.picture || payload.avatar_url || payload.photo || null

        this.user = {
          email: payload.email,
          name: payload.name || payload.email,
          picture: pictureUrl,
        }
        this.token = credential
        this.isAuthenticated = true

        // Сохраняем в localStorage
        this.saveToStorage()

        // Обновляем данные последнего пользователя
        if (this.user) {
          const lastUserData = {
            name: this.user.name,
            email: this.user.email,
            picture: this.user.picture,
            token: this.token, // ✅ Сохраняем токен для "Продовжити"
          }
          localStorage.setItem(LAST_USER_KEY, JSON.stringify(lastUserData))
        }

        // ✅ Запускаємо таймер для проактивного оновлення токена
        this.startTokenRefreshTimer()
      } catch (error) {
        console.error('[auth-store] failed to login with Google', error)
        if (error instanceof Error && error.message.includes('Доступ')) {
          throw error
        }
        throw new Error('Не вдалося увійти через Google')
      }
    },

    async loginWithEmail(email: string, name: string): Promise<void> {
      // При логине через email восстанавливаем данные из LAST_USER_KEY
      // (включая токен, который сохраняется при logout)
      let existingToken: string | null = null
      let existingPicture: string | null = null

      const lastUserStored = localStorage.getItem(LAST_USER_KEY)
      if (lastUserStored) {
        try {
          const parsed = JSON.parse(lastUserStored)
          existingToken = parsed.token ?? null
          existingPicture = parsed.picture ?? null
        } catch {
          existingToken = null
          existingPicture = null
        }
      }

      // Если токена нет — выдаём предупреждение (пользователю нужно логиниться через Google)
      if (!existingToken) {
        console.warn(
          '[auth-store] No token found for email login, user needs to re-authenticate via Google',
        )
      }

      this.user = {
        email,
        name,
        picture: existingPicture,
      }
      // Восстанавливаем токен из LAST_USER_KEY
      this.token = existingToken
      this.isAuthenticated = true

      this.saveToStorage()

      // Обновляем данные последнего пользователя (сохраняем токен!)
      const lastUserData = {
        name: this.user.name,
        email: this.user.email,
        picture: this.user.picture,
        token: this.token,
      }
      localStorage.setItem(LAST_USER_KEY, JSON.stringify(lastUserData))
    },

    /**
     * Разлогинивает пользователя
     * @param redirectToLogin - если true, редиректит на страницу логина (по умолчанию false)
     */
    logout(redirectToLogin: boolean = false): void {
      // Зупиняємо таймер refresh
      this.stopTokenRefreshTimer()

      // Сохраняем данные пользователя И токен для возможности "Продовжити"
      if (this.user) {
        const lastUserData = {
          name: this.user.name,
          email: this.user.email,
          picture: this.user.picture,
          token: this.token, // ✅ Сохраняем токен для "Продовжити"
        }
        localStorage.setItem(LAST_USER_KEY, JSON.stringify(lastUserData))
      }

      this.isAuthenticated = false
      this.user = null
      this.token = null
      localStorage.removeItem(STORAGE_KEY)

      // Редірект на сторінку логіну (тільки якщо явно вказано)
      if (redirectToLogin && !window.location.hash.includes('/login')) {
        window.location.href = window.location.origin + window.location.pathname + '#/login'
      }
    },

    /**
     * Запускає таймер для проактивного оновлення токена
     * Таймер спрацьовує за 5 хвилин до закінчення токена
     */
    startTokenRefreshTimer(): void {
      // Зупиняємо попередній таймер якщо є
      this.stopTokenRefreshTimer()

      const expTime = this.tokenExpirationTime
      if (!expTime) {
        console.warn('[auth-store] Cannot start refresh timer: no token expiration time')
        return
      }

      // Обчислюємо час до refresh (за 5 хвилин до закінчення)
      const refreshTime = expTime - TOKEN_REFRESH_BUFFER_MS
      const delay = refreshTime - Date.now()

      if (delay <= 0) {
        // Токен вже потребує оновлення — запускаємо негайно
        this.silentRefresh()
        return
      }

      this.refreshTimerId = setTimeout(() => {
        this.silentRefresh()
      }, delay)
    },

    /**
     * Зупиняє таймер refresh
     */
    stopTokenRefreshTimer(): void {
      if (this.refreshTimerId) {
        clearTimeout(this.refreshTimerId)
        this.refreshTimerId = null
      }
    },

    /**
     * Silent refresh токена через Google Identity Services
     * Повертає true якщо refresh успішний, false якщо потрібен повний re-login
     */
    async silentRefresh(): Promise<boolean> {
      if (!globalRefreshCallback) {
        return false
      }

      try {
        await globalRefreshCallback()
        // Якщо callback успішний, токен вже оновлений через loginWithGoogle
        // Перезапускаємо таймер для нового токена
        if (this.isTokenValid) {
          this.startTokenRefreshTimer()
          return true
        }
        return false
      } catch {
        return false
      }
    },

    /**
     * Перевіряє токен збереженого користувача і повертає чи він валідний
     */
    isLastUserTokenValid(): boolean {
      const stored = localStorage.getItem(LAST_USER_KEY)
      if (!stored) return false

      try {
        const parsed = JSON.parse(stored)
        const token = parsed.token
        if (!token) return false

        const payload = decodeJwtPayload(token)
        if (!payload) return false
        if (typeof payload.exp !== 'number') return false

        // ✅ Перевіряємо З БУФЕРОМ — так само як isTokenExpired
        // Щоб уникнути циклу: logout → "Продовжити" → знову logout
        return payload.exp * 1000 > Date.now() + TOKEN_REFRESH_BUFFER_MS
      } catch {
        return false
      }
    },

    getLastUser(): { name: string; email: string; picture: string | null } | null {
      const stored = localStorage.getItem(LAST_USER_KEY)
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch (error) {
          console.error('[auth-store] failed to parse last user data', error)
          return null
        }
      }
      return null
    },

    clearLastUser(): void {
      localStorage.removeItem(LAST_USER_KEY)
    },

    saveToStorage(): void {
      const data = {
        isAuthenticated: this.isAuthenticated,
        user: this.user,
        token: this.token,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    },
  },
})
