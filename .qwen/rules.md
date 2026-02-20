# Qwen Companion Rules - ErpGreeHouse Project

> **Purpose**: Unified AI interaction rules migrated from Trae and Roo Code configurations.
> **Created**: February 20, 2026
> **Source Files**: `.trae/rules/`, `.trae/skills/`, `.github/copilot-instructions.md`

---

## 1. AI Interaction Style

### Communication Preferences
- **Tone**: Simple, clear, colleague-to-colleague
- **No filler**: Skip introductions like "Certainly, I'll help you"
- **No lectures**: Don't explain obvious concepts unless asked
- **Format**: Use headers, lists, and tables; avoid walls of text

### Response Logic
1. **Unclear requests**: Ask clarifying questions first
2. **Weak ideas**: State concerns directly and propose alternatives
3. **Solutions**: Propose MVP/simple approach, not theoretical perfection
4. **Compromises**: Balance ideal solutions with practical constraints

### Anti-Patterns
- ❌ Verbose introductions
- ❌ Unnecessary explanations
- ❌ Markdown walls of text
- ❌ Ignoring project context

---

## 2. Project Context (ErpGreeHouse)

### Technology Stack
| Component | Technology | Notes |
|-----------|------------|-------|
| **Backend** | Python 3.14, FastAPI, aiogram | Async Telegram CRM middleware |
| **Frontend** | React 18, TypeScript, Vite | Admin UI (NOT Next.js) |
| **Database** | SQLite (dev), PostgreSQL (prod) | |
| **Cache/Queue** | Redis 7, Celery | Background jobs |
| **Integration** | ERPNext (mock mode available) | REST API |

### Key Directories
- `middleware/` - Backend (FastAPI + aiogram)
- `admin-ui/` - Frontend (React + Vite)
- `prod/` - Production Docker configuration
- `docs/` - Documentation (single source of truth)

### Development Workflow
1. **Branch**: Create feature branch from `dev`
2. **Code**: Follow pre-commit hooks (Black, isort, flake8, bandit)
3. **Test**: Run cross-platform test scripts
4. **Document**: Update `/docs/` via PR
5. **PR**: Submit to `dev` branch

---

## 3. Coding Standards

### Python (Backend)
- **Style**: PEP 8, Black formatting, isort imports
- **Async**: Use `async/await` for I/O operations
- **Error Handling**: Explicit try/except with proper logging
- **Testing**: pytest, minimum 80% coverage for security/auth modules
- **Security**: Input validation, SQL injection prevention, rate limiting

### TypeScript/React (Frontend)
- **Style**: TypeScript, functional components, no classes
- **Naming**: kebab-case for directories, descriptive variable names
- **Types**: Prefer interfaces over types, no enums (use maps)
- **UI**: Shadcn/Radix + Tailwind, mobile-first responsive
- **Performance**: RSC > client components, Suspense + fallback, lazy loading

### General Code Quality
- **Variables**: Descriptive names (e.g., `isLoading` not `flag`)
- **Functions**: `function` keyword for pure functions
- **Conditionals**: Concise, declarative style
- **Comments**: Minimal, focus on "why" not "what"
- **No debug code**: Remove `console.log`, `debugger`, `System.out` before commit

---

## 4. Testing Workflow

### Test Categories
| Type | Framework | Purpose |
|------|-----------|---------|
| **Unit** | pytest | Core business logic |
| **Integration** | pytest + httpx | API endpoints |
| **E2E** | Playwright | Critical user journeys |
| **Security** | bandit, safety | OWASP compliance |
| **Load** | pytest-benchmark | Concurrent users support |

### Test Execution (Cross-Platform)
```bash
# Setup environment
bash setup_test_env.sh          # Linux/Mac
powershell -ExecutionPolicy Bypass -File setup_test_env.ps1  # Windows

# Run tests
bash run_tests.sh               # Linux/Mac
powershell -ExecutionPolicy Bypass -File run_tests.ps1       # Windows
```

### Test Failure Handling
1. **Inspect**: Check failure details (stack trace, error message)
2. **Fix**: Apply targeted fix
3. **Verify**: Run ONLY the specific failed test case
4. **Goal**: Minimize test execution time during fix cycle

---

## 5. Definition of Done (DoD)

### Mandatory Checks (All Tasks)
- [ ] **Build**: Full build without errors
- [ ] **Artifacts**: Verified and listed (admin-ui/dist/, Docker images)
- [ ] **Tests**: All unit/integration/e2E tests pass
- [ ] **Coverage**: Security/auth modules ≥ 80%
- [ ] **No Debug**: No console.log/debugger/System.out in production code
- [ ] **UI**: Scenarios passed (positive/negative cases)
- [ ] **Security**: CSP/headers, secret masking, rate limiting verified

