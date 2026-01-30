// ✅ HTTPS редирект для production (безопасность)
if (
  import.meta.env.PROD &&
  window.location.protocol === 'http:' &&
  !window.location.hostname.includes('localhost')
) {
  window.location.href = window.location.href.replace('http:', 'https:')
}

import '@/design/tokens.css'
import '@/styles/main.scss'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useAuthStore, setGlobalRefreshCallback } from './stores/auth'
import { useDiscountsStore } from './stores/discounts'

/**
 * Инициализация Google Identity Services для Silent Token Refresh
 * Выполняется глобально для поддержки автоматического обновления токенов на всех страницах
 */
function initGlobalGoogleIdentityServices(): void {
  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!CLIENT_ID) return

  const initGIS = () => {
    if (!window.google?.accounts?.id) return

    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: async (response: { credential: string }) => {
        // При успешном silent refresh обновляем токен
        const authStore = useAuthStore()
        try {
          await authStore.loginWithGoogle(response.credential)
        } catch {
          // Тихое обновление не удалось - обрабатывается в auth store
        }
      },
      auto_select: true,
    })

    // Регистрируем глобальный callback для silent refresh
    setGlobalRefreshCallback(async () => {
      return new Promise((resolve, reject) => {
        if (!window.google?.accounts?.id) {
          reject(new Error('Google Identity Services not initialized'))
          return
        }

        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed()) {
            reject(new Error('Silent refresh not possible'))
          } else if (notification.isSkippedMoment()) {
            reject(new Error('User skipped silent refresh'))
          } else if (notification.isDismissedMoment()) {
            reject(new Error('User dismissed silent refresh'))
          }
          // Успешный результат обрабатывается в callback initialize
        })

        // Timeout для silent refresh (10 секунд)
        setTimeout(() => {
          reject(new Error('Silent refresh timeout'))
        }, 10000)
      })
    })
  }

  // Загружаем Google Identity Services
  if (window.google?.accounts?.id) {
    initGIS()
  } else {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = initGIS
    document.head.appendChild(script)
  }
}

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// Инициализируем auth store ДО подключения router
const authStore = useAuthStore(pinia)
authStore.init()

app.use(router)

const discountsStore = useDiscountsStore(pinia)

void discountsStore.loadPartners()

// Запускаем автоматическое обновление данных каждые 5 минут
discountsStore.startAutoRefresh()

// Инициализируем Google Identity Services для Silent Token Refresh
initGlobalGoogleIdentityServices()

/**
 * Обработка возвращения на вкладку браузера
 * Когда пользователь возвращается на вкладку — обновляем данные
 */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    void discountsStore.refreshIfNeeded()
  }
})

/**
 * Обработка восстановления страницы из bfcache (Back-Forward Cache)
 * Когда браузер восстанавливает страницу из кеша — перезагружаем данные
 */
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    void discountsStore.loadPartners()
  }
})

app.mount('#app')
