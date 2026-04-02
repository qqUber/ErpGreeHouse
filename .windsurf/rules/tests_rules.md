---
trigger: always_on
---
## NO LOCAL TESTS ## 
- All tests MUST run in Docker only into WSL2| ❌ Never run `pytest`, `npm test`, `vitest` locally |
## DOCKER DAEMON MODE ## 
- Always use detached mode | ❌ Never use `docker compose up` without `-d` |
## DOCKER LOG SNIFFING ## 
- Monitor logs after every container start | ✅ Always use `docker compose logs -f --tail=50` |
## BACKEND and INTEGRATION TESTS ## 
- Unit tests must be ≥95% green first|
## E2E TESTS ## 
- Should run ALWAYS into cicd|