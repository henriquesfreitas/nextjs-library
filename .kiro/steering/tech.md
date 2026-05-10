# Technology Stack

## Framework & Runtime

- **Next.js** (App Router) — full-stack React framework, `/app` directory structure
- **React** — Server Components for data fetching, Client Components for interactivity
- **TypeScript** — strict typing throughout

## Database

- **PostgreSQL (Neon)** — hosted Postgres, connected via `pg` library (no ORM)
- Connection string stored in `DATABASE_URL` environment variable
- All queries use **parameterized statements** — never use string interpolation in SQL

## Libraries

| Library | Purpose |
|---|---|
| `pg` | PostgreSQL client, raw parameterized queries |
| `zod` | Input validation (shared between client and server) |
| `pino` | Structured server-side logging |
| `vitest` | Test runner (unit, integration, component tests) |
| `fast-check` | Property-based testing |
| `@testing-library/react` | React component testing |
| `@testing-library/jest-dom` | DOM assertion matchers |

## Infrastructure

- **Docker** — multi-stage Dockerfile for production builds
- **docker-compose** — orchestrates the web service and database
- All commands run inside containers — no host-machine installations required

## Common Commands

All commands execute via Docker. The `web` service is the application container.

```bash
# Build and start all services (app + database)
docker compose up --build

# Install dependencies (inside container)
docker compose exec web npm install

# Run development server
docker compose up

# Build for production
docker compose exec web npm run build

# Run all tests
docker compose exec web npx vitest --run

# Run tests in watch mode
docker compose exec web npx vitest

# Start production server
docker compose exec web npm start

# Stop all services
docker compose down

# View logs
docker compose logs -f web
```

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon) |

Use `.env.local` for local secrets (gitignored). Use `.env.example` as a template.
