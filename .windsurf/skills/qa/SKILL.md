---
name: qa
description: QA & Automation Skills Matrix – Windsurf Cascade ERP

---

## 1. End-to-End (E2E) Testing
* **Playwright:** Построение архитектуры тестов, Page Object Model, фикстуры.
* **Dockerized QA:** Запуск headless-браузеров внутри CI/CD через контейнеры.
* **Network Interception:** Мокинг API ответов от ERPNext для изоляции фронтенд-тестов.

## 2. API & Integration Testing
* **Contract Testing:** Проверка обратной совместимости API между микросервисами.
* **Auth Validation:** Тестирование сценариев с JWT, RBAC и ролевыми моделями.

## 3. Chaos Engineering & Resilience
* **Failure Injection:** Симуляция падений базы данных, недоступности Redis или ERPNext.
* **Recovery Testing:** Проверка механизмов self-healing и корректности повторных попыток (retries).

## 4. Localization Validation
* **Multi-language:** Автоматизированная проверка корректности отображения интерфейса (RU / EN / SRB).
* **Data Formats:** Валидация отображения валют и форматов дат в различных локалях.