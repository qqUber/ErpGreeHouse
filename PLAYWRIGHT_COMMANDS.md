# Playwright MCP Command Reference Guide

## Быстрый старт

```bash
# Навигация на сайт
mcp3_playwright_navigate({ url: "http://localhost:5173" })

# Скриншоты
mcp3_playwright_screenshot({ name: "page-state" })
mcp3_playwright_screenshot({ name: "full-page", fullPage: true })

# Получить текст/контент
mcp3_playwright_get_visible_text({})
mcp3_playwright_get_visible_html({ maxLength: 5000 })
```

## Навигация и взаимодействие

### 1. Открыть страницу
```javascript
mcp3_playwright_navigate({ 
  url: "http://localhost:5173",
  waitUntil: "domcontentloaded"
})
```

### 2. Ввод данных в поля (Login)
```javascript
// Username input
mcp3_playwright_fill({ 
  selector: "input[data-testid='common_input_username_en']", 
  value: "admin" 
})

// Password input
mcp3_playwright_fill({ 
  selector: "input[data-testid='common_input_password_en']", 
  value: "admin" 
})

// Toggle password visibility
mcp3_playwright_click({ 
  selector: "button[data-testid='common_btn_toggle_password_en']" 
})
```

### 3. Клики (Navigation)
```javascript
// Login button
mcp3_playwright_click({ 
  selector: "button[data-testid='common_btn_login_en']" 
})

// Main navigation tabs
mcp3_playwright_click({ selector: "button[data-testid='admin_nav_dashboard']" })
mcp3_playwright_click({ selector: "button[data-testid='admin_nav_customers']" })
mcp3_playwright_click({ selector: "button[data-testid='admin_nav_pos']" })
mcp3_playwright_click({ selector: "button[data-testid='admin_nav_integrations']" })
mcp3_playwright_click({ selector: "button[data-testid='admin_nav_products']" })
mcp3_playwright_click({ selector: "button[data-testid='admin_nav_settings']" })
mcp3_playwright_click({ selector: "button[data-testid='admin_nav_marketing']" })
mcp3_playwright_click({ selector: "button[data-testid='admin_nav_compliance']" })
mcp3_playwright_click({ selector: "button[data-testid='admin_nav_analytics']" })
```

### 4. Нажатие клавиш
```javascript
mcp3_playwright_press_key({ key: "Enter" })
mcp3_playwright_press_key({ key: "Enter", selector: "input[data-testid='common_input_username_en']" })
```

## Получение информации

### Текст страницы
```javascript
mcp3_playwright_get_visible_text({})
```

### HTML контент
```javascript
// Вся страница
mcp3_playwright_get_visible_html({ maxLength: 5000 })

// Конкретный элемент по data-testid
mcp3_playwright_get_visible_html({ 
  selector: "[data-testid='admin_nav_dashboard']",
  maxLength: 2000 
})
```

### Консольные логи
```javascript
// Все логи
mcp3_playwright_console_logs({ type: "all" })

// Только ошибки
mcp3_playwright_console_logs({ type: "error" })

// Поиск в логах
mcp3_playwright_console_logs({ 
  type: "all",
  search: "error" 
})
```

### Скриншоты
```javascript
// Базовый скриншот
mcp3_playwright_screenshot({ 
  name: "page-state",
  savePng: true 
})

// Полная страница
mcp3_playwright_screenshot({ 
  name: "full-page",
  fullPage: true,
  savePng: true 
})

// Конкретный элемент по data-testid
mcp3_playwright_screenshot({ 
  name: "login-form",
  selector: "[data-testid='common_input_username_en']",
  savePng: true 
})
```

## Справочник data-testid селекторов

### Авторизация (Login)
| Элемент | Селектор |
|---------|----------|
| Username input | `input[data-testid='common_input_username_en']` |
| Password input | `input[data-testid='common_input_password_en']` |
| Toggle password | `button[data-testid='common_btn_toggle_password_en']` |
| Login button | `button[data-testid='common_btn_login_en']` |

