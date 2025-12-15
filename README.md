# 🎁 Corporate Discounts - UPSTARS

Vue 3 застосунок для управління корпоративними знижками та партнерськими пропозиціями для команди UPSTARS.

## 📚 Документація

- **[Admin Panel Guide](./ADMIN_PANEL_GUIDE.md)** — інструкція користувача для менеджерів та розробників
- **[Project Documentation](./PROJECT_DOCUMENTATION.md)** — технічна документація проєкту

## 🚀 Швидкий старт

### Встановлення

```sh
npm install
```

### Розробка

```sh
npm run dev
```

Відкрийте http://localhost:5173

### Admin Panel

Доступ до адмін-панелі:

```
http://localhost:5173/admin
```

Детальна інструкція: [ADMIN_PANEL_GUIDE.md](./ADMIN_PANEL_GUIDE.md)

## 🛠️ Команди

### Розробка

```sh
npm run dev              # Запустити dev сервер
npm run build            # Зібрати для production
npm run preview          # Переглянути production білд
```

### Code Quality

```sh
npm run type-check       # Перевірити TypeScript
npm run lint             # Запустити ESLint
npm run lint:styles      # Запустити Stylelint
npm run format           # Форматувати код з Prettier
```

### Design Tokens

```sh
npm run tokens:build     # Згенерувати CSS змінні з design tokens
```

### Images

```sh
npm run images:webp      # Конвертувати зображення в WebP
```

### Deployment

```sh
npm run deploy:r2        # Задеплоїти на Cloudflare R2
```

### Testing

```sh
npm run test:unit        # Запустити unit тести
```

## 🏗️ Технологічний стек

- **Frontend:** Vue 3 (Composition API) + TypeScript
- **State Management:** Pinia
- **Router:** Vue Router 4
- **Styling:** SCSS + Design Tokens
- **Build Tool:** Vite 7
- **Linting:** ESLint + Stylelint
- **Formatting:** Prettier
- **Deployment:** Cloudflare R2

## 📦 Основні функції

### Для користувачів сайту:

- 🔐 Авторизація через Google
- 🔍 Пошук та фільтрація партнерів
- 📱 Адаптивний дизайн
- 🌐 Мультимовність (UA/EN)
- 📄 Детальні сторінки партнерів з промокодами
- ❓ FAQ секція

### Для адміністраторів:

- 🎛️ Admin Panel для управління контентом
- 🤝 CRUD партнерів
- 🏷️ Управління категоріями та локаціями
- ❓ Редагування FAQ
- 📝 Редактор текстів
- 🖼️ Управління зображеннями
- 👥 Управління користувачами
- 🚀 Експорт та публікація змін

## 📁 Структура проєкту

```
corporate-discounts/
├── src/
│   ├── components/       # Vue компоненти
│   ├── views/            # Сторінки
│   ├── layouts/          # Шаблони
│   ├── stores/           # Pinia stores
│   ├── router/           # Роутинг
│   ├── composables/      # Логіка для перевикористання
│   ├── types/            # TypeScript типи
│   ├── styles/           # Глобальні стилі
│   ├── data/             # Конфігурація (app-config.json)
│   └── design/           # Design tokens
├── scripts/              # Build скрипти
├── ADMIN_PANEL_GUIDE.md  # Інструкція Admin Panel
├── PROJECT_DOCUMENTATION.md # Технічна документація
└── README.md             # Цей файл
```

## 🔧 Конфігурація IDE

### Рекомендований редактор

[VS Code](https://code.visualstudio.com/) + [Vue Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

> **Важливо:** Вимкніть Vetur, якщо він встановлений!

### Розширення для браузера

**Chrome/Edge:**

- [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
- [Увімкніть Custom Object Formatter](http://bit.ly/object-formatters)

**Firefox:**

- [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
- [Увімкніть Custom Object Formatter](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## 🌐 Environment

Створіть файл `.env.local`:

```bash
# Cloudflare R2
VITE_R2_ACCOUNT_ID=upstars_landings
VITE_R2_BUCKET=dicounts-upstars-com

# Google OAuth
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

## 🚀 Deployment

### 1. Локальна збірка

```sh
npm run build
```

### 2. Деплой на R2

```sh
npm run deploy:r2
```

### 3. Перевірка

Відкрийте: https://discounts.upstars.com

## 📖 Детальна документація

### Для менеджерів та контент-редакторів

Повна інструкція з використання Admin Panel:
👉 **[ADMIN_PANEL_GUIDE.md](./ADMIN_PANEL_GUIDE.md)**

Включає:

- Як увійти в систему
- Як додавати та редагувати партнерів
- Як керувати категоріями та локаціями
- Як публікувати зміни на сайт
- FAQ для менеджерів

### Для розробників

Технічна документація проєкту:
👉 **[PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md)**

Включає:

- Архітектура проєкту
- Компоненти та їх API
- Pinia stores
- Типи та інтерфейси
- Composables
- Стилі та design tokens

## 🤝 Підтримка

- **Slack:** #dev-corporate-discounts
- **Email:** dev@upstars.com

## 📄 Ліцензія

Internal UPSTARS project

---

**Made with ❤️ by UPSTARS Development Team**
