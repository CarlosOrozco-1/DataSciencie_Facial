# AGENTS.md
Guide for autonomous coding agents working in `DataSciencie_Facial/`.

## Project Snapshot
- Backend: `app/` (FastAPI, SQLAlchemy, Pydantic v2)
- Frontend: `frontend/` (React 19, Vite, ESLint)
- Vision modules: `backend/vision/`
- DB scripts: `scriptsDB/`
- Infra: `docker-compose.yml`, `Dockerfile.app`, `frontend/Dockerfile`
- API docs (running): `http://localhost:8000/docs`

## Existing Repository Rules (must keep)
1. New/changed code should include explanatory comments about purpose/justification.
2. New Markdown docs must go in `Documentacion/`, except `AGENTS.md` and `README.md`.

## Cursor/Copilot Rules Status
No extra agent-rule files found during analysis:
- `.cursorrules` not found
- `.cursor/rules/` not found
- `.github/copilot-instructions.md` not found
If added later, treat them as authoritative and update this file.

## Setup, Build, and Run Commands
Run from repo root (`DataSciencie_Facial/`) unless noted.

### Full stack (Docker, recommended)
```bash
cp .env.example .env
docker compose up -d --build
docker compose ps
```

### Common service control
```bash
docker compose up -d app frontend db
docker compose stop app frontend db
docker compose down
docker compose restart app
```

### Logs
```bash
docker compose logs -f app
docker compose logs -f frontend
docker compose logs -f db
```

### Backend local run (without Docker)
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r app/requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend local run (without Docker)
```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 8501
```

### Frontend production build
```bash
cd frontend
npm run build
npm run preview
```

### Database helpers
```bash
docker compose exec db psql -U facial_user -d facial_db
docker compose exec db psql -U facial_user -d facial_db -c "\dt"
docker compose exec -T db psql -U facial_user -d facial_db < scriptsDB/init_db.sql
```

## Lint and Test Commands

### Frontend lint (configured)
```bash
cd frontend
npm run lint
```

### Backend lint (not configured yet)
No Python linter command is defined in the repository.
If you add one, prefer `ruff` and document exact command here.

### Test status (current repository)
- No automated tests are currently configured in scripts/tooling.
- No committed files match common test patterns.

### Running a single test (important)
Current state: not directly possible because no test framework is wired.

When backend `pytest` is introduced:
```bash
pytest path/to/test_file.py::test_case_name -q
```

When frontend `vitest` is introduced:
```bash
npm run test -- src/path/to/file.test.jsx -t "test name"
```

## Code Style Guidelines
Follow existing style in edited files; keep diffs focused and minimal.

### Python (FastAPI backend)
1. Imports grouped in this order: stdlib, third-party, local `app.*` modules.
2. Naming: `snake_case` for functions/vars, `PascalCase` for classes/models/schemas.
3. Type hints on public function signatures and schema fields are preferred.
4. Keep route handlers small; move reusable logic to core/service modules.
5. Raise `HTTPException` with explicit status codes and safe messages.
6. DB writes should follow `add` -> `commit` -> `refresh` patterns when needed.
7. Use Pydantic models for request/response; avoid leaking ORM-only structures.
8. Keep auth logic centralized (`app/core/security.py`) and dependency-driven.
9. Never hardcode secrets; use env vars (`JWT_SECRET_KEY`, DB/SMTP settings).
10. Keep camera/network code defensive (`try/except`, clear failure payloads).

### JavaScript/React (frontend)
1. Use functional components and React hooks.
2. Component files use `PascalCase.jsx`; utilities live in `src/utils/`.
3. Match existing formatting: 2 spaces, single quotes, no semicolons.
4. Respect ESLint config in `frontend/eslint.config.js`.
5. Remove unused vars unless intentionally ignored by lint naming patterns.
6. Keep auth/API helper logic centralized (see `src/utils/api.js`).
7. Use explicit loading/error state for async requests.
8. Prefer readable, explicit page state over premature abstraction.

### Imports and module boundaries
1. Backend: prefer `from app...` absolute-local imports.
2. Frontend: prefer relative imports within `src/`.
3. Avoid circular dependencies between API routers and processing modules.
4. Keep side effects out of module import-time when possible.

### Formatting and documentation behavior
1. Keep comments meaningful and consistent with nearby language (often Spanish).
2. Avoid broad reformatting of unrelated lines/files.
3. Do not commit generated artifacts unless explicitly required.
4. Preserve API route naming conventions and schema naming patterns.

### Naming conventions to preserve
1. API resource routes are plural (`/api/users`, `/api/cameras`, `/api/detections`).
2. SQLAlchemy model classes are singular (`User`, `Camera`, `Detection`).
3. Pydantic schemas are intent-specific (`UserCreate`, `UserResponse`, etc.).
4. Booleans should read clearly (`is_active`, `is_2fa_enabled`, etc.).

## Agent Workflow Checklist
1. Read related router + schema + model before editing behavior.
2. Make smallest safe change that solves the task.
3. Run relevant checks (at minimum frontend lint for frontend changes).
4. If no tests exist, include concise manual verification steps in your handoff.
5. Update this file when commands, rules, or tooling evolve.
