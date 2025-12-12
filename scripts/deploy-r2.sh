#!/bin/bash

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Деплой corporate_discounts на Cloudflare R2${NC}\n"

# Переменные
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi
ACCOUNT_ID="$ACCOUNT_ID"

BUCKET_NAME="dicounts-upstars-com"
PROFILE="upstars-discounts"
ENDPOINT="https://$ACCOUNT_ID.r2.cloudflarestorage.com"

# 1. Сборка проекта
echo -e "${BLUE}📦 Шаг 1: Сборка проекта...${NC}"
npm run build

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Ошибка при сборке проекта${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Проект собран успешно${NC}\n"

# 2. Загрузка статических файлов в R2
echo -e "${BLUE}☁️ Шаг 2: Загрузка статических файлов (CSS, JS, images)...${NC}"

aws s3 sync dist/ s3://$BUCKET_NAME/ \
  --profile $PROFILE \
  --endpoint-url $ENDPOINT \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "*.html" \
  --exclude "*.json"

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Ошибка при загрузке статических файлов${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Статические файлы загружены${NC}\n"

# 3. Загрузка HTML файлов без кеша
echo -e "${BLUE}📄 Шаг 3: Загрузка HTML файлов...${NC}"

aws s3 sync dist/ s3://$BUCKET_NAME/ \
  --profile $PROFILE \
  --endpoint-url $ENDPOINT \
  --exclude "*" \
  --include "*.html" \
  --cache-control "public, max-age=0, must-revalidate"

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Ошибка при загрузке HTML файлов${NC}"
  exit 1
fi

echo -e "${GREEN}✅ HTML файлы загружены${NC}\n"

# 4. Загрузка JSON файлов без кеша
echo -e "${BLUE}🔧 Шаг 4: Загрузка JSON конфигурации...${NC}"

aws s3 sync dist/ s3://$BUCKET_NAME/ \
  --profile $PROFILE \
  --endpoint-url $ENDPOINT \
  --exclude "*" \
  --include "*.json" \
  --cache-control "public, max-age=0, must-revalidate"

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Ошибка при загрузке JSON файлов${NC}"
  exit 1
fi

echo -e "${GREEN}✅ JSON файлы загружены${NC}\n"

# 5. Готово
echo -e "${GREEN}🎉 Деплой завершен успешно!${NC}\n"
echo -e "${BLUE}Сайт доступен по адресу:${NC}"
echo -e "${GREEN}https://pub-37aeae40035e428e93ab550125107a2d.r2.dev/index.html${NC}\n"

