import { defineStore } from 'pinia'

interface GoogleUser {
  credential: string
  select_by: string
}

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

          console.log('[auth-store] State restored:', {
            isAuthenticated: this.isAuthenticated,
            user: this.user,
            hasPicture: !!this.user?.picture,
            picture: this.user?.picture,
            rawStored: parsed,
          })

          // Проверяем, что picture не потерялся при восстановлении
          if (this.user && !this.user.picture && parsed.user?.picture) {
            console.warn('[auth-store] Picture was lost during restore, fixing...')
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
        const payload = JSON.parse(atob(credential.split('.')[1]))

        console.log('[auth-store] Google login payload:', {
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
          fullPayload: payload,
        })

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

        console.log('[auth-store] User data set:', {
          email: this.user.email,
          name: this.user.name,
          picture: this.user.picture,
        })

        // Сохраняем в localStorage
        this.saveToStorage()

        // Проверяем, что данные сохранились
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const savedData = JSON.parse(saved)
          console.log('[auth-store] Data saved to localStorage:', {
            hasUser: !!savedData.user,
            hasPicture: !!savedData.user?.picture,
            picture: savedData.user?.picture,
          })
        }

        // Обновляем данные последнего пользователя
        if (this.user) {
          const lastUserData = {
            name: this.user.name,
            email: this.user.email,
            picture: this.user.picture,
          }
          localStorage.setItem(LAST_USER_KEY, JSON.stringify(lastUserData))
          console.log('[auth-store] Last user data saved:', lastUserData)
        }
      } catch (error) {
        console.error('[auth-store] failed to login with Google', error)
        throw new Error('Не вдалося увійти через Google')
      }
    },

    async loginWithEmail(email: string, name: string): Promise<void> {
      // При логине через email сохраняем picture из lastUser, если он есть
      const lastUser = this.getLastUser()
      this.user = {
        email,
        name,
        picture: lastUser?.picture || null, // Сохраняем picture из lastUser, если есть
      }
      this.token = null
      this.isAuthenticated = true

      this.saveToStorage()

      // Обновляем данные последнего пользователя (сохраняем picture, если он был)
      const lastUserData = {
        name: this.user.name,
        email: this.user.email,
        picture: this.user.picture, // Сохраняем picture, даже если он null (но стараемся сохранить из lastUser)
      }
      localStorage.setItem(LAST_USER_KEY, JSON.stringify(lastUserData))
      console.log('[auth-store] Last user data saved after email login:', lastUserData)
    },

    logout(): void {
      // Сохраняем данные пользователя для отображения на странице логина
      if (this.user) {
        const lastUserData = {
          name: this.user.name,
          email: this.user.email,
          picture: this.user.picture,
        }
        console.log('[auth-store] Saving last user data on logout:', lastUserData)
        localStorage.setItem(LAST_USER_KEY, JSON.stringify(lastUserData))

        // Проверяем, что данные сохранились
        const saved = localStorage.getItem(LAST_USER_KEY)
        if (saved) {
          const savedData = JSON.parse(saved)
          console.log('[auth-store] Last user data saved successfully:', savedData)
        }
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
