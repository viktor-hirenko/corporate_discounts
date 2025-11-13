import '@/design/tokens.css'
import '@/assets/scss/main.scss'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useDiscountsStore } from './stores/discounts'
import { useFaqStore } from './stores/faq'
import { useUiStore } from './stores/ui'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

const uiStore = useUiStore(pinia)
uiStore.initTheme()

const discountsStore = useDiscountsStore(pinia)
const faqStore = useFaqStore(pinia)

void discountsStore.loadPartners()
void faqStore.loadFaq()

app.mount('#app')
