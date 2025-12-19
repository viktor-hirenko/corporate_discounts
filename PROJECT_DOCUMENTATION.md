# 📚 Corporate Discounts — Технічна документація

## 📋 Зміст

1. [Огляд проєкту](#огляд-проєкту)
2. [Архітектура](#архітектура)
3. [Cloudflare Worker (Backend)](#cloudflare-worker-backend)
4. [Pinia Stores](#pinia-stores)
5. [Роутинг](#роутинг)
6. [Структура конфігурації](#структура-конфігурації)
7. [Компоненти](#компоненти)
8. [Типи та інтерфейси](#типи-та-інтерфейси)
9. [Composables](#composables)
10. [Стилі](#стилі)
11. [Безпека](#безпека)
12. [Скрипти та збірка](#скрипти-та-збірка)

---

## 🎯 Огляд проєкту

**Corporate Discounts** — це Vue 3 застосунок для управління корпоративними знижками та партнерськими пропозиціями для команди UPSTARS.

### Технологічний стек

| Шар          | Технології                                     |
| ------------ | ---------------------------------------------- |
| **Frontend** | Vue 3.5, TypeScript 5.9, Pinia 3, Vue Router 4 |
| **Styling**  | SCSS, Design Tokens, BEM                       |
| **Build**    | Vite 7                                         |
| **Backend**  | Cloudflare Worker                              |
| **Storage**  | Cloudflare R2                                  |
| **Auth**     | Google Identity Services                       |
| **Linting**  | ESLint 9, Stylelint 16, Prettier 3             |

### Ключові особливості

- 🔐 Google OAuth авторизація з whitelist
- 📱 Адаптивний дизайн (Mobile-First)
- 🌐 Мультимовність (UA/EN)
- 🎛️ Повноцінна адмін-панель
- 🛡️ Security Headers, CORS, Rate Limiting
- 📤 Персистентне збереження даних в R2

---

## 🏗️ Архітектура

### Діаграма системи

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE R2                              │
│ ┌────────────────┐  ┌────────────────┐  ┌─────────────────────┐  │
│ │ index.html     │  │ assets/        │  │ data/               │  │
│ │ *.js, *.css    │  │ images/        │  │ app-config.json     │  │
│ └────────────────┘  └────────────────┘  └─────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                              ↑ GET/PUT
┌──────────────────────────────────────────────────────────────────┐
│                     CLOUDFLARE WORKER                             │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │                     Request Handler                          │  │
│ │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │  │
│ │  │ Static File  │  │ API Routes   │  │ Security         │   │  │
│ │  │ Server       │  │ /api/*       │  │ (CORS, Headers)  │   │  │
│ │  └──────────────┘  └──────────────┘  └──────────────────┘   │  │
│ │                                                              │  │
│ │  ┌──────────────┐  ┌──────────────┐                         │  │
│ │  │ Rate         │  │ SPA          │                         │  │
│ │  │ Limiting     │  │ Fallback     │                         │  │
│ │  └──────────────┘  └──────────────┘                         │  │
│ └─────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                              ↓ HTTP
┌──────────────────────────────────────────────────────────────────┐
│                      VUE 3 FRONTEND                               │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │
│ │ Views       │  │ Stores      │  │ Composables │  │ Router   │ │
│ │ (Pages)     │  │ (Pinia)     │  │ (Logic)     │  │ (Guards) │ │
│ └─────────────┘  └─────────────┘  └─────────────┘  └──────────┘ │
│                                                                   │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │
│ │ Components  │  │ Layouts     │  │ Types       │  │ Utils    │ │
│ │ (UI)        │  │ (Templates) │  │ (TS)        │  │ (Helpers)│ │
│ └─────────────┘  └─────────────┘  └─────────────┘  └──────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Потоки даних

```
┌─────────────────────────────────────────────────────────────────┐
│ ЗАВАНТАЖЕННЯ ДАНИХ (Read Flow)                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Store.init()                                                 │
│       ↓                                                          │
│  2. getApiUrl('/api/load-config')                               │
│       ↓                                                          │
│  3. Worker API → R2.get('data/app-config.json')                 │
│       ↓                                                          │
│  4. Response JSON → Store.state                                  │
│       ↓                                                          │
│  5. Computed → Components                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ЗБЕРЕЖЕННЯ ДАНИХ (Write Flow)                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User Action (Save button)                                    │
│       ↓                                                          │
│  2. ensureStoresInitialized()                                    │
│       ↓                                                          │
│  3. buildFullConfig() → Merge all stores                         │
│       ↓                                                          │
│  4. POST /api/save-config → Worker                              │
│       ↓                                                          │
│  5. Worker → R2.put('data/app-config.json')                     │
│       ↓                                                          │
│  6. Success Response                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Структура проєкту

```
corporate-discounts/
├── src/
│   ├── components/           # Vue компоненти
│   │   ├── admin/            # Компоненти адмін-панелі
│   │   │   ├── AdminSidebar.vue
│   │   │   ├── AdminHeader.vue
│   │   │   ├── AdminPartnerForm.vue
│   │   │   └── AdminExportPanel.vue
│   │   └── icons/            # SVG іконки (Vue components)
│   │
│   ├── views/
│   │   ├── admin/            # Сторінки адмін-панелі
│   │   │   ├── AdminDashboardView.vue
│   │   │   ├── AdminPartnersView.vue
│   │   │   ├── AdminCategoriesView.vue
│   │   │   ├── AdminLocationsView.vue
│   │   │   ├── AdminFaqView.vue
│   │   │   ├── AdminTextsView.vue
│   │   │   ├── AdminImagesView.vue
│   │   │   ├── AdminSettingsView.vue
│   │   │   └── AdminUsersView.vue
│   │   ├── LoginView.vue
│   │   ├── DiscountsCatalogView.vue
│   │   ├── DiscountDetailsView.vue
│   │   ├── FaqView.vue
│   │   └── PartnersAdminView.vue  # Legacy JSON генератор
│   │
│   ├── layouts/
│   │   ├── DefaultLayout.vue     # Публічні сторінки
│   │   ├── AuthLayout.vue        # Сторінка логіну
│   │   └── AdminLayout.vue       # Адмін-панель
│   │
│   ├── stores/                # Pinia stores
│   │   ├── auth.ts            # Авторизація
│   │   ├── discounts.ts       # Каталог партнерів
│   │   ├── ui.ts              # UI стан
│   │   ├── adminPartners.ts   # Admin: партнери
│   │   ├── adminCategories.ts # Admin: категорії
│   │   ├── adminLocations.ts  # Admin: локації
│   │   ├── adminFaq.ts        # Admin: FAQ
│   │   ├── adminTexts.ts      # Admin: тексти
│   │   ├── adminImages.ts     # Admin: зображення
│   │   ├── adminSettings.ts   # Admin: налаштування
│   │   ├── adminUsers.ts      # Admin: користувачі
│   │   └── adminExport.ts     # Admin: експорт/збереження
│   │
│   ├── composables/
│   │   ├── useAppConfig.ts    # Доступ до конфігу
│   │   ├── useMediaQuery.ts   # Responsive breakpoints
│   │   └── usePartnersAdmin.ts # Логіка для партнерів
│   │
│   ├── types/
│   │   ├── app-config.ts      # Типи конфігурації
│   │   └── partner.ts         # Типи партнерів
│   │
│   ├── utils/
│   │   ├── api-config.ts      # Визначення API URL
│   │   └── sanitize.ts        # Input sanitization
│   │
│   ├── styles/
│   │   ├── main.scss          # Головний файл
│   │   ├── base.scss          # Reset, базові стилі
│   │   ├── core.scss          # Змінні, функції, міксини
│   │   └── responsive.scss    # Адаптивні стилі
│   │
│   ├── data/
│   │   └── app-config.json    # Центральний конфіг
│   │
│   └── design/
│       └── tokens.json        # Design tokens
│
├── worker/                    # Cloudflare Worker
│   ├── src/
│   │   └── index.ts           # Головний файл Worker
│   ├── wrangler.toml          # Конфігурація
│   ├── tsconfig.json
│   └── package.json
│
├── scripts/
│   ├── deploy-r2.sh           # Деплой на R2
│   ├── deploy-worker.sh       # Деплой Worker
│   ├── build-tokens.ts        # Генерація токенів
│   └── convert-to-webp.ts     # Конвертація зображень
│
├── public/
│   └── _headers               # Security headers для R2
│
└── package.json
```

---

## 🔧 Cloudflare Worker (Backend)

Worker обслуговує статичні файли з R2 та надає API для CRUD операцій.

### Файл: `worker/src/index.ts`

### API Endpoints

| Method | Endpoint           | Auth   | Опис                              |
| ------ | ------------------ | ------ | --------------------------------- |
| `POST` | `/api/login`       | Public | Авторизація, отримання JWT токена |
| `GET`  | `/api/verify`      | JWT    | Перевірка валідності JWT токена   |
| `GET`  | `/api/load-config` | Public | Завантажити app-config.json з R2  |
| `POST` | `/api/save-config` | JWT ⚠️ | Зберегти app-config.json в R2     |
| `GET`  | `/*`               | Public | Статичні файли (SPA fallback)     |

> ⚠️ `/api/save-config` вимагає валідний JWT токен в заголовку `Authorization: Bearer <token>`

### CORS Configuration

```typescript
const ALLOWED_ORIGINS = [
  'https://corporate-discounts-worker.upstars-marbella.workers.dev',
  'https://pub-37aeae40035e428e93ab550125107a2d.r2.dev',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
]
```

### Security Headers

```typescript
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; ...",
}
```

### Rate Limiting

```typescript
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 хвилина
const MAX_API_REQUESTS = 30 // 30 запитів/хвилину на IP
```

### Environment Variables (wrangler.toml)

```toml
name = "corporate-discounts-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"
account_id = "71bd6a3d109ad42e0973488dafe041b2"

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "dicounts-upstars-com"

[vars]
BUCKET_NAME = "dicounts-upstars-com"
PUBLIC_URL = "https://pub-37aeae40035e428e93ab550125107a2d.r2.dev"
```

### Secrets (Cloudflare Dashboard)

| Secret                  | Опис                                         |
| ----------------------- | -------------------------------------------- |
| `JWT_SECRET` ⚠️         | Ключ для JWT (мін. 32 символи, обов'язковий) |
| `AWS_ACCESS_KEY_ID`     | R2 Access Key                                |
| `AWS_SECRET_ACCESS_KEY` | R2 Secret Key                                |
| `GOOGLE_CLIENT_SECRET`  | Google OAuth Secret (опціонально)            |

> ⚠️ **JWT_SECRET обов'язковий!** Генерація: `openssl rand -hex 32`

### JWT Authentication Flow

```
┌───────────────────────────────────────────────────────────────┐
│ 1. User clicks "Sign in with Google"                          │
│    → Google SDK returns credential (Google JWT)               │
└───────────────────────────────────────────────────────────────┘
                              ↓
┌───────────────────────────────────────────────────────────────┐
│ 2. Frontend sends POST /api/login { credential }              │
│    → Worker validates email against allowedUsers whitelist    │
│    → Worker generates JWT token (signed with JWT_SECRET)      │
│    → Returns { token, user }                                  │
└───────────────────────────────────────────────────────────────┘
                              ↓
┌───────────────────────────────────────────────────────────────┐
│ 3. Frontend stores JWT in localStorage                        │
│    → Sends Authorization: Bearer <token> with API requests    │
└───────────────────────────────────────────────────────────────┘
                              ↓
┌───────────────────────────────────────────────────────────────┐
│ 4. Worker validates JWT on protected endpoints                │
│    → /api/save-config requires valid JWT                      │
│    → Returns 401 if token missing/invalid/expired             │
└───────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Pinia Stores

### Огляд stores

| Store             | Файл                 | Призначення                            |
| ----------------- | -------------------- | -------------------------------------- |
| `auth`            | `auth.ts`            | Авторизація користувача                |
| `discounts`       | `discounts.ts`       | Каталог партнерів для публічного сайту |
| `ui`              | `ui.ts`              | UI стан (modals, locale)               |
| `adminPartners`   | `adminPartners.ts`   | CRUD партнерів                         |
| `adminCategories` | `adminCategories.ts` | CRUD категорій                         |
| `adminLocations`  | `adminLocations.ts`  | CRUD локацій                           |
| `adminFaq`        | `adminFaq.ts`        | CRUD FAQ                               |
| `adminTexts`      | `adminTexts.ts`      | Редагування текстів                    |
| `adminImages`     | `adminImages.ts`     | Редагування зображень                  |
| `adminSettings`   | `adminSettings.ts`   | Глобальні налаштування                 |
| `adminUsers`      | `adminUsers.ts`      | Whitelist користувачів                 |
| `adminExport`     | `adminExport.ts`     | Експорт та збереження                  |

### Динамічна ініціалізація stores

Всі admin stores використовують динамічну ініціалізацію для завантаження даних:

```typescript
// Приклад: adminPartners.ts
export const useAdminPartnersStore = defineStore('adminPartners', () => {
  const partners = ref<Record<string, PartnerConfig>>({})
  const isInitialized = ref(false)

  async function init() {
    if (isInitialized.value) return

    try {
      // Спочатку пробуємо API
      const response = await fetch(getApiUrl('/api/load-config'))
      if (response.ok) {
        const config = await response.json()
        partners.value = { ...config.partners }
      } else {
        // Fallback: динамічний імпорт
        const configModule = await import('@/data/app-config.json')
        partners.value = { ...configModule.default.partners }
      }
    } catch {
      // Fallback: динамічний імпорт
      const configModule = await import('@/data/app-config.json')
      partners.value = { ...configModule.default.partners }
    }

    isInitialized.value = true
  }

  // Автоматична ініціалізація
  init()

  return { partners, isInitialized, init /* ... */ }
})
```

### API URL Utility

```typescript
// src/utils/api-config.ts
const WORKER_URL = 'https://corporate-discounts-worker.upstars-marbella.workers.dev'

export function getApiBaseUrl(): string {
  // localhost → локальний API (Vite dev server)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return ''
  }
  // Production → Worker URL
  return WORKER_URL
}

export function getApiUrl(endpoint: string): string {
  return `${getApiBaseUrl()}${endpoint}`
}
```

### Store: auth.ts

```typescript
interface AuthState {
  user: {
    email: string
    name: string
    picture: string
  } | null
  token: string | null
  isLoggedIn: boolean
}

// Actions
loginWithGoogle(credential: string)  // Вхід через Google
logout()                              // Вихід
restoreSession()                      // Відновлення сесії з localStorage
```

**Whitelist перевірка:**

```typescript
async function loginWithGoogle(credential: string) {
  // Декодуємо JWT
  const payload = JSON.parse(atob(credential.split('.')[1]))

  // Чекаємо ініціалізації usersStore
  const usersStore = useAdminUsersStore()
  await usersStore.init()

  // Перевіряємо whitelist
  const isAllowed = usersStore.users.some(
    (u) => u.email.toLowerCase() === payload.email.toLowerCase(),
  )

  if (!isAllowed) {
    throw new Error('Доступ заборонено')
  }

  // Зберігаємо сесію
  user.value = { email: payload.email, name: payload.name, picture: payload.picture }
  token.value = credential
  isLoggedIn.value = true
  localStorage.setItem('corporate-discounts-auth', JSON.stringify({ user, token }))
}
```

### Store: adminExport.ts

Центральний store для експорту та збереження конфігурації.

```typescript
// Ключові функції
async function ensureStoresInitialized(): Promise<void> {
  // Чекаємо init() для всіх stores перед збереженням
  await Promise.all([
    partnersStore.init(),
    categoriesStore.init(),
    locationsStore.init(),
    faqStore.init(),
    usersStore.init(),
  ])
}

function buildFullConfig(): AppConfig {
  // Збираємо дані з усіх stores
  // Захист: якщо store порожній — використовуємо оригінальні дані
  const partners =
    Object.keys(partnersStore.partners).length > 0
      ? partnersStore.partners
      : originalConfig.partners
  // ...
}

async function saveToLocalFile(): Promise<boolean> {
  await ensureStoresInitialized()
  const config = buildFullConfig()

  const response = await fetch(getApiUrl('/api/save-config'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  // ...
}
```

---

## 🧭 Роутинг

### Файл: `src/router/index.ts`

```typescript
import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  // Hash History для сумісності з R2 static hosting
  history: createWebHashHistory(import.meta.env.BASE_URL),
  // ...
})
```

### Карта маршрутів

| Шлях                | Компонент              | Layout          | Доступ    |
| ------------------- | ---------------------- | --------------- | --------- |
| `/login`            | `LoginView`            | `AuthLayout`    | Публічний |
| `/discounts`        | `DiscountsCatalogView` | `DefaultLayout` | Захищений |
| `/discounts/:slug`  | `DiscountDetailsView`  | `DefaultLayout` | Захищений |
| `/faq`              | `FaqView`              | `DefaultLayout` | Захищений |
| `/admin`            | `AdminDashboardView`   | `AdminLayout`   | Захищений |
| `/admin/partners`   | `AdminPartnersView`    | `AdminLayout`   | Захищений |
| `/admin/categories` | `AdminCategoriesView`  | `AdminLayout`   | Захищений |
| `/admin/locations`  | `AdminLocationsView`   | `AdminLayout`   | Захищений |
| `/admin/faq`        | `AdminFaqView`         | `AdminLayout`   | Захищений |
| `/admin/texts`      | `AdminTextsView`       | `AdminLayout`   | Захищений |
| `/admin/images`     | `AdminImagesView`      | `AdminLayout`   | Захищений |
| `/admin/settings`   | `AdminSettingsView`    | `AdminLayout`   | Захищений |
| `/admin/users`      | `AdminUsersView`       | `AdminLayout`   | Захищений |

### Navigation Guard

```typescript
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // Тільки /login є публічним
  const isPublicRoute = to.path === '/login'

  // Редирект на логін для неавторизованих
  if (!authStore.isLoggedIn && !isPublicRoute) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  // Редирект з логіну для авторизованих
  if (authStore.isLoggedIn && to.path === '/login') {
    next({ name: 'discounts' })
    return
  }

  next()
})
```

---

## ⚙️ Структура конфігурації

### Файл: `src/data/app-config.json`

### Верхній рівень

```typescript
interface AppConfig {
  locales: Locale[] // ['ua', 'en']
  defaultLocale: Locale // 'ua'
  allowedUsers: AdminUser[] // Whitelist користувачів
  languages: Language[] // Конфігурація мов
  images: Images // Шляхи до зображень
  pages: Pages // Контент сторінок
  auth: AuthConfig // Тексти авторизації
  navigation: Navigation // Навігаційне меню
  filters: Filters // Фільтри каталогу
  pagination: Pagination // Тексти пагінації
  partners: Record<string, PartnerConfig> // Партнери
}
```

### Структура партнера

```typescript
interface PartnerConfig {
  id: string // Унікальний ID
  slug: string // URL-friendly ідентифікатор
  image: string // Шлях до зображення
  promoCode: string // Промокод

  // Локалізовані поля
  name: LocalizedText // { ua: string, en: string }
  category: LocalizedText
  location: LocalizedText
  summary: LocalizedText
  description: LocalizedText
  address?: LocalizedText

  // Знижка
  discount: {
    label: LocalizedText
    description?: LocalizedText
  }

  // Контакти
  contact: {
    website?: string
    email?: string
    phone?: string
  }

  // Соціальні мережі
  socials: Array<{
    type: 'facebook' | 'instagram'
    url: string
  }>

  // Умови використання
  terms: {
    ua: string[]
    en: string[]
  }

  // Теги (опціонально)
  tags?: {
    ua: string[]
    en: string[]
  }
}
```

### Структура користувача (whitelist)

```typescript
interface AdminUser {
  id: string
  email: string // Google email
  name: string
  role: 'admin' | 'editor' // admin = повний доступ, editor = без управління користувачами
  addedAt: string // ISO date
  addedBy: string // Хто додав
}
```

### Фільтри

```typescript
interface Filters {
  button: LocalizedText
  apply: LocalizedText
  removeFilter: LocalizedText

  locations: Record<string, FilterItem> // all, ua, europe, online
  categories: Record<string, FilterItem> // all, travel, fitness, online, beauty, shop, food, health, education, other
}

interface FilterItem {
  label: LocalizedText
  description: LocalizedText
}
```

---

## 🧩 Компоненти

### Layout компоненти

| Компонент           | Призначення                               |
| ------------------- | ----------------------------------------- |
| `DefaultLayout.vue` | Публічні сторінки (Header + Content)      |
| `AuthLayout.vue`    | Сторінка логіну (без Header)              |
| `AdminLayout.vue`   | Адмін-панель (Sidebar + Header + Content) |

### Admin компоненти

| Компонент              | Призначення                          |
| ---------------------- | ------------------------------------ |
| `AdminSidebar.vue`     | Бічна панель навігації               |
| `AdminHeader.vue`      | Заголовок з назвою сторінки          |
| `AdminPartnerForm.vue` | Форма створення/редагування партнера |
| `AdminExportPanel.vue` | Панель експорту та збереження        |

### UI компоненти

| Компонент      | Props                                                 | Опис              |
| -------------- | ----------------------------------------------------- | ----------------- |
| `UiButton.vue` | `variant`, `size`, `disabled`, `loading`              | Базова кнопка     |
| `UiInput.vue`  | `modelValue`, `type`, `placeholder`, `error`, `label` | Поле вводу        |
| `UiSelect.vue` | `modelValue`, `options`, `placeholder`                | Випадаючий список |
| `UiModal.vue`  | `isOpen`, `position`, `showBackdrop`                  | Модальне вікно    |

### Компоненти фільтрації

| Компонент           | Опис                           |
| ------------------- | ------------------------------ |
| `PartnerFilter.vue` | Кнопка фільтрів + активні чипи |
| `FilterModal.vue`   | Модальне вікно з фільтрами     |
| `FilterChips.vue`   | Відображення активних фільтрів |

### Іконки

Всі іконки — Vue компоненти з inline SVG у `src/components/icons/`:

```
ArrowBackIcon, BarsIcon, ChevronDownIcon, ChevronLeftIcon,
CloseIcon, CopyIcon, LogoutIcon
```

---

## 📝 Типи та інтерфейси

### Файл: `src/types/app-config.ts`

```typescript
export type Locale = 'ua' | 'en'

export interface LocalizedText {
  ua: string
  en: string
}

export interface AdminUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'editor'
  addedAt: string
  addedBy: string
}

export interface PartnerConfig {
  id: string
  slug: string
  image: string
  promoCode: string
  name: LocalizedText
  category: LocalizedText
  location: LocalizedText
  summary: LocalizedText
  description: LocalizedText
  discount: {
    label: LocalizedText
    description?: LocalizedText
  }
  contact: {
    website?: string
    email?: string
    phone?: string
  }
  address?: LocalizedText
  socials: Array<{ type: string; url: string }>
  terms: { ua: string[]; en: string[] }
  tags?: { ua: string[]; en: string[] }
}

export interface FilterCategory {
  label: LocalizedText
  description: LocalizedText
}

export interface FilterLocation {
  label: LocalizedText
  description: LocalizedText
}

export interface AppConfig {
  locales: Locale[]
  defaultLocale: Locale
  allowedUsers?: AdminUser[]
  languages: Language[]
  images: Images
  pages: Pages
  auth: AuthConfig
  navigation: Navigation
  filters: Filters
  pagination: Pagination
  partners: Record<string, PartnerConfig>
}
```

### Файл: `src/types/partner.ts`

```typescript
export type PartnerCategory =
  | 'travel'
  | 'fitness'
  | 'online'
  | 'beauty'
  | 'shop'
  | 'food'
  | 'health'
  | 'education'
  | 'other'

export interface Partner {
  id: string
  slug: string
  name: string
  category: PartnerCategory
  location: string
  discount: {
    label: string
    description?: string
    promoCode: string
  }
  images: {
    thumbnail: string
    hero?: string
  }
  summary: string
  description: string
  contact: {
    website?: string
    email?: string
    phone?: string
    address?: string
  }
  socials: Array<{ type: string; url: string }>
  terms: string[]
  tags?: string[]
}
```

---

## 🔧 Composables

### useAppConfig.ts

```typescript
export function useAppConfig() {
  const config = computed(() => appConfigData as AppConfig)
  const uiStore = useUiStore()
  const locale = computed(() => uiStore.locale)

  // Функція перекладу
  function t(text: LocalizedText | string): string {
    if (typeof text === 'string') return text
    return text[locale.value] || text.ua || ''
  }

  // Переклад з плейсхолдерами
  function tTemplate(text: LocalizedText, data: Record<string, any>): string {
    let result = t(text)
    Object.entries(data).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
    })
    return result
  }

  // Отримання шляху до зображення
  function getImage(path: string): string {
    // Обробка @/ аліасу
    if (path.startsWith('@/')) {
      return path.replace('@/', '/src/')
    }
    return path
  }

  return { config, locale, t, tTemplate, getImage }
}
```

### useMediaQuery.ts

```typescript
export function useMediaQuery(query: string) {
  const matches = ref(false)
  const mediaQuery = window.matchMedia(query)

  const updateMatches = () => {
    matches.value = mediaQuery.matches
  }

  updateMatches()
  mediaQuery.addEventListener('change', updateMatches)

  onUnmounted(() => {
    mediaQuery.removeEventListener('change', updateMatches)
  })

  return matches
}

// Використання
const isMobile = useMediaQuery('(max-width: 768px)')
const isDesktop = useMediaQuery('(min-width: 1024px)')
```

---

## 🎨 Стилі

### Структура стилів

```
src/styles/
├── main.scss          # Точка входу (імпорт всіх файлів)
├── base.scss          # Reset, базові стилі, scrollbar
├── core.scss          # Змінні, функції, міксини
└── responsive.scss    # Адаптивні стилі
```

### SCSS Функції

```scss
// Конвертація px в rem
@function to-rem($px) {
  @return calc($px / 16) * 1rem;
}

// Використання
.element {
  padding: to-rem(16); // → 1rem
  margin: to-rem(24); // → 1.5rem
}
```

### SCSS Міксини

```scss
// Media query mixin
@mixin mq($min: null, $max: null) {
  @if $min and $max {
    @media (min-width: map-get($breakpoints, $min)) and (max-width: map-get($breakpoints, $max) - 1px) {
      @content;
    }
  } @else if $min {
    @media (min-width: map-get($breakpoints, $min)) {
      @content;
    }
  } @else if $max {
    @media (max-width: map-get($breakpoints, $max) - 1px) {
      @content;
    }
  }
}

// Використання
.element {
  font-size: to-rem(16);

  @include mq(null, md) {
    font-size: to-rem(14); // < 768px
  }

  @include mq(lg) {
    font-size: to-rem(18); // >= 1024px
  }
}
```

### Брейкпоінти

| Назва | Значення | Пристрій            |
| ----- | -------- | ------------------- |
| `xs`  | `0`      | Мобільні (маленькі) |
| `sm`  | `576px`  | Мобільні (великі)   |
| `md`  | `768px`  | Планшети            |
| `lg`  | `1024px` | Десктопи (маленькі) |
| `xl`  | `1280px` | Десктопи (середні)  |
| `xxl` | `1440px` | Десктопи (великі)   |

### BEM Методологія

```scss
.component-name {
  // Block styles

  &__element {
    // Element styles

    &--modifier {
      // Modifier styles
    }
  }

  &--modifier {
    // Block modifier styles
  }
}
```

---

## 🛡️ Безпека

### Input Sanitization

Файл: `src/utils/sanitize.ts`

```typescript
// Екранування HTML
export function escapeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return str.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char)
}

// Видалення HTML тегів
export function stripHtmlTags(str: string): string {
  return str.replace(/<[^>]*>/g, '')
}

// Санітизація рядка
export function sanitizeString(str: string, maxLength = 1000): string {
  return escapeHtml(stripHtmlTags(str.trim())).slice(0, maxLength)
}

// Санітизація email
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim().slice(0, 254)
}