### Навигация (Admin Panel)
| Элемент | Селектор |
|---------|----------|
| Dashboard tab | `button[data-testid='admin_nav_dashboard']` |
| Customers tab | `button[data-testid='admin_nav_customers']` |
| POS/Sales tab | `button[data-testid='admin_nav_pos']` |
| Integrations tab | `button[data-testid='admin_nav_integrations']` |
| Products tab | `button[data-testid='admin_nav_products']` |
| Settings tab | `button[data-testid='admin_nav_settings']` |
| Marketing tab | `button[data-testid='admin_nav_marketing']` |
| Compliance tab | `button[data-testid='admin_nav_compliance']` |
| Analytics tab | `button[data-testid='admin_nav_analytics']` |

### Интеграции (Sub-tabs)
| Элемент | Селектор |
|---------|----------|
| Integration Settings | `[data-testid='admin_tab_integration_settings_en']` |
| Webhooks | `[data-testid='admin_tab_webhooks_en']` |

### Настройки (Settings)
| Элемент | Селектор |
|---------|----------|
| Settings view | `[data-testid='settings_view_en']` |
| Logout button | `button[data-testid='admin_btn_logout_en']` |
| Old password input | `input[data-testid='admin_input_old_password_en']` |
| Toggle old password | `button[data-testid='admin_btn_toggle_old_password_en']` |
| New password input | `input[data-testid='admin_input_new_password_en']` |
| Toggle new password | `button[data-testid='admin_btn_toggle_new_password_en']` |
| Change password button | `button[data-testid='admin_btn_change_password_en']` |

### Клиенты (Customers)
| Элемент | Селектор |
|---------|----------|
| Search input | `input[data-testid='customers_search_input']` |
| Search button | `button[data-testid='customers_search_button']` |
| Clear/Refresh button | `button[data-testid='customers_clear_button']` |
| Customer item | `button[data-testid='customer_item_${id}']` |
| Customer select | `button[data-testid='customer_select_${id}']` |
| Close details | `button[data-testid='close_customer_details']` |

### Виджеты (Widgets)
| Элемент | Селектор |
|---------|----------|
| Widget container | `[data-testid='widget-${title}']` |
| Grid widget | `[data-testid='grid-widget-${id}']` |
| Toggle button | `button[data-testid='widget-toggle-button']` |
| Compact content | `[data-testid='widget-compact-content']` |
| Expanded content | `[data-testid='widget-expanded-content']` |
| Widget drawer | `[data-testid='widget-drawer']` |

### Таблицы (Data Table)
| Элемент | Селектор |
|---------|----------|
| Loading state | `[data-testid='data-table-loading']` |
| Empty state | `[data-testid='data-table-empty']` |
| Table | `[data-testid='data-table']` |
| Header cell | `[data-testid='data-table-header-${columnKey}']` |
| Row | `[data-testid='data-table-row-${key}']` |
| Cell | `[data-testid='data-table-cell-${columnKey}']` |

### Пагинация (Pagination)
| Элемент | Селектор |
|---------|----------|
| Pagination container | `[data-testid='pagination']` |
| Prev button | `button[data-testid='pagination-prev']` |
| Page button | `button[data-testid='pagination-page-${pageNum}']` |
| Next button | `button[data-testid='pagination-next']` |

### DEV Panel
| Элемент | Селектор |
|---------|----------|
| Create sale panel | `[data-testid='admin_dev_create_sale_panel']` |
| Customer QR input | `input[data-testid='admin_input_dev_customer_qr']` |
| Create sale button | `button[data-testid='admin_btn_dev_create_sale']` |

## Примеры сценариев

### Логин в систему
```javascript
// 1. Открыть страницу
mcp3_playwright_navigate({ url: "http://localhost:5173" })

// 2. Заполнить поля (только data-testid селекторы)
mcp3_playwright_fill({ 
  selector: "input[data-testid='common_input_username_en']", 
  value: "admin" 
})
mcp3_playwright_fill({ 
  selector: "input[data-testid='common_input_password_en']", 
  value: "admin" 
})

// 3. Нажать кнопку входа
mcp3_playwright_click({ 
  selector: "button[data-testid='common_btn_login_en']" 
})

// 4. Проверить результат
mcp3_playwright_get_visible_text({})
```

