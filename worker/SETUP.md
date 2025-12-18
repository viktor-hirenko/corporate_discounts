# Worker Setup Guide

## Первый деплой

### 1. Установка зависимостей

```bash
cd worker
npm install
```

### 2. Настройка secrets в Cloudflare Dashboard

1. Перейдите: https://dash.cloudflare.com/
2. Workers & Pages → corporate-discounts-worker → Settings → Variables & Secrets
3. Добавьте secrets:

| Название                | Откуда взять                                      | Зачем нужен                           |
| ----------------------- | ------------------------------------------------- | ------------------------------------- |
| `GOOGLE_CLIENT_SECRET`  | Google Cloud Console → Credentials → OAuth Client | Для серверной проверки Google токенов |
| `AWS_ACCESS_KEY_ID`     | Cloudflare Dashboard → R2 → Access Keys           | Для доступа к R2 bucket               |
| `AWS_SECRET_ACCESS_KEY` | Cloudflare Dashboard → R2 → Access Keys           | Для доступа к R2 bucket               |

### 3. Деплой worker

```bash
# Из корня проекта
npm run deploy:worker

# Или из папки worker
cd worker
npm run deploy
```

### 4. Проверка

После деплоя Cloudflare выдаст URL вида:

```
https://corporate-discounts-worker.your-subdomain.workers.dev
```

Проверьте API:

```bash
curl https://your-worker-url/api/load-config
```

## Локальная разработка worker

```bash
cd worker
npm run dev
```

Worker запустится на `http://localhost:8787`

## Обновление worker

После изменений в коде:

```bash
npm run deploy:worker
```

## Troubleshooting

### Worker не сохраняет изменения

- Проверьте что secrets настроены в Cloudflare Dashboard
- Проверьте что R2 bucket name совпадает в wrangler.toml

### 403 ошибки

- Проверьте AWS_ACCESS_KEY_ID и AWS_SECRET_ACCESS_KEY
- Убедитесь что R2 bucket существует

### CORS ошибки

- Worker автоматически добавляет CORS headers
- Если проблема — проверьте настройки в index.ts