// Санітизація URL
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  try {
    const parsed = new URL(trimmed)
    if (!['http:', 'https:'].includes(parsed.protocol)) return ''
    return parsed.href
  } catch {
    return ''
  }
}

// Валідація email
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Валідація URL
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}
```

### Security Headers (public/\_headers)

```
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: https: blob:; connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com; frame-src https://accounts.google.com; object-src 'none'; base-uri 'self'

/admin/*
  X-Robots-Tag: noindex, nofollow
```

### HTTPS Redirect

```typescript
// src/main.ts
if (
  import.meta.env.PROD &&
  window.location.protocol === 'http:' &&
  !window.location.hostname.includes('localhost')
) {
  window.location.href = window.location.href.replace('http:', 'https:')
}
```

---

## 🚀 Скрипти та збірка

### NPM Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "run-p type-check \"build-only {@}\" --",
    "preview": "vite preview",
    "test:unit": "vitest",
    "type-check": "vue-tsc --build",
    "lint": "eslint . --fix --cache",
    "lint:styles": "stylelint \"src/**/*.{css,scss,vue}\" --fix",
    "format": "prettier --write .",
    "tokens:build": "tsx scripts/build-tokens.ts",
    "images:webp": "tsx scripts/convert-to-webp.ts",
    "deploy:r2": "./scripts/deploy-r2.sh",
    "deploy:worker": "./scripts/deploy-worker.sh",
    "deploy": "npm run build && npm run deploy:r2 && npm run deploy:worker"
  }
}
```

### Deploy Scripts

**deploy-r2.sh** — Деплой статичних файлів на R2:

```bash
#!/bin/bash
# Завантаження змінних з .env
export $(grep -v '^#' .env | xargs)

