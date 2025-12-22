# 🚀 Инструкция по деплою Corporate Discounts

## Предварительные требования

- ✅ Все Secrets настроены в Cloudflare Worker
- ✅ Worker задеплоен (`npm run deploy:worker`)
- ✅ Локальное тестирование пройдено

---

## Деплой Production

### 1. Сборка проекта

```bash
npm run build
```

Проверит TypeScript, оптимизирует изображения, соберет токены дизайна, создаст production build в `dist/`.

### 2. Деплой статических файлов на R2

```bash
npm run deploy:r2
```

Загрузит `dist/` на Cloudflare R2 bucket.

### 3. Деплой Worker (если были изменения)

```bash
npm run deploy:worker
```

Обновит Cloudflare Worker с новым кодом.

### 4. Полный деплой (все вместе)

```bash
npm run deploy
```

Выполнит все 3 шага автоматически.

---

## URLs Production

- **Сайт (через Worker)**: https://corporate-discounts-worker.upstars-marbella.workers.dev
- **R2 Direct URL**: https://pub-37aeae40035e428e93ab550125107a2d.r2.dev
- **Админка**: https://corporate-discounts-worker.upstars-marbella.workers.dev/#/admin/partners

---

## Как работает сохранение на Production

1. Админка определяет что запущена на production (не localhost)
2. Все API запросы идут через Worker URL: `https://corporate-discounts-worker.upstars-marbella.workers.dev/api/*`
3. Worker обрабатывает запросы:
   - `GET /api/load-config` → читает `data/app-config.json` из R2
   - `POST /api/save-config` → сохраняет `data/app-config.json` в R2
4. Изменения сохраняются в R2 и доступны после обновления страницы

---

## Проверка после деплоя

1. Открой админку на production:

   ```
   https://corporate-discounts-worker.upstars-marbella.workers.dev/#/admin/partners
   ```

2. Залогинься через Google

3. Создай тестового партнера или измени существующего

4. Нажми "Зберегти зміни на сервер"

5. Обнови страницу (`Cmd+R` / `Ctrl+R`)

6. ✅ Изменения должны остаться!

---

## Troubleshooting

### Изменения не сохраняются

1. Проверь что Worker Secrets настроены:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `GOOGLE_CLIENT_SECRET`

2. Проверь Worker Logs:
   ```bash
   cd worker && npm run tail
   ```

### 403/404 ошибки

- Проверь что R2 bucket name совпадает в `worker/wrangler.toml`
- Проверь что AWS credentials верные

### CORS ошибки

- Worker автоматически добавляет CORS headers
- Проверь `worker/src/index.ts` → `corsHeaders`

---

## Custom Domain (опционально)

Если хочешь использовать свой домен вместо `*.workers.dev`:

1. Cloudflare Dashboard → Workers & Pages → corporate-discounts-worker
2. **Settings** → **Triggers** → **Add Custom Domain**
3. Введи свой домен (например, `discounts.upstars.com`)
4. Cloudflare автоматически настроит DNS

---

**Готово! 🎉**
