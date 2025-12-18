#!/bin/bash

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Деплой Corporate Discounts Worker${NC}\n"

# Проверка наличия wrangler
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Wrangler CLI не найден${NC}"
    echo -e "${BLUE}Установите: npm install -g wrangler${NC}"
    exit 1
fi

# Переход в папку worker
cd "$(dirname "$0")/../worker" || exit 1

echo -e "${BLUE}📦 Деплой worker на Cloudflare...${NC}"

wrangler deploy

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Ошибка при деплое worker${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Worker задеплоен успешно!${NC}\n"
echo -e "${BLUE}Worker доступен по адресу, указанному Cloudflare${NC}"
echo -e "${BLUE}Не забудьте настроить Secrets в Cloudflare Dashboard:${NC}"
echo -e "  - GOOGLE_CLIENT_SECRET"
echo -e "  - AWS_ACCESS_KEY_ID"
echo -e "  - AWS_SECRET_ACCESS_KEY"
echo ""
