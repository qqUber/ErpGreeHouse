# Развертывание и Запуск MVP

## Предварительные требования

1.  **Python 3.11+**
2.  **Redis** (локально или удаленно)
3.  **ERPNext** (v14+, для реального режима)
4.  **Telegram Bot Token** (от @BotFather)

## Установка

1.  Клонируйте репозиторий.
2.  Перейдите в директорию `middleware`:
    ```bash
    cd middleware
    ```
3.  Создайте виртуальное окружение:
    ```bash
    python -m venv venv
    source venv/bin/activate  # Linux/Mac
    venv\Scripts\activate     # Windows
    ```
4.  Установите зависимости:
    ```bash
    pip install -r requirements.txt
    ```

## Настройка

Создайте файл `.env` в директории `middleware` на основе примера:

```env
TELEGRAM_BOT_TOKEN=your_token_here
REDIS_URL=redis://localhost:6379/0
WEBHOOK_SECRET=secret
BASE_WEB_URL=https://your-domain.com

# ERPNext Config
ERP_API_BASE_URL=https://erp.example.com
ERP_API_KEY=your_api_key
ERP_API_SECRET=your_api_secret
ERP_MOCK_MODE=false  # Установите true для тестирования без ERPNext
```

## Инициализация Структуры ERPNext

Перед первым запуском в реальном режиме необходимо создать структуры данных в ERPNext (DocTypes):

```bash
python init_erp_structure.py
```

Этот скрипт создаст:
-   `Telegram Client` DocType
-   `Loyalty Transaction` DocType
-   Проверит доступность API

## Запуск Бот-сервера

Для запуска FastAPI приложения (webhook + API):

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Использование MVP

1.  **Регистрация**: Отправьте `/start` боту, затем `/register Имя Телефон`.
2.  **Баланс**: Используйте `/balance` для проверки бонусов.
3.  **Меню**: Используйте `/menu` для выбора товаров.
4.  **Корзина**: Используйте `/add` или кнопки меню.
5.  **Оплата**: Используйте `/pay N` для списания N бонусов.
6.  **Заказ**: Используйте `/order` для оформления.

## Тестирование

Для запуска тестов:

```bash
pytest tests/
```
