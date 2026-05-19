#!/bin/bash

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PRODUCTION_URL="https://corporate-discounts-worker.upstars-landings.workers.dev"
CONFIG_PATH="src/data/app-config.json"

echo -e "${BLUE}📥 Синхронізація app-config.json з production...${NC}\n"

# Перевіряємо доступність production
echo -e "${BLUE}🔍 Перевірка доступності production...${NC}"

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${PRODUCTION_URL}/api/load-config")

if [ "$HTTP_STATUS" != "200" ]; then
  echo -e "${RED}❌ Production недоступний (HTTP $HTTP_STATUS)${NC}"
  echo -e "${YELLOW}   Можливо, потрібно спочатку задеплоїти Worker${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Production доступний${NC}\n"

# Створюємо backup поточного конфігу
if [ -f "$CONFIG_PATH" ]; then
  BACKUP_PATH="${CONFIG_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
  echo -e "${BLUE}💾 Створення backup: ${BACKUP_PATH}${NC}"
  cp "$CONFIG_PATH" "$BACKUP_PATH"
fi

# Завантажуємо актуальний конфіг
echo -e "${BLUE}⬇️  Завантаження конфігу з production...${NC}"

curl -s "${PRODUCTION_URL}/api/load-config" | python3 -m json.tool > "$CONFIG_PATH" 2>/dev/null

if [ $? -ne 0 ]; then
  # Fallback якщо python3 не доступний
  curl -s "${PRODUCTION_URL}/api/load-config" > "$CONFIG_PATH"
fi

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Помилка при завантаженні конфігу${NC}"
  exit 1
fi

# Перевіряємо валідність JSON
python3 -c "import json; json.load(open('$CONFIG_PATH'))" 2>/dev/null
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Завантажений файл не є валідним JSON${NC}"
  if [ -f "$BACKUP_PATH" ]; then
    echo -e "${YELLOW}   Відновлення з backup...${NC}"
    cp "$BACKUP_PATH" "$CONFIG_PATH"
  fi
  exit 1
fi

# Підраховуємо партнерів
PARTNERS_COUNT=$(python3 -c "import json; d=json.load(open('$CONFIG_PATH')); print(len(d.get('partners', {})))" 2>/dev/null || echo "?")

echo -e "${GREEN}✅ Конфіг синхронізовано успішно!${NC}"
echo -e "${BLUE}   Партнерів у конфігу: ${PARTNERS_COUNT}${NC}"
echo -e "${BLUE}   Файл: ${CONFIG_PATH}${NC}\n"
