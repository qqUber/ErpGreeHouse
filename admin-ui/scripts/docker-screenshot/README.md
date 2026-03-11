# Docker Playwright Screenshot Tool

Screenshot capture using Docker Playwright for consistent, isolated browser environment.

## Quick Start

```bash
# Run Docker screenshot capture
npm run screenshot:docker

# Or directly
./scripts/docker-screenshot/run.sh
```

## Prerequisites

- Docker installed and running
- Services running (frontend:5173, backend:8000)

## Features

- ✅ **Isolated Environment** - Clean browser state every run
- ✅ **Consistent Results** - Same browser/OS version
- ✅ **No Local Dependencies** - Everything in container
- ✅ **CI/CD Ready** - Standard Docker approach
- ✅ **Automatic Login** - Handles authentication

## Usage

```bash
# Basic capture (8 pages)
npm run screenshot:docker

# Output location
./exploration/screenshots/*.png
```

## Pages Captured

1. **01-login** - Login page
2. **02-dashboard** - Dashboard with widgets
3. **03-customers** - Customers list
4. **04-pos** - POS/Sales form
5. **05-products** - Products catalog
6. **06-marketing** - Marketing campaigns
7. **07-settings** - Settings page
8. **08-integrations** - Integrations page

## How It Works

1. **Check Services** - Verifies frontend/backend are running
2. **Launch Container** - Uses Playwright Docker image
3. **Install Playwright** - Installs inside container
4. **Login** - Authenticates as admin
5. **Capture** - Screenshots all 8 pages
6. **Copy** - Moves screenshots to project directory

## Docker Image

- **Image**: `mcr.microsoft.com/playwright:v1.58.2-jammy`
- **Size**: ~1.5GB
- **Node**: v24.13.0
- **Playwright**: v1.58.2

## Troubleshooting

### Services Not Running
```bash
# Start services first
docker-compose up -d
```

### Permission Denied
```bash
chmod +x scripts/docker-screenshot/run.sh
chmod +x scripts/docker-screenshot/capture.sh
```

### Docker Not Found
```bash
# Verify Docker installation
docker --version
docker-compose --version
```

### Network Issues
The script uses `--network host` mode for Linux compatibility.
For Mac/Windows, you may need to use `host.docker.internal`:

```bash
# In capture.sh, change:
BASE_URL=http://host.docker.internal:5173
```

## Comparison with Node Script

| Feature | Node Script | Docker Playwright |
|---------|-------------|-------------------|
| Speed | Fast (~30s) | Slower (~60s) |
| Setup | Local install | Docker only |
| Consistency | Environment dependent | Guaranteed |
| Debugging | Easy | Harder |
| CI/CD | Requires setup | Ready |
| Size | ~50MB | ~1.5GB |

## When to Use

**Use Docker Playwright:**
- CI/CD pipelines
- Team consistency
- Debugging environment issues
- Clean slate testing

**Use Node Script:**
- Local development
- Rapid iteration
- Quick feedback
- Custom modifications

## Output Example

```
🐳 Docker Playwright Screenshot Tool
================================================
✅ Services are running

📸 Starting screenshot capture...
🎭 Playwright Screenshot Capture (Docker)
==========================================
Base URL: http://localhost:5173
Output: /screenshots

📦 Installing Playwright...
🚀 Launching browser...
🔐 Logging in...
✅ Logged in

📸 01-login: Login page
  ✅ Saved: 01-login.png
📸 02-dashboard: Dashboard
  ✅ Saved: 02-dashboard.png
...

✨ Capture complete!
📁 Location: ./exploration/screenshots/
```

## Integration with Workflow

### Local Development
```bash
# Use Node script for speed
npm run screenshot
```

### Pre-Commit Verification
```bash
# Use Docker for consistency
npm run screenshot:docker
git add exploration/screenshots/
```

### CI/CD Pipeline
```yaml
- name: Docker Screenshots
  run: npm run screenshot:docker
  
- name: Upload Artifacts
  uses: actions/upload-artifact@v3
  with:
    name: screenshots
    path: exploration/screenshots/
```

## File Structure

```
scripts/docker-screenshot/
├── run.sh          # Main entry point
├── capture.sh      # Docker-side capture script
└── README.md       # This file
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:5173` | Frontend URL |
| `ADMIN_USERNAME` | `admin` | Login username |
| `ADMIN_PASSWORD` | `admin` | Login password |

## License

Same as project