# Синхронізація dist/ з R2
aws s3 sync dist/ s3://$R2_BUCKET_NAME/ \
  --endpoint-url $R2_ENDPOINT \
  --profile $AWS_PROFILE \
  --delete
```

**deploy-worker.sh** — Деплой Cloudflare Worker:

```bash
#!/bin/bash
cd "$(dirname "$0")/../worker" || exit 1
wrangler deploy
```

### Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    watch: {
      // Ігноруємо app-config.json для уникнення HMR reload
      ignored: ['**/src/data/app-config.json'],
    },
  },
  // Dev API middleware
  configureServer(server) {
    server.middlewares.use('/api/load-config', (req, res, next) => {
      // ... serve app-config.json
    })
    server.middlewares.use('/api/save-config', (req, res, next) => {
      // ... save app-config.json
    })
  },
})
```

---

## 🐛 Troubleshooting

### Проблема: Зміни не зберігаються

**Рішення:**

1. Перевірте Worker Secrets в Cloudflare Dashboard
2. Перевірте логи Worker: `cd worker && npm run tail`
3. Перевірте console браузера на CORS помилки

### Проблема: 404 на production (/admin/partners)

**Рішення:** Проєкт використовує Hash History (`createWebHashHistory`). URL має бути:

```
https://.../#/admin/partners  ✅
https://.../admin/partners    ❌
```

### Проблема: Не можу увійти через Google

**Рішення:**

1. Перевірте `VITE_GOOGLE_CLIENT_ID` в `.env`
2. Перевірте Authorized JavaScript Origins в Google Cloud Console
3. Перевірте чи ваш email є в `allowedUsers` в `app-config.json`

### Проблема: Данные теряются после сохранения

**Рішення:** Stores ініціалізуються асинхронно. Функція `buildFullConfig()` має fallback:

```typescript
// Якщо store порожній — використовуємо оригінальні дані
const partners =
  Object.keys(partnersStore.partners).length > 0 ? partnersStore.partners : originalConfig.partners
```

---

## 📞 Контакти

**Проєкт:** UPSTARS Corporate Discounts  
**Версія документації:** 2.0.0  
**Дата оновлення:** 24 листопада 2025

---

## 👨‍💻 Автор

**Viktor Hirenko**  
Frontend Developer  
Email: v.hirenko@upstars.com
