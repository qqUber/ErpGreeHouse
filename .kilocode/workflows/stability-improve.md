📘 Project Manifesto: ErpGreeHouse Phase 2 Transition
1. Current State & "Source of Truth"
Core Stack: Python 3.14-slim, Redis 8.0.

Architecture: FastAPI Async Middleware, Custom Worker, React 18 Frontend.

CI/CD Baseline: GitHub Actions with strict linting (Black, Flake8, MyPy, Biome, Safety).

Key Directories: middleware/app/ (Logic), admin-ui/src/ (UI), docs/ (Architecture), prod/ (Deployment).

2. Infrastructure Compliance Rules
No Silent Failures: Every CI step must fail the build on error. No || true.


Strict Typing: 100% mypy coverage for all new middleware modules.

UI Integrity: All components must be responsive and respect container boundaries.

