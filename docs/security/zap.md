# OWASP ZAP (baseline) для API и Admin UI

## Требования

- Docker
- Запущенный стенд (рекомендуется staging)

## Baseline scan

Пример (Linux/macOS):

```bash
docker run --rm -t owasp/zap2docker-stable zap-baseline.py \
  -t https://your-host.example.com/ \
  -r zap-report.html \
  -m 5
```

Для локального http используйте `-t http://localhost:8000/`.

## Что проверять в отчёте

- Отсутствие утечек в заголовках/теле ответа (stacktrace, SQL, пути файлов)
- CSP/Headers (CSP, X-Frame-Options, nosniff, Referrer-Policy)
- Риски XSS/Clickjacking

## Ручная проверка после ZAP

- DevTools → Application → Local Storage: секретов быть не должно
- DevTools → Console: в production сборке нет `console.*`
- DevTools → Network: ответы ошибок содержат только безопасные `detail`
