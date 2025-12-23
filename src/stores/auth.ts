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
          }
          localStorage.setItem(LAST_USER_KEY, JSON.stringify(lastUserData))
        }
      } catch (error) {
        console.error('[auth-store] failed to login with Google', error)
        if (error instanceof Error && error.message.includes('Доступ')) {
          throw error
        }
        throw new Error('Не вдалося увійти через Google')
      }
    },

    async loginWithEmail(email: string, name: string): Promise<void> {
      // При логине через email сохраняем picture и token из storage, если есть
      const lastUser = this.getLastUser()

      // Пытаемся восстановить существующий токен из storage
      let existingToken: string | null = null
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          existingToken = parsed.token ?? null
        } catch {
          existingToken = null
        }
      }

      this.user = {
        email,
        name,
        picture: lastUser?.picture || null,
      }
      // Сохраняем существующий токен, если он есть (для продолжения сессии)
      this.token = existingToken
      this.isAuthenticated = true

      this.saveToStorage()

      // Обновляем данные последнего пользователя
      const lastUserData = {
        name: this.user.name,
        email: this.user.email,
        picture: this.user.picture,
      }
      localStorage.setItem(LAST_USER_KEY, JSON.stringify(lastUserData))
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
        token: this.token,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    },
  },
})
