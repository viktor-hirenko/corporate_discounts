# 🚀 Corporate Discounts — Керівництво по деплою

## 📋 Зміст

1. [Передумови](#передумови)
2. [Налаштування Google OAuth](#налаштування-google-oauth)
3. [Налаштування Cloudflare](#налаштування-cloudflare)
4. [Локальна розробка](#локальна-розробка)
5. [Деплой на Production](#деплой-на-production)
6. [Перевірка після деплою](#перевірка-після-деплою)
7. [Troubleshooting](#troubleshooting)

---

## 📦 Передумови

### Необхідні інструменти

| Інструмент   | Версія        | Призначення     |
| ------------ | ------------- | --------------- |
| **Node.js**  | 20.x або 22.x | Runtime         |
| **npm**      | 10.x          | Package manager |
| **AWS CLI**  | 2.x           | Деплой на R2    |
| **Wrangler** | 3.x           | Деплой Worker   |

### Встановлення інструментів

```bash
# macOS
brew install awscli cloudflare-wrangler

# Перевірка версій
aws --version
wrangler --version
```

### Необхідні доступи

| Сервіс                   | Що потрібно                           |
| ------------------------ | ------------------------------------- |
| **Google Cloud Console** | Проєкт з OAuth Client ID              |
| **Cloudflare Dashboard** | Доступ до аккаунту `upstars_landings` |
| **R2 Bucket**            | Доступ до `dicounts-upstars-com`      |

---

## 🔐 Налаштування Google OAuth

### Крок 1: Відкрийте Google Cloud Console

1. Перейдіть: https://console.cloud.google.com/
2. Виберіть проєкт або створіть новий

### Крок 2: Створіть OAuth Client ID

1. Відкрийте: **APIs & Services** → **Credentials**
2. Натисніть **CREATE CREDENTIALS** → **OAuth client ID**
3. Виберіть тип: **Web application**
4. Заповніть:

| Поле                              | Значення                         |
| --------------------------------- | -------------------------------- |
| **Name**                          | `Corporate Discounts Web Client` |
| **Authorized JavaScript origins** | Додайте всі URL нижче            |
| **Authorized redirect URIs**      | Залиште порожнім                 |

**Authorized JavaScript origins:**

```
http://localhost:5173
http://localhost:4173
http://127.0.0.1:5173
https://corporate-discounts-worker.upstars-marbella.workers.dev
```

5. Натисніть **CREATE**
6. **Скопіюйте Client ID** (формат: `xxx.apps.googleusercontent.com`)

### Крок 3: Налаштуйте OAuth Consent Screen

1. Відкрийте: **APIs & Services** → **OAuth consent screen**
2. Виберіть:
   - **Internal** — тільки для @upstars.com (рекомендовано)
   - **External** — для всіх Google акаунтів (потрібно додати test users)
3. Заповніть обов'язкові поля:
   - **App name:** `Corporate Discounts`
   - **User support email:** ваш email
   - **Developer contact:** ваш email

### Крок 4: Додайте Client ID в проєкт

```bash
# Створіть .env файл в корені проєкту
echo "VITE_GOOGLE_CLIENT_ID=ваш-client-id.apps.googleusercontent.com" >> .env
```

---

## ☁️ Налаштування Cloudflare

### Крок 1: Налаштуйте AWS CLI профіль для R2

```bash
# Створіть профіль для R2
aws configure --profile upstars-discounts
```

**Де взяти Access Keys:**

1. Cloudflare Dashboard → R2 → Manage R2 API Tokens
2. **Create API Token**
3. Скопіюйте Access Key ID та Secret Access Key

> ⚠️ **Важливо:** Secret Access Key показується **тільки один раз**!

### Крок 2: Налаштуйте .env файл

```bash
# .env файл в корені проєкту

# Google OAuth (обов'язково)
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com

# R2 Deployment Configuration
R2_BUCKET_NAME=dicounts-upstars-com
R2_ACCOUNT_ID=71bd6a3d109ad42e0973488dafe041b2
R2_ENDPOINT=https://71bd6a3d109ad42e0973488dafe041b2.r2.cloudflarestorage.com
AWS_PROFILE=upstars-discounts
```

### Крок 3: Налаштуйте Worker Secrets

1. Відкрийте: https://dash.cloudflare.com/
2. Перейдіть: **Workers & Pages** → **corporate-discounts-worker** → **Settings**
3. Відкрийте: **Variables and Secrets**
4. Додайте Secrets:

| Name                    | Type   | Звідки взяти                             |
| ----------------------- | ------ | ---------------------------------------- |
| `JWT_SECRET` ⚠️         | Secret | `openssl rand -hex 32` (мін. 32 символи) |
| `AWS_ACCESS_KEY_ID`     | Secret | R2 API Tokens                            |
| `AWS_SECRET_ACCESS_KEY` | Secret | R2 API Tokens                            |
| `GOOGLE_CLIENT_SECRET`  | Secret | Google Cloud Console (опціонально)       |

> ⚠️ **JWT_SECRET обов'язковий!** Без нього API endpoints не працюватимуть.

### Крок 4: Перевірте wrangler.toml

```bash
# worker/wrangler.toml
cat worker/wrangler.toml
```

Має містити:

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

---

## 💻 Локальна розробка

### Швидкий старт

```bash
# Встановлення залежностей
npm install

# Запуск dev сервера
npm run dev
```

### Локальні URLs

| URL                           | Призначення    |
| ----------------------------- | -------------- |
| http://localhost:5173         | Публічний сайт |
| http://localhost:5173/#/login | Сторінка входу |
| http://localhost:5173/#/admin | Admin Panel    |

### Локальна розробка Worker

```bash
# Запуск Worker локально
cd worker
npm install
npm run dev
```

Worker запуститься на `http://localhost:8787`

---

## 🚀 Деплой на Production

### Повний деплой (рекомендовано)

```bash
# 1. Збірка + деплой R2 + деплой Worker
npm run deploy
```

Ця команда виконує:

1. `npm run build` — збірка проєкту
2. `npm run deploy:r2` — деплой статичних файлів на R2
3. `npm run deploy:worker` — деплой Worker

### Окремий деплой

```bash
# Тільки збірка
npm run build

# Тільки статичні файли на R2
npm run deploy:r2

# Тільки Worker
npm run deploy:worker
```

### Production URLs

| URL                                                                     | Призначення                       |
| ----------------------------------------------------------------------- | --------------------------------- |
| https://corporate-discounts-worker.upstars-marbella.workers.dev         | Головний сайт (через Worker)      |
| https://corporate-discounts-worker.upstars-marbella.workers.dev/#/admin | Admin Panel                       |
| https://pub-37aeae40035e428e93ab550125107a2d.r2.dev                     | R2 Direct URL (не використовуйте) |

> ⚠️ **Важливо:** Завжди використовуйте Worker URL, а не R2 Direct URL. Worker забезпечує API та Security Headers.

---

## ✅ Перевірка після деплою

### Checklist

- [ ] Сайт відкривається
- [ ] Google авторизація працює
- [ ] Admin Panel відкривається після входу
- [ ] Зміни в Admin Panel зберігаються
- [ ] Зміни видно після оновлення сторінки

### Тестування збереження

1. Відкрийте Admin Panel:

   ```
   https://corporate-discounts-worker.upstars-marbella.workers.dev/#/admin/partners
   ```

2. Увійдіть через Google

3. Створіть тестового партнера або змініть існуючого

4. Перевірте що партнер з'явився/змінився

5. Оновіть сторінку (Cmd+R / Ctrl+R)

6. ✅ Зміни мають залишитися!

### Перевірка логів Worker

```bash
cd worker
npm run tail
```

---

## 🔧 Troubleshooting

### Помилка: "Доступ заборонено" при вході

**Причина:** Email не в whitelist

**Рішення:**

1. Перевірте `src/data/app-config.json` → `allowedUsers`
2. Додайте email через Admin Panel → Користувачі
3. Збережіть зміни на сервер

### Помилка: "The given origin is not allowed"

**Причина:** URL не додано в Google Cloud Console

**Рішення:**

1. Відкрийте Google Cloud Console → Credentials → OAuth Client
2. Додайте URL в **Authorized JavaScript origins**
3. Зачекайте 5-10 хвилин (кешування Google)

### Помилка: 404 при відкритті /admin/partners

**Причина:** Використовуєте неправильний формат URL

**Рішення:** Проєкт використовує Hash History. Правильний URL:

```
https://.../#/admin/partners  ✅
https://.../admin/partners    ❌
```

### Помилка: Зміни не зберігаються

**Причина 1:** Worker Secrets не налаштовані

**Рішення:**

1. Перевірте Cloudflare Dashboard → Worker → Settings → Variables & Secrets
2. Переконайтеся що `AWS_ACCESS_KEY_ID` та `AWS_SECRET_ACCESS_KEY` додані

**Причина 2:** R2 bucket name не співпадає

**Рішення:**

1. Перевірте `worker/wrangler.toml` → `bucket_name`
2. Має бути `dicounts-upstars-com`

### Помилка: CORS error

**Причина:** Origin не в списку дозволених

**Рішення:**

1. Відкрийте `worker/src/index.ts`
2. Перевірте `ALLOWED_ORIGINS`
3. Додайте ваш URL якщо потрібно
4. Задеплойте Worker: `npm run deploy:worker`

### Помилка: 429 Too Many Requests

**Причина:** Перевищено Rate Limit (30 запитів/хвилину)

**Рішення:** Зачекайте 1 хвилину

### Помилка: Worker deployment failed

**Причина:** Проблема з Wrangler

**Рішення:**

```bash
# Перевірте логін
wrangler whoami

# Перелогіньтесь якщо потрібно
wrangler login

# Спробуйте ще раз
npm run deploy:worker
```

---

## 📁 Структура деплою

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare R2 Bucket                          │
│                   (dicounts-upstars-com)                         │
├─────────────────────────────────────────────────────────────────┤
│ index.html                                                       │
│ assets/                                                          │
│   ├── index-[hash].js                                           │
│   ├── index-[hash].css                                          │
│   └── ...                                                        │
│ images/                                                          │
│   ├── partners/                                                  │
│   │   ├── roslynka.webp                                         │
│   │   └── ...                                                    │
│   ├── upstars-logo-dark.svg                                     │
│   └── ...                                                        │
│ data/                                                            │
│   └── app-config.json ← Worker зберігає сюди зміни              │
│ _headers                                                         │
└─────────────────────────────────────────────────────────────────┘
                              ↑
                              │ GET/PUT
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Worker                             │
│              (corporate-discounts-worker)                        │
├─────────────────────────────────────────────────────────────────┤
│ GET /*              → Serve static files from R2                │
│ GET /api/load-config → Load app-config.json from R2             │
│ POST /api/save-config → Save app-config.json to R2              │
├─────────────────────────────────────────────────────────────────┤
│ Security: CORS, Rate Limiting, CSP Headers                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Checklist

- [ ] VITE_GOOGLE_CLIENT_ID в `.env` (не комітити!)
- [ ] Worker Secrets налаштовані в Cloudflare Dashboard
- [ ] `_headers` файл в `public/` з CSP
- [ ] HTTPS redirect увімкнено в `main.ts`
- [ ] CORS обмежено конкретними доменами в Worker
- [ ] Rate Limiting налаштовано (30/хв)
- [ ] `.gitignore` містить `.env`, `.wrangler/`

---

## 📚 Корисні посилання

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Google Identity Services](https://developers.google.com/identity/gsi/web)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

---

**Версія документації:** 2.0.0  
**Дата оновлення:** 24 листопада 2025
