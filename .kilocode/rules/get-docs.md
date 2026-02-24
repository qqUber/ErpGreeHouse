# get-docs.md

# 📚 Documentation-First Rule

Before answering any question related to architecture, authentication, integration, deployment, or MVP scope, **always read the relevant files in the `docs/` folder first**.

## Key Documents
- `docs/AUTH_FLOW_SOURCE_OF_TRUTH.md` — JWT, tokens, refresh flow.
- `docs/architecture/auth_flow.md` — authentication details.
- `docs/integrations/frontend_backend.md` — frontend-backend communication.
- `docs/deployment/development.md` — dev environment setup.
- `docs/security/production_security.md` — CORS, cookies, security.
- `docs/plans/mvp_scope.md` — MVP boundaries.

**Documentation is the source of truth.** If code contradicts documentation, fix the code to match the docs (unless the docs are explicitly outdated for this task).
