// ✅ HTTPS редирект для production (безпека)
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
 * Ініціалізація Google Identity Services для Silent Token Refresh
 * Виконується глобально для підтримки автоматичного оновлення токенів на всіх сторінках
 */
function initGlobalGoogleIdentityServices(): void {
  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!CLIENT_ID) return

  const initGIS = () => {
    if (!window.google?.accounts?.id) return

    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: async (response: { credential: string }) => {
        // При успішному silent refresh оновлюємо токен
        const authStore = useAuthStore()
        try {
          await authStore.loginWithGoogle(response.credential)
        } catch {
          // Silent refresh failed - handled by auth store
        }
      },
      auto_select: true,
    })

    // Реєструємо глобальний callback для silent refresh
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
          // Успішний результат обробляється в callback initialize
        })

        // Timeout для silent refresh (10 секунд)
        setTimeout(() => {
          reject(new Error('Silent refresh timeout'))
        }, 10000)
      })
    })
  }

  // Завантажуємо Google Identity Services
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

// ✅ Запускаємо автоматичне оновлення даних кожні 5 хвилин
discountsStore.startAutoRefresh()

// ✅ Ініціалізуємо Google Identity Services для Silent Token Refresh
initGlobalGoogleIdentityServices()

/**
 * Обробка повернення на вкладку браузера
 * Коли користувач повертається на вкладку — оновлюємо дані
 */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    void discountsStore.refreshIfNeeded()
  }
})

/**
 * Обробка відновлення сторінки з bfcache (Back-Forward Cache)
 * Коли браузер відновлює сторінку з кешу — перезавантажуємо дані
 */
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    void discountsStore.loadPartners()
  }
})

app.mount('#app')
