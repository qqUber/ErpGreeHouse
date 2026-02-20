# Environment & Tools Configuration

## 1. Console / Shell
- **Mandatory Shell:** Git Bash (`bash.exe`).
- **Do not use:** PowerShell, CMD, or other terminals unless absolutely necessary for OS-specific commands (e.g., `taskkill`).
- **Reason:** Consistency in script execution and path handling.

## 2. Dependency Paths (Git Bash Format)
Use these absolute paths to avoid conflicts with system defaults or Windows Store shims.

| Tool | Path | Notes |
|------|------|-------|
| **Node.js** | `/c/Program Files/nodejs/node` | Standard install |
| **npm** | `/c/Program Files/nodejs/npm` | Standard install |
| **Python 3.14** | `/c/Users/vuser/AppData/Local/Python/pythoncore-3.14-64/python.exe` | **ALWAYS** use this path. Do not use `python` or `python3` (Windows Store shims). |
| **Redis** | `127.0.0.1:6379` | Service: `memurai` (Memurai for Windows). Running as a service. |

## 3. Python Execution Rule
When running Python scripts, always invoke the executable directly:
```bash
/c/Users/vuser/AppData/Local/Python/pythoncore-3.14-64/python.exe path/to/script.py
```

## 4. Redis / Memurai
- **Service Name:** `memurai`
- **Port:** 6379
- **Host:** localhost / 127.0.0.1
- **Management:** managed via Windows Services (`sc query memurai`, `net start/stop memurai`).
- **Verification:** `netstat -an | grep 6379` to check listener.

## 5. Playwright
- **Browsers:** Managed internally by Playwright.
- **Run Command:** `npx playwright test`
- **Config:** `admin-ui/playwright.config.ts` (configured for local dev server).