### Evidence Required
- Build logs
- Test reports (pytest HTML/coverage summary)
- Screenshots of UI verification
- Environment details

### Task Completion Template
```markdown
- Build: OK (artifacts: ...)
- Tests: OK (unit/integration/e2e)
- Coverage (security/auth): XX% (threshold 80%)
- UI: OK (scenarios: ..., browsers/devices: ...)
- Security: OK (CSP/headers, masking, rate limit)
- Attachments: build logs, test reports, screenshots
```

---

## 6. Environment & Tools

### Shell & Terminal
- **Mandatory Shell**: Git Bash (`bash.exe`)
- **Do NOT use**: PowerShell, CMD (unless OS-specific commands required)
- **Reason**: Consistency in script execution and path handling

### Tool Paths (Git Bash Format)
| Tool | Path | Notes |
|------|------|-------|
| **Node.js** | `/c/Program Files/nodejs/node` | |
| **npm** | `/c/Program Files/nodejs/npm` | |
| **Python 3.14** | `/c/Users/vuser/AppData/Local/Python/pythoncore-3.14-64/python.exe` | ALWAYS use full path |
| **Redis** | `127.0.0.1:6379` | Memurai service on Windows |

### Python Execution Rule
```bash
# ALWAYS invoke Python executable directly:
/c/Users/vuser/AppData/Local/Python/pythoncore-3.14-64/python.exe path/to/script.py
```

### Redis / Memurai (Windows)
- **Service Name**: `memurai`
- **Port**: 6379
- **Host**: localhost / 127.0.0.1
- **Management**: Windows Services (`sc query memurai`, `net start/stop memurai`)
- **Verification**: `netstat -an | grep 6379`

---

## 7. MCP (Model Context Protocol)

### Configuration Location
- **Workspace**: `.roo/mcp.json` (active configuration)
- **User-level**: `C:\Users\vuser\AppData\Roaming\Code\User\mcp.json`

### Active MCP Servers
| Server | Command | Status |
|--------|---------|--------|
| **GitHub** | `npx -y @modelcontextprotocol/server-github` | ✅ Enabled |
| **Filesystem** | `npx -y @modelcontextprotocol/server-filesystem` | ✅ Enabled |
| **context7** | `npx -y @upstash/context7-mcp` | ✅ Enabled |
| **Sequential Thinking** | `npx -y @modelcontextprotocol/server-sequential-thinking` | ✅ Enabled |
| **Fetch** | `uvx mcp-server-fetch` | ✅ Enabled |
| **Chrome DevTools** | `npx -y chrome-devtools-mcp@latest` | ✅ Enabled |
| **Redis** | `npx -y @modelcontextprotocol/server-redis` | ⚠️ Disabled |

### Sensitive Data
- GitHub token stored in `.roo/mcp.json` (should be moved to `.env`)
- Use environment variables for API keys and secrets

---

## 8. Security & Compliance

### 152-FZ Compliance (Russian Data Protection)
- Customer data consent management
- Data localization requirements
- Privacy policy integration

### Security Features
- **Rate Limiting**: Protection against abuse (60 requests/minute)
- **Input Validation**: SQL injection and XSS prevention
- **JWT Authentication**: Secure API access
- **Webhook Validation**: Telegram webhook verification
- **Mock Mode**: Safe development without real ERPNext (`ERP_MOCK_MODE=true`)

### Security Scanning
```bash
# From middleware directory
cd middleware
bandit -r app/      # Security vulnerability scanning
safety check        # Dependency vulnerability checking
```

---

## 9. Documentation Rules

### One Source of Truth
- **Location**: `/docs/` directory only
- **Workflow**: All changes via PR to `dev` branch
- **Title Format**: `docs: brief description of changes`

### Prohibited
- ❌ Direct commits to `main` branch
- ❌ Editing docs without PR to `dev`
- ❌ Creating duplicate documents
- ❌ Storing local drafts in repository

### Key Documents
- `QWEN.md` - Project context guide
- `README.md` - Quick start and overview
- `docs/architecture/system_architecture.md` - System design
- `docs/definition-of-done.md` - Task completion criteria
- `docs/ci-cd.md` - CI/CD workflows

---

## 10. References

### Original Source Files (Backed Up)
- `.qwen/backups/trae-settings.json.backup`
- `.qwen/backups/trae-rules/*.md.backup`
- `.qwen/backups/roo-mcp.json.backup`
- `.qwen/backups/task-close-checklist.md.backup`

### Related Files
- `.github/copilot-instructions.md` - GitHub Copilot guidance
- `docs/definition-of-done.md` - Detailed DoD requirements
- `middleware/DEPLOYMENT.md` - Backend deployment guide
- `prod/README.md` - Production deployment guide

---

*Last Updated: February 20, 2026 | Version: 1.0.0*
