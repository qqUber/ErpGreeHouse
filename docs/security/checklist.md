# Security checklist (ежедневно)

## Быстрый чек

- [ ] `DEBUG_MODE=false` в окружении
- [ ] `ADMIN_DEFAULT_PASSWORD` и `ADMIN_RECOVERY_SECRET` не дефолтные
- [ ] CSP заголовок присутствует на `/` и API ответах
- [ ] В UI нет `console.*` в production сборке
- [ ] В браузере нет секретов в `localStorage`
- [ ] Rate limit работает на `/api/v1/public/auth/login` и `/api/v1/public/auth/recover`
- [ ] Ошибки API не раскрывают стек/внутренние детали (HTTP 500/401/403/429)

## Еженедельно

- [ ] OWASP ZAP baseline scan на staging
- [ ] Ротация `ADMIN_RECOVERY_SECRET`
- [ ] Проверка зависимостей на уязвимости (npm/pip audit)

## Ручная проверка UI

- [ ] Поля паролей: `type=password`, `autocomplete=off`, переключатель видимости
- [ ] Авторизация показывает этапы и даёт возможность отмены
- [ ] Уведомления короткие (≤80 символов), без тех. деталей
