## Core Principle
- All development, testing, and automation must run inside **Docker**.
- No manual scripts or ad‑hoc checks are allowed outside Docker.

## Testing
- Use **Playwright** for all E2E, smoke, and integration tests.
- Capture screenshots at the end of each smoke test.
- Unit and integration tests also run inside Docker.

## Environment
- Always improve and maintain **Dockerfile** and **docker-compose.yml** when dependencies change.
- Regularly check for new versions of dependencies and update containers accordingly.
- Ensure reproducibility: lock versions where necessary, but keep them current.

## Outcome
- Clean, reproducible environment.
- No clutter from manual scripts.
- Consistent Docker-based workflow for development, testing, and deployment.
