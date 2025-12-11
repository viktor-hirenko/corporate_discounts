# 📚 Corporate Discounts - Документація проєкту

## 📋 Зміст

1. [Огляд проєкту](#огляд-проєкту)
2. [Архітектура](#архітектура)
3. [Структура конфігурації](#структура-конфігурації)
4. [Компоненти](#компоненти)
5. [Stores (Pinia)](#stores-pinia)
6. [Роутинг](#роутинг)
7. [Типи та інтерфейси](#типи-та-інтерфейси)
8. [Composables](#composables)
9. [Стилі](#стилі)
10. [Скрипти та збірка](#скрипти-та-збірка)

---

## 🎯 Огляд проєкту

**Corporate Discounts** — це Vue 3 застосунок для управління корпоративними знижками та партнерськими пропозиціями для команди UPSTARS.

### Основні можливості

- 🔐 Авторизація через Google Identity Services
- 📱 Адаптивний дизайн (mobile-first)
- 🌐 Мультимовність (українська/англійська)
- 🔍 Фільтрація партнерів за категоріями та локацією
- 📄 Детальні сторінки партнерів з промокодами
- ❓ FAQ секція
- 👨‍💼 Адмін-панель для управління партнерами
- 🎨 Кастомний скроллбар
- ♿ Підтримка accessibility

### Технологічний стек

```json
{
  "frontend": "Vue 3 (Composition API)",
  "state": "Pinia",
  "routing": "Vue Router 4",
  "styling": "SCSS + Design Tokens",
  "types": "TypeScript 5.9",
  "build": "Vite 7",
  "lint": "ESLint + Stylelint",
  "format": "Prettier"
}
```

---

## 🏗️ Архітектура

### Структура проєкту

```
corporate-discounts/
├── src/
│   ├── components/         # Vue компоненти
│   │   ├── admin/          # Адмін-панель
│   │   └── icons/          # SVG іконки
│   ├── composables/        # Логіка для перевикористання
│   ├── data/               # Конфігурація (app-config.json)
│   ├── design/             # Design tokens
│   ├── layouts/            # Шаблони сторінок
│   ├── router/             # Vue Router конфіг
│   ├── stores/             # Pinia stores
│   ├── styles/             # Глобальні стилі
│   ├── types/              # TypeScript типи
│   ├── views/              # Сторінки застосунку
│   ├── App.vue             # Кореневий компонент
│   └── main.ts             # Точка входу
├── scripts/                # Build скрипти
├── index.html              # HTML entry point
└── package.json            # Залежності та скрипти
```

### Архітектурні принципи

1. **Component-based**: Модульна структура з компонентами для перевикористання
2. **State Management**: Централізоване управління станом через Pinia
3. **Type Safety**: Сувора типізація через TypeScript
4. **Configuration-driven**: JSON конфіг для контенту та перекладів
5. **Design System**: Design tokens для узгодженості UI
6. **Mobile-first**: Адаптивний дизайн з пріоритетом мобільних пристроїв

### Потоки даних

```
app-config.json (джерело даних)
        ↓
useAppConfig composable (обробка)
        ↓
Pinia Stores (стан)
        ↓
Components (відображення)
```

---

## ⚙️ Структура конфігурації

### Основний конфіг: `src/data/app-config.json`

Центральний файл конфігурації містить **ВСІ** дані застосунку.

#### Структура верхнього рівня

```typescript
interface AppConfig {
  locales: Locale[] // Підтримувані локалі ['ua', 'en']
  defaultLocale: Locale // Локаль за замовчуванням
  languages: Language[] // Конфіг мов
  images: Images // Шляхи до зображень
  pages: Pages // Контент сторінок
  auth: AuthConfig // Тексти авторизації
  navigation: Navigation // Навігаційне меню
  filters: Filters // Фільтри для каталогу
  pagination: Pagination // Тексти пагінації
  partners: PartnersConfig // 🔥 ПАРТНЕРИ (основний розділ)
}
```

---

### 🔥 Розділ `partners` (ДЕТАЛЬНО)

**Найважливіший розділ конфігу** — об'єкт з партнерами, де ключ = slug партнера.

#### Структура одного партнера

```json
{
  "partners": {
    "partner-slug": {
      "id": "unique-id",
      "slug": "partner-slug",
      "image": "@/assets/images/partners/partner.jpg",
      "promoCode": "UPSTARS20",
      "category": {
        "ua": "Фітнес",
        "en": "Fitness"
      },
      "location": {
        "ua": "UA/Київ",
        "en": "UA/Kyiv"
      },
      "name": {
        "ua": "Назва партнера",
        "en": "Partner Name"
      },
      "summary": {
        "ua": "Короткий опис",
        "en": "Short description"
      },
      "description": {
        "ua": "Повний опис партнера...",
        "en": "Full partner description..."
      },
      "discount": {
        "label": {
          "ua": "20% знижка",
          "en": "20% discount"
        },
        "description": {
          "ua": "Опис умов знижки",
          "en": "Discount conditions description"
        }
      },
      "contact": {
        "website": "https://partner.com",
        "email": "info@partner.com",
        "phone": "+380XXXXXXXXX",
        "address": "Вулиця, 1"
      },
      "address": {
        "ua": "м. Київ, вул. Хрещатик, 1",
        "en": "Kyiv, Khreshchatyk St., 1"
      },
      "socials": [
        {
          "type": "facebook",
          "url": "https://facebook.com/partner"
        },
        {
          "type": "instagram",
          "url": "https://instagram.com/partner"
        }
      ],
      "terms": {
        "ua": ["Умова використання 1", "Умова використання 2"],
        "en": ["Terms of use 1", "Terms of use 2"]
      },
      "tags": {
        "ua": ["тег1", "тег2", "тег3"],
        "en": ["tag1", "tag2", "tag3"]
      }
    }
  }
}
```

#### Опис полів партнера

| Поле                   | Тип                            | Обов'язкове                       | Опис                                                        |
| ---------------------- | ------------------------------ | --------------------------------- | ----------------------------------------------------------- |
| `id`                   | `string`                       | ✅ Так                            | Унікальний ідентифікатор партнера                           |
| `slug`                 | `string`                       | ✅ Так                            | URL-friendly ідентифікатор (використовується в роутингу)    |
| `image`                | `string`                       | ✅ Так                            | Шлях до зображення (підтримує `.jpg`, `.webp`)              |
| `promoCode`            | `string`                       | ✅ Так                            | Промокод для копіювання                                     |
| `category`             | `LocalizedText`                | ✅ Так                            | Категорія партнера (фільтр)                                 |
| `location`             | `LocalizedText`                | ✅ Так                            | Локація партнера (фільтр)                                   |
| `name`                 | `LocalizedText`                | ✅ Так                            | Назва партнера                                              |
| `summary`              | `LocalizedText`                | ✅ Так                            | Короткий опис (для картки)                                  |
| `description`          | `LocalizedText`                | ✅ Так                            | Повний опис (для детальної сторінки)                        |
| `discount.label`       | `LocalizedText`                | ✅ Так                            | Текст знижки (напр. "20% знижка")                           |
| `discount.description` | `LocalizedText`                | ❌ Ні                             | Додатковий опис умов                                        |
| `contact.website`      | `string`                       | ❌ Ні                             | URL вебсайту                                                |
| `contact.email`        | `string`                       | ❌ Ні                             | Email для зв'язку                                           |
| `contact.phone`        | `string`                       | ❌ Ні                             | Телефон                                                     |
| `contact.address`      | `string`                       | ❌ Ні                             | Проста адреса (якщо не потрібна локалізація)                |
| `address`              | `LocalizedText`                | ❌ Ні                             | Локалізована адреса (пріоритетніша за `contact.address`)    |
| `socials`              | `Array<Social>`                | ✅ Так (масив може бути порожнім) | Соцмережі (`facebook`, `instagram`, `telegram`, `linkedin`) |
| `terms`                | `{ua: string[], en: string[]}` | ✅ Так                            | Умови використання (масив рядків)                           |
| `tags`                 | `{ua: string[], en: string[]}` | ❌ Ні                             | Теги для пошуку (масив рядків)                              |

#### Правила заповнення категорій

**Доступні категорії** (мають збігатися з `filters.categories`):

```json
{
  "all": "Всі категорії / All categories",
  "travel": "Подорожі / Travel",
  "fitness": "Фітнес / Fitness",
  "online": "Онлайн / Online",
  "beauty": "Краса / Beauty",
  "shop": "Магазини / Shops",
  "food": "Їжа та напої / Food & Drinks",
  "health": "Здоров'я / Health",
  "education": "Освіта / Education",
  "other": "Інше / Other"
}
```

**Важливо**: Використовуйте українські значення з конфігу:

```json
"category": {
  "ua": "Фітнес",  // ✅ Правильно (з filters.categories)
  "en": "Fitness"
}
```

#### Правила заповнення локацій

**Формат локацій**:

```
Код_країни/Місто або Онлайн
```

**Приклади**:

```json
"location": {
  "ua": "UA/Київ",          // ✅ Україна, Київ
  "en": "UA/Kyiv"
}

"location": {
  "ua": "UA/Онлайн",        // ✅ Україна, онлайн
  "en": "UA/Online"
}

"location": {
  "ua": "Online",           // ✅ Глобально онлайн
  "en": "Online"
}

"location": {
  "ua": "PL/Варшава",       // ✅ Польща, Варшава
  "en": "PL/Warsaw"
}

"location": {
  "ua": "UA/Закордон",      // ✅ Український партнер за кордоном
  "en": "UA/Abroad"
}
```

**Логіка фільтрації** (в `stores/discounts.ts`):

- **Фільтр "ua"**: Показує `UA/*` (включно з `UA/Онлайн`)
- **Фільтр "europe"**: Показує `PL/*`, `LT/*`, `UA/Закордон`
- **Фільтр "online"**: Показує `Online` та будь-яку локацію з "Онлайн"

---

### 📄 Розділ `pages`

Містить тексти для всіх сторінок застосунку.

#### `pages.discounts`

```typescript
interface PageDiscounts {
  title: LocalizedText // Заголовок сторінки
  description: LocalizedText // Опис
  messages: {
    resultsCount: LocalizedText // "Показано X-Y з Z партнерів"
    empty: LocalizedText // Повідомлення при порожніх результатах
    loading: LocalizedText // Текст завантаження
    error: LocalizedText // Текст помилки
    retry: LocalizedText // Кнопка повтору
  }
}
```

**Placeholder в `resultsCount`**:

```json
"resultsCount": {
  "ua": "Показано {{start}}-{{end}} з {{total}} партнерів",
  "en": "Showing {{start}}-{{end}} of {{total}} partners"
}
```

#### `pages.discountDetails`

```typescript
interface PageDiscountDetails {
  backButton: LocalizedText // Текст кнопки "Назад"
  offer: LocalizedText // "Пропозиція:"
  promoCode: {
    label: LocalizedText // "Promo code"
    copy: LocalizedText // "СКОПІЮВАТИ КОД"
    copied: LocalizedText // "Скопійовано!"
  }
  contactInfo: {
    title: LocalizedText // "Контактна інформація"
    address: LocalizedText // "Адреса"
    website: LocalizedText // "Вебсайт"
    socials: {
      facebook: LocalizedText // "Facebook"
      instagram: LocalizedText // "Instagram"
      telegram: LocalizedText // "Telegram"
      linkedin: LocalizedText // "LinkedIn"
    }
  }
  terms: {
    title: LocalizedText // "Умови використання"
  }
  cta: {
    title: LocalizedText // Заголовок CTA блоку
    description: LocalizedText // Опис
    button: LocalizedText // Текст кнопки
  }
}
```

#### `pages.faq`

```typescript
interface PageFaq {
  title: LocalizedText // Заголовок сторінки FAQ
  description: LocalizedText // Опис
  cta: {
    title: LocalizedText // Заголовок CTA
    description: LocalizedText // Опис
    button: LocalizedText // Текст кнопки
  }
  notice: {
    title: LocalizedText // Заголовок повідомлення
    text: LocalizedText // Текст повідомлення
  }
  items: FaqItem[] // Масив FAQ питань
}
```

**Структура FAQ питання**:

```json
{
  "id": "faq-1",
  "category": "general",
  "question": {
    "ua": "Як отримати знижку?",
    "en": "How to get a discount?"
  },
  "answer": {
    "ua": "Відповідь...",
    "en": "Answer..."
  }
}
```

**Категорії FAQ** (`general`, `promoCodes`, `catalog`, `support`)

---

### 🔍 Розділ `filters`

Конфігурація фільтрів для каталогу партнерів.

```typescript
interface Filters {
  button: LocalizedText // Текст кнопки "Фільтри"
  apply: LocalizedText // Кнопка "Застосувати"
  removeFilter: LocalizedText // "Видалити фільтр"

  locations: {
    all: FilterLocation // "Всі локації"
    ua: FilterLocation // "Україна"
    europe: FilterLocation // "Європа"
    online: FilterLocation // "Онлайн"
  }

  categories: {
    all: FilterCategory // "Всі категорії"
    travel: FilterCategory // "Подорожі"
    fitness: FilterCategory // "Фітнес"
    online: FilterCategory // "Онлайн"
    beauty: FilterCategory // "Краса"
    shop: FilterCategory // "Магазини"
    food: FilterCategory // "Їжа та напої"
    health: FilterCategory // "Здоров'я"
    education: FilterCategory // "Освіта"
    other: FilterCategory // "Інше"
  }
}

interface FilterLocation {
  label: LocalizedText // Назва фільтра
  description: LocalizedText // Опис (tooltip/підказка)
}

interface FilterCategory {
  label: LocalizedText // Назва категорії
  description: LocalizedText // Опис категорії
}
```

**Важливо**: Категорії в `filters.categories` використовуються для маппінгу категорій партнерів.

---

### 🖼️ Розділ `images`

Шляхи до статичних зображень застосунку.

```typescript
interface Images {
  logo: {
    dark: string // Лого для темної теми
    light: string // Лого для світлої теми
  }
  tagline: string // Слоган/підзаголовок
  loginBackground: string // Фон сторінки входу
  bot: string // Зображення бота
}
```

**Приклад**:

```json
{
  "images": {
    "logo": {
      "dark": "@/assets/images/upstars-logo-dark.svg",
      "light": "@/assets/images/upstars-logo-light.svg"
    },
    "tagline": "@/assets/images/corporate-discounts-text.svg",
    "loginBackground": "@/assets/images/login-background.svg",
    "bot": "@/assets/images/bot-img.svg"
  }
}
```

**Аліас `@`**: Вказує на директорію `src/`

---

### 🌐 Розділ `languages`

Конфігурація підтримуваних мов.

```typescript
interface Language {
  code: Locale // 'ua' | 'en'
  label: LocalizedText // Повна назва мови
  shortLabel: string // Коротке позначення (для UI)
}
```

**Приклад**:

```json
{
  "languages": [
    {
      "code": "ua",
      "label": {
        "ua": "Українська",
        "en": "Ukrainian"
      },
      "shortLabel": "ua"
    },
    {
      "code": "en",
      "label": {
        "ua": "English",
        "en": "English"
      },
      "shortLabel": "en"
    }
  ]
}
```

---

### 🔐 Розділ `auth`

Тексти для сторінки авторизації.

```typescript
interface AuthConfig {
  continue: LocalizedText // "Продовжити"
  login: LocalizedText // "Увійти"
  or: LocalizedText // "або"
  welcomeBack: LocalizedText // "Раді бачити знову"
  notYou: LocalizedText // "Це не ти?"
  useAnotherAccount: LocalizedText // "Використати інший акаунт"
  logout: LocalizedText // "Вийти"
}
```

---

### 🧭 Розділ `navigation`

Тексти для навігаційного меню.

```typescript
interface Navigation {
  home: LocalizedText // "Головна"
  faq: LocalizedText // "FAQ"
}
```

---

### 📄 Розділ `pagination`

Тексти для компонента пагінації.

```typescript
interface Pagination {
  previous: LocalizedText // "Попередня"
  next: LocalizedText // "Наступна"
  ariaLabels: {
    navigation: LocalizedText // "Навігація по сторінках"
    previousPage: LocalizedText // "Попередня сторінка"
    nextPage: LocalizedText // "Наступна сторінка"
    skipPages: LocalizedText // "Пропустити сторінки"
    goToPage: LocalizedText // "Перейти на сторінку"
  }
}
```

---

## 🧩 Компоненти

### Layout компоненти

#### `DefaultLayout.vue`

Основний layout для авторизованих сторінок.

**Структура**:

```vue
<template>
  <AppHeader />
  <main class="container">
    <RouterView />
  </main>
</template>
```

**Використовується для**:

- `/discounts` — каталог партнерів
- `/discounts/:slug` — детальна сторінка партнера
- `/faq` — FAQ сторінка

#### `AuthLayout.vue`

Layout для сторінки авторизації.

**Структура**:

```vue
<template>
  <div class="auth-layout">
    <RouterView />
  </div>
</template>
```

**Використовується для**:

- `/login` — сторінка входу

---

### Основні компоненти

#### `AppHeader.vue`

Шапка застосунку з навігацією та вибором мови.

**Включає**:

- Логотип UPSTARS
- Навігаційне меню (`NavigationLinks`)
- Селектор мови (`LanguageSelector`)
- Dropdown користувача (`UserDropdown`)
- Мобільне меню (`MobileMenu`)

#### `AppFooter.vue`

Підвал застосунку з копірайтом.

#### `AuthLogin.vue`

Компонент авторизації через Google та email.

**Функціонал**:

- Google Sign-In (Google Identity Services)
- Email вхід
- Збереження токена в localStorage
- Автовідновлення сесії

**Важливі змінні оточення**:

```env
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

---

### Компоненти фільтрації

#### `PartnerFilter.vue`

Основний компонент фільтрів для каталогу.

**Props**: немає

**Emits**: немає (використовує `useDiscountsStore`)

**Функціонал**:

- Кнопка відкриття модального вікна фільтрів
- Відображення активних фільтрів (`FilterChips`)

#### `FilterModal.vue`

Модальне вікно з фільтрами.

**Props**:

```typescript
interface Props {
  isOpen: boolean // Стан відкрито/закрито
}
```

**Emits**:

```typescript
{
  close: [] // Закриття модального вікна
}
```

**Функціонал**:

- Вибір локації (радіо-кнопки)
- Вибір категорії (список з чекбоксами)
- Кнопка "Застосувати фільтри"

#### `FilterChips.vue`

Відображення активних фільтрів у вигляді чипів.

**Props**: немає (використовує `useDiscountsStore`)

**Функціонал**:

- Показує активні фільтри
- Видалення фільтра по кліку на хрестик

---

### Компоненти партнерів

#### `PartnerCard.vue`

Картка партнера в каталозі.

**Props**:

```typescript
interface Props {
  partner: Partner // Дані партнера
}
```

**Функціонал**:

- Відображення зображення (з fallback placeholder)
- Назва та короткий опис
- Категорія та локація
- Знижка
- Клік → перехід на детальну сторінку

#### `PagesPagination.vue`

Компонент пагінації для каталогу.

**Props**: немає (використовує `useDiscountsStore`)

**Функціонал**:

- Навігація по сторінках
- Кнопки "Назад"/"Вперед"
- Прямий перехід на сторінку
- Accessibility (ARIA labels)

---

### UI компоненти

#### `UiButton.vue`

Базова кнопка.

**Props**:

```typescript
interface Props {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit' | 'reset'
}
```

#### `UiInput.vue`

Поле вводу.

**Props**:

```typescript
interface Props {
  modelValue: string
  type?: 'text' | 'email' | 'password' | 'number'
  placeholder?: string
  disabled?: boolean
  error?: string
  label?: string
}
```

**Emits**:

```typescript
{
  'update:modelValue': [value: string]
}
```

#### `UiSelect.vue`

Випадаючий список.

**Props**:

```typescript
interface Props {
  modelValue: string | null
  options: Array<{ value: string; label: string }>
  placeholder?: string
  disabled?: boolean
}
```

**Emits**:

```typescript
{
  'update:modelValue': [value: string | null]
}
```

#### `UiModal.vue`

Універсальне модальне вікно.

**Props**:

```typescript
interface Props {
  isOpen: boolean
  position?: 'mobile' | 'dropdown' | 'center'
  showBackdrop?: boolean
  showCloseButton?: boolean
  showHeader?: boolean
  customScrollbar?: boolean
  headerAbsolute?: boolean
}
```

**Slots**:

- `header` — Заголовок
- `default` — Основний контент
- `footer` — Підвал

**Emits**:

```typescript
{
  close: []
}
```

#### `CustomScrollbar.vue`

Кастомний скроллбар для модальних вікон.

**Props**:

```typescript
interface Props {
  containerRef: HTMLElement | null
  parentRef?: HTMLElement | null
}
```

---

### Утилітні компоненти

#### `AccordionItem.vue`

Елемент акордеону для FAQ.

**Props**:

```typescript
interface Props {
  title: string
  isOpen: boolean
}
```

**Emits**:

```typescript
{
  toggle: []
}
```

#### `LanguageSelector.vue`

Перемикач мови.

**Функціонал**:

- Dropdown з доступними мовами
- Збереження вибору в localStorage
- Оновлення глобального стану

#### `UserDropdown.vue`

Dropdown меню користувача.

**Функціонал**:

- Аватар користувача
- Ім'я та email
- Кнопка виходу

#### `UserInfo.vue`

Інформація про користувача на сторінці входу.

**Props**:

```typescript
interface Props {
  userName: string
  userEmail: string
  imageSrc: string | null
}
```

---

### Компоненти іконок

Всі іконки — це Vue компоненти з inline SVG.

**Список**:

- `ArrowBackIcon.vue` — Стрілка назад
- `BarsIcon.vue` — Меню (гамбургер)
- `ChevronDownIcon.vue` — Шеврон вниз
- `ChevronLeftIcon.vue` — Шеврон вліво
- `CloseIcon.vue` — Хрестик закриття
- `CopyIcon.vue` — Іконка копіювання
- `LogoutIcon.vue` — Іконка виходу

**Використання**:

```vue
<template>
  <CloseIcon class="icon" />
</template>

<style scoped>
.icon {
  width: 24px;
  height: 24px;
  color: currentColor;
}
</style>
```

---

## 🗄️ Stores (Pinia)

### `auth.ts`

Управління авторизацією користувача.

**State**:

```typescript
{
  user: {
    email: string
    name: string
    picture: string
  } | null
  token: string | null
  isLoggedIn: boolean
}
```

**Getters**:

```typescript
{
  userEmail: string | null // Email користувача
  userName: string | null // Ім'я користувача
  userPicture: string | null // Аватар користувача
}
```

**Actions**:

```typescript
{
  loginWithGoogle(credential: string): void // Вхід через Google
  loginWithEmail(email: string): void // Вхід по email
  logout(): void // Вихід
  restoreSession(): void // Відновлення сесії
}
```

**Збереження в localStorage**:

```typescript
{
  "corporate-discounts-auth": {
    "token": "jwt-token",
    "user": {
      "email": "user@example.com",
      "name": "User Name",
      "picture": "https://..."
    }
  }
}
```

---

### `discounts.ts`

Управління каталогом партнерів та фільтрами.

**State**:

```typescript
{
  items: Partner[] // Масив всіх партнерів
  status: 'idle' | 'loading' | 'success' | 'error'
  error: string | null
  filters: {
    search: string // Пошуковий запит
    category: string // Фільтр по категорії
    location: string // Фільтр по локації
  }
  pagination: {
    page: number // Поточна сторінка
    pageSize: number // Розмір сторінки (9)
  }
}
```

**Getters**:

```typescript
{
  filteredPartners: Partner[] // Відфільтровані партнери
  totalFiltered: number // Кількість після фільтрації
  paginatedPartners: Partner[] // Партнери на поточній сторінці
  totalPages: number // Всього сторінок
  displayedRange: { start: number; end: number } // Діапазон відображення
  getPartnerBySlug: (slug: string) => Partner | undefined
}
```

**Actions**:

```typescript
{
  loadPartners(): Promise<void> // Завантаження партнерів з конфігу
  setSearch(search: string): void // Встановити пошук
  setCategory(category: string): void
  setLocation(location: string): void
  resetFilters(): void // Скинути всі фільтри
  goToPage(page: number): void // Перехід на сторінку
  resetPage(): void // Скидання на 1-шу сторінку
}
```

**Логіка фільтрації**:

1. **Пошук** — не чутливий до регістру, шукає по:
   - `name`, `summary`, `description`, `tags`, `discount.label`

2. **Категорія**:
   - `all` — всі партнери
   - `online` (псевдо-категорія) — партнери з локацією "Online" або "Онлайн"
   - Інші — точний збіг

3. **Локація**:
   - `all` — всі партнери
   - `ua` — партнери з `location` що починається з "UA"
   - `europe` — партнери з `PL/`, `LT/`, `UA/Закордон`
   - `online` — партнери з "Online" або "Онлайн" у локації

---

### `ui.ts`

Управління UI станом застосунку.

**State**:

```typescript
{
  isMobileMenuOpen: boolean // Стан мобільного меню
  isFilterModalOpen: boolean // Стан модального вікна фільтрів
  locale: Locale // Поточна локаль
}
```

**Actions**:

```typescript
{
  toggleMobileMenu(): void // Перемикнути мобільне меню
  closeMobileMenu(): void // Закрити мобільне меню
  openFilterModal(): void // Відкрити модальне вікно фільтрів
  closeFilterModal(): void // Закрити модальне вікно фільтрів
  setLocale(locale: Locale): void // Встановити локаль
}
```

---

## 🧭 Роутинг

### Маршрути

```typescript
;[
  {
    path: '/',
    redirect: '/login',
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    layout: AuthLayout,
  },
  {
    path: '/discounts',
    name: 'discounts',
    component: DiscountsCatalogView,
    layout: DefaultLayout,
  },
  {
    path: '/discounts/:slug',
    name: 'discount-details',
    component: DiscountDetailsView,
    layout: DefaultLayout,
    props: true,
  },
  {
    path: '/faq',
    name: 'faq',
    component: FaqView,
    layout: DefaultLayout,
  },
  {
    path: '/admin/partners',
    name: 'partners-admin',
    component: PartnersAdminView,
    layout: null, // без layout
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login',
  },
]
```

### Navigation Guards

**Перевірка авторизації**:

```typescript
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  const publicRoutes = ['/login', '/admin/partners']
  const isPublicRoute = publicRoutes.includes(to.path)

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

**ScrollBehavior**:

```typescript
scrollBehavior(to, from, savedPosition) {
  // Збережена позиція (назад/вперед)
  if (savedPosition) {
    return savedPosition
  }

  // Скрол вгору при переході на іншу сторінку
  if (to.path !== from.path) {
    return { top: 0 }
  }

  // Зберігати позицію при зміні query params
  return false
}
```

---

## 📝 Типи та інтерфейси

### `types/partner.ts`

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

export type PartnerLocation = string // "UA/Київ", "Online", "PL/Варшава"

export interface Partner {
  id: string
  slug: string
  name: string
  category: PartnerCategory
  location: PartnerLocation
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
  socials: Array<{
    type: 'facebook' | 'instagram' | 'telegram' | 'linkedin'
    url: string
  }>
  terms: string[]
  tags?: string[]
}

export interface DiscountFilters {
  search: string
  category: string
  location: string
}

export interface PaginationState {
  page: number
  pageSize: number
}
```

### `types/faq.ts`

```typescript
export interface FaqCategory {
  general: string
  promoCodes: string
  catalog: string
  support: string
}

export interface FaqItem {
  id: string
  category: keyof FaqCategory
  question: string
  answer: string
}
```

### `types/app-config.ts`

_(Див. розділ "Структура конфігурації")_

---

## 🔧 Composables

### `useAppConfig.ts`

Центральний composable для роботи з конфігурацією.

**Повертає**:

```typescript
{
  config: ComputedRef<AppConfig> // Весь конфіг
  locale: ComputedRef<Locale> // Поточна локаль
  t: (text: LocalizedText | string) => string // Функція перекладу
  getImage: (path: string) => string // Отримання шляху до зображення
  tTemplate: (text: LocalizedText, data: Record<string, any>) => string // Переклад з плейсхолдерами
}
```

**Використання**:

```typescript
import { useAppConfig } from '@/composables/useAppConfig'

const { config, locale, t, getImage, tTemplate } = useAppConfig()

// Переклад
const title = t(config.value.pages.discounts.title)

// Шаблон з плейсхолдерами
const message = tTemplate(config.value.pages.discounts.messages.resultsCount, {
  start: 1,
  end: 9,
  total: 50,
})

// Зображення
const logo = getImage(config.value.images.logo.dark)
```

---

### `useMediaQuery.ts`

Reactive media query matcher.

**Використання**:

```typescript
import { useMediaQuery } from '@/composables/useMediaQuery'

const isMobile = useMediaQuery('(max-width: 768px)')
const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)')
const isDesktop = useMediaQuery('(min-width: 1025px)')
```

---

### `usePartnersAdmin.ts`

Composable для адмін-панелі управління партнерами.

**Повертає**:

```typescript
{
  partners: Ref<PartnerFormData[]> // Список партнерів
  addPartner: (data: PartnerFormData) => void
  updatePartner: (id: string, data: PartnerFormData) => void
  deletePartner: (id: string) => void
  exportConfig: () => string // Експорт в JSON
}
```

---

## 🎨 Стилі

### Структура `/src/styles`

```
styles/
├── main.scss                # Головний файл (імпорт всіх інших)
├── base.scss                # Reset, базові стилі, scrollbar
├── core.scss                # Змінні, функції, міксини
├── responsive.scss          # Адаптивні стилі
└── tokens/                  # Design tokens
    ├── _breakpoints.scss    # Брейкпоінти
    ├── _design.scss         # Кольори, відступи, шрифти
    ├── _motion.scss         # Анімації
    └── _type.scss           # Типографіка
```

### SCSS Функції

**`to-rem($px)`** — Конвертація px в rem:

```scss
.element {
  padding: to-rem(16); // → 1rem
  margin: to-rem(24); // → 1.5rem
}
```

### SCSS Міксини

**`mq($min, $max)`** — Media query:

```scss
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

**Брейкпоінти**:

```scss
$breakpoints: (
  'xs': 0,
  'sm': 576px,
  'md': 768px,
  'lg': 1024px,
  'xl': 1280px,
  'xxl': 1440px,
);
```

### Кастомний скроллбар

**Глобальні класи**:

```scss
.scroll-visible {
  // Скроллбар завжди видимий (білий трек, сірий thumb)
}

.scroll-visible-alt {
  // Скроллбар завжди видимий (сині кольори)
}

.scroll-hide {
  // Сховати скроллбар повністю
}
```

**Застосування**:

```html
<html lang="uk" class="scroll-visible-alt">
  <!-- Весь сайт з кастомним скроллбаром -->
</html>
```

### CSS Змінні (Design Tokens)

**Кольори**:

```css
--color-primary-500: #0927f2;
--color-neutral-400: #e8e7ff;
--color-neutral-900: #210e5f;
```

**Відступи**:

```css
--spacing-xs: 0.5rem; /* 8px */
--spacing-sm: 1rem; /* 16px */
--spacing-md: 1.5rem; /* 24px */
--spacing-lg: 2rem; /* 32px */
```

**Шрифти**:

```css
--font-family-base: 'Nunito Sans', sans-serif;
--font-size-base: 1rem;
--font-weight-regular: 400;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

---

## 🚀 Скрипти та збірка

### NPM Scripts

```bash
# Development
npm run dev              # Запуск dev сервера

# Build
npm run build            # Збірка для production
npm run preview          # Превью production збірки

# Linting
npm run lint             # ESLint (TypeScript + Vue)
npm run lint:styles      # Stylelint (SCSS + CSS)

# Formatting
npm run format           # Prettier (форматування)
npm run format:check     # Prettier (перевірка)

# Type checking
npm run type-check       # TypeScript перевірка типів

# Design Tokens
npm run tokens:build     # Збірка design tokens
npm run tokens:watch     # Збірка + watch mode
npm run tokens:docs      # Експорт документації токенів

# Images
npm run images:webp      # Конвертація зображень в WebP
```

### Build скрипти

**`scripts/build-tokens.ts`**

Генерує TypeScript та CSS файли з `src/design/tokens.json`.

**Вихідні файли**:

- `src/design/design-tokens.ts` — TypeScript константи
- `src/design/design-tokens.d.ts` — TypeScript типи
- `src/design/tokens.css` — CSS змінні

**`scripts/convert-to-webp.ts`**

Конвертує JPG/PNG зображення в WebP формат.

**Використовує**: Sharp бібліотеку

**`scripts/export-docs.ts`**

Експортує документацію по design tokens в Markdown.

---

## 📦 Змінні оточення

### `.env` файл (не комітиться)

```env
# Google OAuth
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Base URL (якщо потрібно)
VITE_BASE_URL=https://corporate-discounts.upstars.com
```

### Використання в коді

```typescript
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

if (!googleClientId) {
  console.warn('Google Client ID is not configured')
}
```

---

## 🔒 Авторизація

### Google Identity Services

**Ініціалізація**:

```typescript
window.google.accounts.id.initialize({
  client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  callback: handleGoogleCallback,
  ux_mode: 'popup',
  auto_select: false,
})

window.google.accounts.id.renderButton(googleButtonRef.value, {
  type: 'standard',
  theme: 'outline',
  size: 'large',
  width: '400',
  locale: locale.value,
})
```

**Обробка callback**:

```typescript
function handleGoogleCallback(response: any) {
  const credential = response.credential
  authStore.loginWithGoogle(credential)
}
```

### JWT токен

**Декодування**:

```typescript
const parts = credential.split('.')
const payload = JSON.parse(atob(parts[1]))

// payload містить:
{
  email: string
  name: string
  picture: string
  sub: string // Google user ID
  // ... інші поля
}
```

---

## 🌍 Інтернаціоналізація (i18n)

### Система перекладів

Всі переклади зберігаються в `app-config.json` у форматі:

```json
{
  "ua": "Текст українською",
  "en": "Text in English"
}
```

### Функція перекладу `t()`

```typescript
const { t } = useAppConfig()

const title = t(config.value.pages.discounts.title)
// locale = 'ua' → "Корпоративні знижки"
// locale = 'en' → "Corporate Discounts"
```

### Шаблони з плейсхолдерами `tTemplate()`

```typescript
const { tTemplate } = useAppConfig()

const message = tTemplate(config.value.pages.discounts.messages.resultsCount, {
  start: 1,
  end: 9,
  total: 50,
})
// "Показано 1-9 з 50 партнерів"
```

**Синтаксис плейсхолдерів**: `{{key}}`

---

## 📱 Адаптивність

### Стратегія Mobile-First

Всі стилі пишуться спочатку для мобільних пристроїв, потім розширюються для десктопу.

```scss
.element {
  // Базові стилі для мобільних
  font-size: to-rem(14);
  padding: to-rem(16);

  @include mq(md) {
    // Стилі для планшетів (>= 768px)
    font-size: to-rem(16);
    padding: to-rem(24);
  }

  @include mq(lg) {
    // Стилі для десктопу (>= 1024px)
    font-size: to-rem(18);
    padding: to-rem(32);
  }
}
```

### Брейкпоінти

| Назва | Значення | Пристрій            |
| ----- | -------- | ------------------- |
| `xs`  | `0px`    | Мобільні (маленькі) |
| `sm`  | `576px`  | Мобільні (великі)   |
| `md`  | `768px`  | Планшети            |
| `lg`  | `1024px` | Десктопи (маленькі) |
| `xl`  | `1280px` | Десктопи (середні)  |
| `xxl` | `1440px` | Десктопи (великі)   |

---

## ♿ Accessibility (A11Y)

### ARIA атрибути

**Пагінація**:

```vue
<nav aria-label="Навігація по сторінках">
  <button aria-label="Попередня сторінка">
    <!-- ... -->
  </button>
</nav>
```

**Модальні вікна**:

```vue
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <h2 id="modal-title">Заголовок модального вікна</h2>
  <!-- ... -->
</div>
```

### Keyboard Navigation

- **Tab** — перехід між елементами
- **Enter/Space** — активація кнопок
- **Escape** — закриття модальних вікон
- **Arrow keys** — навігація в списках

### Focus Management

```typescript
// Автофокус при відкритті модального вікна
onMounted(() => {
  if (props.isOpen) {
    nextTick(() => {
      firstFocusableElement.value?.focus()
    })
  }
})
```

---

## 🧪 Тестування

### Unit тести (Vitest)

```bash
npm run test:unit
```

**Приклад тесту**:

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PartnerCard from '@/components/PartnerCard.vue'

describe('PartnerCard', () => {
  it('renders partner name', () => {
    const wrapper = mount(PartnerCard, {
      props: {
        partner: {
          id: '1',
          slug: 'partner-1',
          name: 'Test Partner',
          // ...
        },
      },
    })

    expect(wrapper.text()).toContain('Test Partner')
  })
})
```

---

## 🚀 Деплой

### Production збірка

```bash
npm run build
```

**Вихідна директорія**: `dist/`

### Оптимізації

1. **Code splitting** — автоматично по роутах
2. **Tree shaking** — видалення невикористаного коду
3. **Minification** — мініфікація JS/CSS
4. **WebP images** — конвертація зображень
5. **Lazy loading** — ледача загрузка компонентів

### Змінні оточення

**Production `.env`**:

```env
VITE_GOOGLE_CLIENT_ID=production-client-id.apps.googleusercontent.com
VITE_BASE_URL=https://corporate-discounts.upstars.com
```

---

## 📚 Корисні команди

### Розробка

```bash
# Запуск dev сервера з hot-reload
npm run dev

# Збірка design tokens при зміні
npm run tokens:watch

# Перевірка типів в реальному часі
npm run type-check -- --watch
```

### Перевірка якості коду

```bash
# Перевірка всього
npm run lint && npm run lint:styles && npm run type-check

# Автофікс
npm run lint && npm run lint:styles && npm run format
```

### Робота з зображеннями

```bash
# Конвертація всіх зображень в WebP
npm run images:webp

# Додавання нового зображення партнера
# 1. Помістити в src/assets/images/partners/
# 2. Запустити npm run images:webp
# 3. Оновити шлях в app-config.json
```

---

## 🐛 Troubleshooting

### Проблема: Google Sign-In не працює

**Рішення**:

1. Перевірити `VITE_GOOGLE_CLIENT_ID` в `.env`
2. Перевірити домен в Google Cloud Console
3. Перевірити CORS налаштування

### Проблема: Зображення не завантажуються

**Рішення**:

1. Перевірити шлях в `app-config.json` (має бути `@/assets/...`)
2. Перевірити наявність файлу
3. Запустити `npm run images:webp`

### Проблема: Переклади не працюють

**Рішення**:

1. Перевірити структуру в `app-config.json` (має бути `{ ua: "...", en: "..." }`)
2. Перевірити використання функції `t()` з `useAppConfig()`
3. Перевірити вибрану локаль в `localStorage`

### Проблема: Фільтри не спрацьовують

**Рішення**:

1. Перевірити категорію партнера (має збігатися з ключем в `filters.categories`)
2. Перевірити формат локації (напр. `UA/Київ`, `Online`)
3. Перевірити логіку в `stores/discounts.ts` → `filteredPartners`

---

## 📞 Контакти та підтримка

**Проєкт**: UPSTARS Corporate Discounts  
**Технології**: Vue 3 + TypeScript + Pinia + Vite  
**Версія документації**: 1.0.0  
**Дата останнього оновлення**: 2025-01-24

---

## 👨‍💻 Розробник

**Vladyslav Hirenko**  
Frontend Developer

**GitHub**: [@v-hirenko](https://github.com/v-hirenko)  
**Email**: v.hirenko@upstars.com

**Технічний стек**:

- Vue 3 + Composition API
- TypeScript
- Pinia State Management
- SCSS + Design Tokens
- Vite Build Tool

---
