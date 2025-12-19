import { defineStore } from 'pinia'
import { getApiUrl, saveJwtToken, getJwtToken, clearJwtToken } from '@/utils/api-config'

interface AuthState {
  isAuthenticated: boolean
  user: {
    email: string
    name: string
    picture: string | null
    role: string
  } | null
  token: string | null
}

const STORAGE_KEY = 'corporate_discounts_auth'
const LAST_USER_KEY = 'corporate_discounts_last_user'

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    isAuthenticated: false,
    user: null,
    token: null,
  }),

  getters: {
    isLoggedIn(state): boolean {
      return state.isAuthenticated && state.user !== null
    },
  },

  actions: {
    init(): void {
      // Восстанавливаем состояние из localStorage при инициализации
      const stored = localStorage.getItem(STORAGE_KEY)
      const jwtToken = getJwtToken()

      if (stored && jwtToken) {
        try {
          const parsed = JSON.parse(stored)
          this.isAuthenticated = parsed.isAuthenticated ?? false
          this.user = parsed.user ?? null
          this.token = jwtToken

          // Проверяем, что picture не потерялся при восстановлении
          if (this.user && !this.user.picture && parsed.user?.picture) {
            this.user.picture = parsed.user.picture
            this.saveToStorage()
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
        // Вызываем /api/login на Worker для получения JWT
        const response = await fetch(getApiUrl('/api/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential }),
        })

        const data = await response.json()

        if (!response.ok) {
          console.warn('[auth-store] login failed:', data.error)
          throw new Error(data.error || 'Не вдалося увійти')
        }

        if (!data.success || !data.token || !data.user) {
          throw new Error('Invalid response from login API')
        }

        // Сохраняем JWT токен
        saveJwtToken(data.token)

        // Сохраняем данные пользователя
        this.user = {
          email: data.user.email,
          name: data.user.name,
          picture: data.user.picture || null,
          role: data.user.role,
        }
        this.token = data.token
        this.isAuthenticated = true

        // Зберігаємо в localStorage
        this.saveToStorage()

        // Оновлюємо дані останнього користувача
        if (this.user) {
          const lastUserData = {
            name: this.user.name,
            email: this.user.email,
            picture: this.user.picture,
          }
          localStorage.setItem(LAST_USER_KEY, JSON.stringify(lastUserData))
        }
      } catch (error) {
        console.error('[auth-store] failed to login with Google', error)
        if (error instanceof Error) {
          throw error
        }
        throw new Error('Не вдалося увійти через Google')
      }
    },

    logout(): void {
      // Сохраняем данные пользователя для отображения на странице логина
      if (this.user) {
        const lastUserData = {
          name: this.user.name,
          email: this.user.email,
          picture: this.user.picture,
        }
        localStorage.setItem(LAST_USER_KEY, JSON.stringify(lastUserData))
      }

      this.isAuthenticated = false
      this.user = null
      this.token = null

      // Очищаем JWT токен
      clearJwtToken()
      localStorage.removeItem(STORAGE_KEY)
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
        // Не сохраняем token здесь — он хранится отдельно через saveJwtToken
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    },
  },
})
