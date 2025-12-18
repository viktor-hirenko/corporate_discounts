# Corporate Discounts Worker

Cloudflare Worker для обслуживания админ-панели Corporate Discounts.

## Функции

- Обслуживание статических файлов из R2
- API для сохранения/загрузки app-config.json
- Security headers для всех ответов
- CORS для работы с админкой

## Установка

```bash
cd worker
npm install
```

## Разработка

```bash
npm run dev
```

## Деплой

```bash
npm run deploy
```

## API Endpoints

- `GET /api/load-config` - загрузка конфигурации
- `POST /api/save-config` - сохранение конфигурации

## Переменные окружения

Настраиваются в Cloudflare Dashboard → Worker → Settings → Variables & Secrets:

- `GOOGLE_CLIENT_SECRET` (Secret) - Google OAuth client secret
- `AWS_ACCESS_KEY_ID` (Secret) - R2 access key
- `AWS_SECRET_ACCESS_KEY` (Secret) - R2 secret key
