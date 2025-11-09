# Repository Guidelines

## Project Structure & Module Organization
The Next.js app lives in `app/`, mixing server/client routes and API handlers in `app/api`. UI building blocks are in `components/`, shared logic in `hooks/` and `contexts/`, and cross-cutting helpers in `lib/` and `models/`; Tailwind globals sit in `app/globals.css`. Architecture notes and demos live in `docs/` plus the root Markdown files. The FastAPI backend sits in `backend/` (AI, auth, routes, services, Mongo access) and powers dashboard HTTP/WebSocket calls.

## Build, Test, and Development Commands
- `npm install` – install frontend dependencies (Node 18+).
- `npm run dev` – start the Next.js dev server on `localhost:3000`.
- `npm run build && npm run start` – verify the production bundle before release.
- `npm run lint` – run ESLint/Next; commits should land lint-clean.
- `python -m venv venv && source venv/bin/activate` then `pip install -r backend/requirements.txt` – bootstrap the FastAPI environment.
- `uvicorn backend.main:app --reload --port 8000` – run the backend locally for dashboard and chat features.

## Coding Style & Naming Conventions
Use TypeScript with 2-space indentation, PascalCase filenames for React components, and camelCase for hooks/utilities. Keep data fetching inside the relevant `app/` route or API file and move shared logic to `lib`. Favor Tailwind utilities over ad-hoc CSS. Backend files should expose one `APIRouter` each, define Pydantic schemas in `backend/models`, and keep async Mongo calls inside the database layer. Run `npm run lint` (and Python formatters if added) before committing.

## Testing Guidelines
Automated coverage is light, so lint plus manual verification are mandatory. Exercise dashboard scheduling, auth, and assignment sync against a running backend. Backend features should add unit tests in `backend/tests/` (create if absent) and include a WebSocket smoke check via `backend/test_chat.html`. Call out skipped scenarios in the PR description.

## Commit & Pull Request Guidelines
Commits use an imperative voice (`Fix MongoDB query field name`) and stay scoped to one concern; mention related issues in the body. Every PR needs a short summary, linked task, verification commands, and screenshots or clips for UI-visible work. Tag both frontend and backend reviewers when appropriate and wait for lint + manual checks before merging.

## Security & Configuration Tips
Store frontend secrets in `.env.local` and backend secrets in `backend/.env`; never commit them. Rotate credentials if they appear in logs, and generate `JWT_SECRET` with `openssl rand -hex 32`. Redact MongoDB URIs, OAuth secrets, and Gemini keys in tickets or chat transcripts.
