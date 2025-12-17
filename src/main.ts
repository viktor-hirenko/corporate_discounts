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
import { useAuthStore } from './stores/auth'
import { useDiscountsStore } from './stores/discounts'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// Инициализируем auth store ДО подключения router
const authStore = useAuthStore(pinia)
authStore.init()

app.use(router)

const discountsStore = useDiscountsStore(pinia)

void discountsStore.loadPartners()

app.mount('#app')
