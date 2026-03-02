# Coding Conventions

This document outlines the coding conventions and style guidelines for the ErpGreeHouse project.

## Python Conventions (Middleware)

### Code Formatting

- **Formatter**: Black (version 23.3.0)
- **Line Length**: 88 characters
- **Indentation**: 4 spaces
- **Configuration**: Defined in `.pre-commit-config.yaml`
- **Excluded Directories**: `tests/`, `reports/`, `.venv/`, `venv/`, `vendor/`, `node_modules/`

### Import Sorting

- **Tool**: isort (version 5.12.0)
- **Profile**: Black-compatible sorting
- **Command**: `isort --profile black`

### Linting

- **Tool**: flake8 (version 6.0.0)
- **Line Length**: 88 characters
- **Ignored Rules**: E203 (whitespace before colon), W503 (line break before binary operator)
- **Configuration**: Defined in `.pre-commit-config.yaml`

### Type Checking

- **Tool**: mypy (version 1.8.0)
- **Configuration File**: `middleware/mypy.ini`
- **Python Version**: 3.11
- **Key Settings**:
  - Warns about return type `Any`
  - Checks untyped definitions
  - Strict equality checks
  - Ignores missing imports for third-party packages without stubs
- **Excluded Directories**: Tests, virtual environments, vendor code

### Security Scanning

- **Tool**: bandit (version 1.7.5)
- **Target**: `middleware/app/` directory
- **Output Format**: JSON

### Pre-Commit Hooks

The project uses pre-commit (version 4.4.0) with the following hooks:
- trailing-whitespace
- end-of-file-fixer
- check-yaml
- check-added-large-files (max 1000KB)
- check-merge-conflict
- check-case-conflict
- check-json
- check-toml
- debug-statements
- mixed-line-ending
- requirements-txt-fixer

### File Naming

- Python files: `snake_case.py`
- Test files: `test_*.py` or `*_test.py`
- Configuration files: `.filename` (dot-prefixed)

### Import Conventions

```python
# Standard library imports first
import os
import sys

# Third-party imports
from fastapi import FastAPI
from pydantic import BaseModel

# Local imports
from app.db import get_db
from app.models import User
```

## TypeScript/React Conventions (Admin UI)

### Code Formatting and Linting

- **Tool**: Biome (version 2.4.4)
- **Configuration File**: `admin-ui/biome.json`
- **Key Settings**:
  - Indentation: 2 spaces
  - Line Width: 100 characters
  - Quote Style: Single quotes
  - Trailing Commas: ES5 style
  - Linter: Enabled with recommended rules (with some overrides)

### TypeScript Configuration

- **File**: `admin-ui/tsconfig.json`
- **Target**: ESNext
- **Module**: ESNext
- **Strict**: true
- **JSX**: react-jsx

### Naming Conventions

- Files: `kebab-case.tsx` or `kebab-case.ts`
- Components: `PascalCase.tsx`
- Interfaces/types: `PascalCase` (often with `I` prefix for interfaces)
- Variables/functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`

### Import Conventions

```typescript
// External libraries
import React from 'react';
import { useState, useEffect } from 'react';

// Components
import { Button } from '@/components/Button';

// Utilities
import { formatDate } from '@/utils/date';
```

## Git Conventions

### Commit Messages

- Use imperative mood: "Add feature" not "Added feature"
- First line: Summary (max 72 characters)
- Body (optional): Detailed description
- References: Issue numbers (#123) or PR links

### Branching

- Feature branches: `feature/short-description`
- Bug fix branches: `fix/issue-description`
- Hotfix branches: `hotfix/critical-fix`

### .gitignore

Key entries:
- Virtual environments: `.venv/`, `venv/`
- IDE files: `.idea/`, `.vscode/`
- Build outputs: `dist/`, `build/`
- Database files: `*.db`, `*.sqlite3`
- Environment files: `.env`, `.env.*`
- Test artifacts: `test-results/`, `playwright-report/`
- Log files: `*.log`

## Environment Configuration

### Environment Files

- `.env`: Local development environment variables
- `.env.example`: Example configuration (commit to git)
- `.env.*`: Environment-specific files (gitignored)

### Python Environment

- **Virtual Environment**: `.venv/` directory (gitignored)
- **Dependencies**: `requirements.txt`
- **Python Version**: 3.11

### Node.js Environment

- **Package Manager**: npm
- **Dependencies**: `package.json` and `package-lock.json`
- **Node Version**: Not explicitly specified (assumes compatible with Vite 7.x)