### Навигация по табам
```javascript
// Клик по табу через data-testid (стабильный селектор)
mcp3_playwright_click({ 
  selector: "button[data-testid='admin_nav_pos']" 
})

// Проверить что таб активен через aria-selected
mcp3_playwright_get_visible_html({ 
  selector: "button[aria-selected='true']" 
})
```

### Проверка dropdown (Product Select)
```javascript
// Выбрать option по value
mcp3_playwright_select({ 
  selector: "select",
  value: "product-id-123"
})
```

## Выполнение JavaScript

```javascript
// Выполнить код в браузере
mcp3_playwright_evaluate({
  script: `
    const items = document.querySelectorAll('option');
    return Array.from(items).map(o => o.textContent);
  `
})

// Проверить localStorage
mcp3_playwright_evaluate({
  script: `
    return {
      token: localStorage.getItem('access_token'),
      lang: localStorage.getItem('language')
    };
  `
})
```

## HTTP запросы

```javascript
// GET запрос
mcp3_playwright_get({ 
  url: "http://localhost:8000/api/v1/health" 
})

// POST запрос
mcp3_playwright_post({ 
  url: "http://localhost:8000/api/v1/public/auth/login",
  value: JSON.stringify({ username: "admin", password: "admin" }),
  headers: { "Content-Type": "application/json" }
})
```

## Типичные проблемы и решения

### Проблема: "Timeout 30000ms exceeded"
```javascript
// Решение: использовать data-testid селекторы вместо текста
// Плохо: "button:has-text('Войти')"
// Хорошо:
mcp3_playwright_get_visible_html({ 
  selector: "button[data-testid='common_btn_login_en']" 
})
```

### Проблема: "Failed to load resource: 401"
```javascript
// Решение: сначала выполнить логин через стабильные селекторы
mcp3_playwright_fill({ 
  selector: "input[data-testid='common_input_username_en']", 
  value: "admin" 
})
mcp3_playwright_fill({ 
  selector: "input[data-testid='common_input_password_en']", 
  value: "admin" 
})
mcp3_playwright_click({ 
  selector: "button[data-testid='common_btn_login_en']" 
})
```

### Проблема: Элемент не найден
```javascript
// Решение: использовать только data-testid селекторы
// Всегда проверяйте наличие data-testid в коде перед использованием
```

## Полезные комбинации

```javascript
// Полный тест: Логин → Переход → Проверка (только data-testid)
mcp3_playwright_navigate({ url: "http://localhost:5173" })
mcp3_playwright_fill({ 
  selector: "input[data-testid='common_input_username_en']", 
  value: "admin" 
})
mcp3_playwright_fill({ 
  selector: "input[data-testid='common_input_password_en']", 
  value: "admin" 
})
mcp3_playwright_click({ 
  selector: "button[data-testid='common_btn_login_en']" 
})
mcp3_playwright_click({ 
  selector: "button[data-testid='admin_nav_pos']" 
})
mcp3_playwright_screenshot({ name: "result", savePng: true })
mcp3_playwright_get_visible_text({})
```

## Завершение работы

```javascript
// Закрыть браузер
mcp3_playwright_close({})
```

## Правила использования селекторов

**Всегда используйте data-testid:**
- ✅ `button[data-testid='admin_nav_pos']`
- ✅ `input[data-testid='common_input_username_en']`

**Никогда не используйте текст или нестабильные селекторы:**
- ❌ `button:has-text('Войти')`
- ❌ `button:has-text('Продажи')`
- ❌ `.btn-primary`
- ❌ `div > span > button`

**Исключение:** CSS-теги для типов элементов внутри data-testid:
- ✅ `input[data-testid='common_input_username_en']`
- ✅ `button[data-testid='common_btn_login_en']`
