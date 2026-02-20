# Qwen Companion Configuration

> **Location**: `.qwen/config.md`
> **Purpose**: Environment-specific configuration and tool paths
> **Created**: February 20, 2026

---

## 1. Environment Paths (Windows)

### Python
```bash
# ALWAYS use full path to avoid Windows Store shims
PYTHON_PATH=/c/Users/vuser/AppData/Local/Python/pythoncore-3.14-64/python.exe
PYTHON_VERSION=3.14
```

### Node.js / npm
```bash
NODE_PATH=/c/Program Files/nodejs/node
NPM_PATH=/c/Program Files/nodejs/npm
```

### Redis / Memurai
```bash
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_SERVICE=memurai
```

### Git
```bash
GIT_PATH=C:\Program Files\Git\cmd\git.exe
SHELL_PATH=C:\Program Files\Git\bin\bash.exe
```

---

## 2. MCP Server Configuration

### Active Servers
| Server | Status | Command |
|--------|--------|---------|
| GitHub | ✅ | `npx -y @modelcontextprotocol/server-github` |
| Filesystem | ✅ | `npx -y @modelcontextprotocol/server-filesystem` |
| context7 | ✅ | `npx -y @upstash/context7-mcp@latest` |
| Sequential Thinking | ✅ | `npx -y @modelcontextprotocol/server-sequential-thinking` |
| Fetch | ✅ | `uvx mcp-server-fetch` |
| Chrome DevTools | ✅ | `npx -y chrome-devtools-mcp@latest` |
| Redis | ⚠️ Disabled | `npx -y @modelcontextprotocol/server-redis` |

### Configuration File
- **Workspace MCP**: `.roo/mcp.json`
- **Environment Variables**: `.env.qwen` (create from `.env.qwen.example`)

---

## 3. Qwen Companion Settings

### Paths
- **Rules**: `${workspaceFolder}/.qwen/rules.md`
- **Config**: `${workspaceFolder}/.qwen/`
- **MCP Config**: `${workspaceFolder}/.roo/mcp.json`
- **Backups**: `${workspaceFolder}/.qwen/backups/`

### Features
- `autoImportRules`: true
- `contextAware`: true
- `mcpAutoRun`: alwaysRun

---

## 4. Shell & Terminal

### Default Shell
- **Type**: Git Bash
- **Path**: `C:\Program Files\Git\bin\bash.exe`
- **Reason**: Consistency in script execution and path handling

### Prohibited Shells
- ❌ PowerShell (unless OS-specific commands)
- ❌ CMD (unless OS-specific commands)

### Environment Variables
```bash
CHOKIDAR_USEPOLLING=1
WATCHPACK_POLLING=true
```

---

## 5. Project-Specific Settings

### Backend (middleware)
```bash
WORKDIR=middleware
VENV=.venv
ENTRYPOINT=python -m app.main
TEST_SCRIPT=run_tests.sh
```

### Frontend (admin-ui)
```bash
WORKDIR=admin-ui
NODE_MODULES=node_modules
DEV_COMMAND=npm run dev
BUILD_COMMAND=npm run build
TEST_COMMAND=npm run test:e2e
```

### Testing
```bash
SETUP_SCRIPT=setup_test_env.sh
TEST_SCRIPT=run_tests.sh
COVERAGE_THRESHOLD=80
```

---

## 6. Sensitive Data Management

### Environment Files
| File | Purpose | Git Status |
|------|---------|------------|
| `.env.qwen.example` | Template with placeholders | ✅ Tracked |
| `.env.qwen` | Actual secrets | ❌ Ignored |
| `.roo/mcp.json` | MCP config (no secrets) | ✅ Tracked |

### Required Secrets
```bash
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_...
TELEGRAM_BOT_TOKEN=...
ERP_API_KEY=...
ERP_API_SECRET=...
JWT_SECRET_KEY=...
```

### Setup Instructions
1. Copy `.env.qwen.example` to `.env.qwen`
2. Fill in your secrets
3. Never commit `.env.qwen`

---

## 7. Extension Recommendations

### Required Extensions
- **Python** (ms-python.python)
- **Pylance** (ms-python.vscode-pylance)
- **Black Formatter** (ms-python.black-formatter)
- **ESLint** (dbaeumer.vscode-eslint)
- **Prettier** (esbenp.prettier-vscode)
- **GitLens** (eamodio.gitlens)

### Recommended Extensions
- **Material Icon Theme** (PKief.material-icon-theme)
- **Docker** (ms-azuretools.vscode-docker)
- **YAML** (redhat.vscode-yaml)
- **Path Intellisense** (christian-kohler.path-intellisense)

### Extensions to Disable (Conflict with Qwen)
- ❌ Roo Code (rooveterinaryinc.roo-cline)
- ❌ Trae (trae.trae)
- ❌ Cline (saoudrizwan.claude-dev)

---

## 8. Performance Tuning

### File Watching
```json
{
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/.venv/**": true,
    "**/__pycache__/**": true
  }
}
```

### Search Exclude
```json
{
  "search.exclude": {
    "**/node_modules": true,
    "**/__pycache__": true,
    "**/.venv": true,
    "**/admin-ui/test-results": true
  }
}
```

---

## 9. Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Python not found | Use full path: `/c/Users/vuser/AppData/Local/Python/pythoncore-3.14-64/python.exe` |
| MCP servers not starting | Check `.env.qwen` for required tokens |
| Git Bash not found | Install Git for Windows from https://git-scm.com |
| Redis connection failed | Start Memurai service: `net start memurai` |

### Health Check Commands
```bash
# Python
/c/Users/vuser/AppData/Local/Python/pythoncore-3.14-64/python.exe --version

# Node.js
/c/Program Files/nodejs/node --version

# Git
"C:\Program Files\Git\cmd\git.exe" --version

# Redis
netstat -an | grep 6379

# Memurai Service
sc query memurai
```

---

*Last Updated: February 20, 2026 | Version: 1.0.0*
