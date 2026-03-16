# Production Deployment Guide
# Telegram CRM Middleware + ERPNext

## 📋 Оглавление

1. [Предварительные требования](#предварительные-требования)
2. [Быстрый старт](#быстрый-старт)
3. [Пошаговая инструкция](#пошаговая-инструкция)
4. [Конфигурация](#конфигурация)
5. [Безопасность](#безопасность)
6. [Мониторинг](#мониторинг)
7. [Обслуживание](#обслуживание)
8. [Troubleshooting](#troubleshooting)

---

## Предварительные требования

### Аппаратные требования

| Компонент | Минимум | Рекомендуется |
|-----------|---------|---------------|
| **CPU** | 2 cores | 4+ cores |
| **RAM** | 4 GB | 8+ GB |
| **Disk** | 20 GB | 50+ GB SSD |
| **OS** | Linux (Ubuntu 20.04+) | Ubuntu 22.04 LTS |

### Программные требования

- Docker 20.10+
- Docker Compose 2.0+
- Git
- SSL сертификаты (Let's Encrypt или коммерческие)

---

## Быстрый старт

```bash
# 1. Клонировать репозиторий
git clone https://github.com/your-org/ErpGreeHouse.git
cd ErpGreeHouse/prod

# 2. Создать файл окружения
cp .env.production.example .env

# 3. Отредактировать .env (обязательно измените секреты!)
nano .env

# 4. Сгенерировать секреты
openssl rand -hex 32  # Для JWT_SECRET_KEY
openssl rand -hex 16  # Для WEBHOOK_SECRET

# 5. Запустить стек
docker compose up -d

# 6. Проверить статус
docker compose ps

# 7. Просмотреть логи
docker compose logs -f middleware
```

---

## Пошаговая инструкция

### Шаг 1: Подготовка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Проверка версий
docker --version
docker compose --version
```

### Шаг 2: Настройка проекта

```bash
# Перейти в директорию
cd /opt/ErpGreeHouse/prod

# Создать директорию для SSL
mkdir -p ssl

# Скопировать SSL сертификаты (если есть)
cp /path/to/fullchain.pem ssl/
cp /path/to/privkey.pem ssl/

# Или использовать Let's Encrypt
sudo apt install certbot -y
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/
```

### Шаг 3: Конфигурация окружения

```bash
# Создать .env файл
cp .env.production.example .env

# Отредактировать обязательные переменные:
# - TELEGRAM_BOT_TOKEN
# - ERP_API_BASE_URL
# - DB_PASSWORD (сгенерировать надёжный пароль)
# - JWT_SECRET_KEY (openssl rand -hex 32)
# - WEBHOOK_SECRET (openssl rand -hex 16)
# - ADMIN_DEFAULT_PASSWORD

nano .env
```

### Шаг 4: Запуск сервисов

```bash
# Полное развёртывание (ERPNext + Middleware)
docker compose up -d

# Только инфраструктура (если ERPNext отдельно)
docker compose -f docker-compose.infrastructure.yml up -d

# Проверка статуса
docker compose ps

# Ожидание готовности (около 2-3 минут)
sleep 120

# Проверка здоровья
docker compose exec middleware curl -s http://localhost:8000/health | jq
```

### Шаг 5: Инициализация базы данных

```bash
# Инициализация таблиц (если требуется)
docker compose exec middleware python -c "from app.db import init_db; init_db()"

# Создание администратора (если требуется)
docker compose exec middleware python -c "from app.admin_auth_api import bootstrap_admin; bootstrap_admin()"
```

### Шаг 6: Настройка Telegram Webhook

```bash
# Установить webhook
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://yourdomain.com/webhook"}'

# Проверить статус
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

---

## Конфигурация

### Переменные окружения

| Переменная | Обязательна | Описание |
|------------|-------------|----------|
| `TELEGRAM_BOT_TOKEN` | ✅ | Токен бота от @BotFather |
| `ERP_API_BASE_URL` | ✅ | URL ERPNext实例 |
| `ERP_API_KEY` | ✅ | API ключ ERPNext |
| `ERP_API_SECRET` | ✅ | API секрет ERPNext |
| `DB_PASSWORD` | ✅ | Пароль PostgreSQL |
| `JWT_SECRET_KEY` | ✅ | Секрет для JWT токенов |
| `WEBHOOK_SECRET` | ✅ | Секрет для Telegram webhook |
| `ADMIN_DEFAULT_PASSWORD` | ✅ | Пароль администратора |

### Порты

| Сервис | Порт | Описание |
|--------|------|----------|
| Nginx HTTP | 80 | Редирект на HTTPS |
| Nginx HTTPS | 443 | Основной вход |
| Middleware | 8000 | API Middleware |
| ERPNext | 8080 | ERPNext UI |
| PostgreSQL | 5432 | База данных |
| Redis Cache | 6379 | Кэш |
| Redis Queue | 6380 | Очередь Celery |

---

## Безопасность

### Обязательные действия

1. **Измените все пароли по умолчанию**
2. **Сгенерируйте уникальные секреты**
3. **Настройте Firewall**
   ```bash
   sudo ufw allow 22/tcp    # SSH
   sudo ufw allow 80/tcp    # HTTP
   sudo ufw allow 443/tcp   # HTTPS
   sudo ufw enable
   ```
4. **Настройте автоматические обновления**
   ```bash
   sudo apt install unattended-upgrades -y
   sudo dpkg-reconfigure -plow unattended-upgrades
   ```
5. **Ограничьте доступ к БД** (только из внутренней сети)

### Рекомендации

- Используйте Vault или Docker Secrets для управления секретами
- Включите 2FA для администраторов
- Регулярно обновляйте образы Docker
- Настройте резервное копирование

---

## Мониторинг

### Health Check эндпоинты

| Endpoint | Описание |
|----------|----------|
| `GET /health` | Общий статус приложения |
| `GET /health/db` | Статус базы данных |
| `GET /health/redis` | Статус Redis |
| `GET /health/erp` | Статус ERPNext интеграции |

### Логи

```bash
# Middleware логи
docker compose logs -f middleware

# Worker логи
docker compose logs -f worker

# Nginx логи
docker compose logs -f nginx

# Просмотр последних 100 строк
docker compose logs --tail=100 middleware
```

### Метрики

- Prometheus: `http://yourdomain.com:9090/metrics`
- Sentry: настройте `SENTRY_DSN` в `.env`

---

## Обслуживание

### Резервное копирование

```bash
# Бэкап PostgreSQL
docker compose exec postgres pg_dump -U postgres telegram_crm > backup_$(date +%Y%m%d).sql

# Бэкап Redis
docker compose exec redis-queue redis-cli SAVE

# Бэкап томов Docker
docker run --rm -v ErpGreeHouse_db-data:/data -v $(pwd):/backup ubuntu tar czf /backup/db-data-$(date +%Y%m%d).tar.gz -C /data .
```

### Обновление

```bash
# Остановить сервисы
docker compose down

# Обновить образы
docker compose pull

# Запустить заново
docker compose up -d

# Проверить логи
docker compose logs -f
```

### Масштабирование

```bash
# Увеличить количество workers
docker compose up -d --scale worker=4

# Изменить переменную окружения в .env
CELERY_WORKER_CONCURRENCY=8
```

---

## Troubleshooting

### Сервис не запускается

```bash
# Проверить логи
docker compose logs <service_name>

# Проверить конфигурацию
docker compose config

# Пересоздать контейнер
docker compose rm -f <service_name>
docker compose up -d <service_name>
```

### Ошибки подключения к БД

```bash
# Проверить доступность БД
docker compose exec postgres pg_isready

# Проверить переменные окружения
docker compose exec middleware env | grep DATABASE

# Перезапустить БД
docker compose restart postgres
```

### Проблемы с Redis

```bash
# Проверить Redis
docker compose exec redis-queue redis-cli ping

# Очистить Redis (осторожно!)
docker compose exec redis-queue redis-cli FLUSHALL

# Перезапустить Redis
docker compose restart redis-queue
```

### ERPNext не отвечает

```bash
# Проверить статус ERPNext
curl -f http://localhost:8080/api/method/ping

# Перезапустить ERPNext
docker compose restart erpnext

# Проверить логи ERPNext
docker compose logs erpnext
```

---

## Контакты и поддержка

- **Документация**: `/docs` в репозитории
- **Issues**: GitHub Issues
- **Логи**: `/var/log/nginx/`, Docker logs

---

**Версия**: 1.0.0
**Последнее обновление**: 2026-02-20
