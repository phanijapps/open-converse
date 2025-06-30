# Modularization Plan for OpenConverse

This document proposes a multi-module structure to make it easier to maintain the project and to expose components as independent services.

## Goals
- **Clear separation of concerns** between desktop wrapper, backend services and frontend code.
- **Service friendly** backend that can run standalone or embedded in the Tauri app.
- **Testability**: Python 3.12 tooling for scripts and testing.
- **Maintainability**: Each module can evolve independently while sharing common types.

## Proposed Directory Layout
```
open-converse/
├── apps/
│   ├── tauri-app/        # Rust + Tauri desktop wrapper
│   ├── backend-js/       # Node.js LangChain service
│   └── frontend/         # Next.js UI
├── libs/
│   └── shared/           # Reusable TypeScript types and utilities
├── scripts/              # Python 3.12 utilities and CLI tools
└── docs/
    └── MODULARIZATION_PLAN.md
```

### Module Details
- **apps/tauri-app**
  - Contains the Rust code currently in `src-tauri/`.
  - Depends on the backend service via HTTP or direct command invocation.
- **apps/backend-js**
  - Hosts LangChain logic written in TypeScript/Node.js.
  - Exposes REST/WS endpoints so it can run as a separate service.
- **apps/frontend**
  - The Next.js application from `src/`.
  - Communicates with the backend via API routes.
- **libs/shared**
  - Shared TypeScript types (currently in `shared/`).
- **scripts**
  - Python utilities, tests and automation scripts.
  - Use Python 3.12 and Pytest for unit tests.

## Implementation Steps
1. **Create `apps` and `libs` directories** and move existing code accordingly.
2. **Update build scripts** in `package.json` to reference new paths:
   - `tauri dev` launched from `apps/tauri-app`.
   - `next build` from `apps/frontend`.
3. **Backend service extraction**:
   - Move all LangChain logic under `apps/backend-js`.
   - Provide a minimal HTTP interface using Express or Fastify.
   - When running inside Tauri, start the service in-process.
4. **Shared types** remain in `libs/shared` with barrel exports to reduce import paths.
5. **Python tooling**:
   - Place scripts in `scripts/` and follow [PEP 621](https://peps.python.org/pep-0621/) style `pyproject.toml` for packaging.
   - Use `pytest` with Python 3.12 for tests.
   - Example test command: `python -m pytest`.
6. **CI Updates**:
   - Add GitHub Actions workflow to install Node 20, Rust stable and Python 3.12.
   - Run `npm run build`, `cargo check` and `pytest`.
7. **Documentation**:
   - Update README to reflect new directory layout and how to run each module.

## Notes on Python Best Practices
- Keep scripts small and composable; avoid global state (SOLID principles).
- Use type hints and run `mypy` for static analysis.
- Apply linting with `ruff` or `flake8` in CI.
- Write unit tests with `pytest` and use fixtures for setup/teardown.
- Maintain a `requirements.txt` or `poetry.lock` for reproducibility.

## Benefits
- **Service ready** architecture: backend can run separately to serve web or mobile clients.
- **Simpler builds**: each module can be developed and tested in isolation.
- **Better maintainability** with clear ownership of features.

