# Notification System

Scalable notification system prototype for a backend engineering challenge.

This repository contains the foundation of a modular notification platform built with `TypeScript`, `Fastify`, `PostgreSQL`, `Redis`, and `BullMQ`.

The current codebase includes:

- environment-based configuration loading
- local infrastructure with `Docker Compose`
- API bootstrap with dependency connectivity checks
- worker bootstrap with dependency connectivity checks and BullMQ consumption
- a `GET /health` endpoint
- notification creation and status lookup APIs
- PostgreSQL persistence with Drizzle migrations
- BullMQ job enqueueing and worker processing
- fake email and SMS providers
- retries, attempt tracking, templates, and channel preference checks
- smoke, unit, integration, and optional end-to-end tests

The target system design, scope, and implementation roadmap live in `DESIGN.md`.

## Tech Stack

- `Node.js`
- `TypeScript`
- `Fastify`
- `PostgreSQL`
- `Redis`
- `BullMQ`
- `Drizzle ORM`
- `Vitest`
- `Docker Compose`

## Prerequisites

Before running the project, make sure the following tools are available:

- `Node.js` `>= 24`
- `npm`
- `Docker`
- `Docker Compose`

You can verify the main requirements with:

```bash
node --version
npm --version
docker --version
docker compose version
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Create the local environment file

```bash
cp .env.example .env
```

The default values are already aligned with `docker-compose.yml`, so no changes are required for a standard local setup.

### 3. Start local infrastructure

```bash
docker compose up -d
```

If you are using `Bazzite` with `Distrobox`, use:

```bash
./scripts/compose.sh up -d
```

This starts:

- `PostgreSQL` on `localhost:5432`
- `Redis` on `localhost:6379`

To inspect container state:

```bash
docker compose ps
```

On `Bazzite` + `Distrobox`:

```bash
./scripts/compose.sh ps
```

To stop the services:

```bash
docker compose down
```

On `Bazzite` + `Distrobox`:

```bash
./scripts/compose.sh down
```

To stop the services and remove persisted volumes:

```bash
docker compose down -v
```

On `Bazzite` + `Distrobox`:

```bash
./scripts/compose.sh down -v
```

### 4. Run the API

Apply the database migrations first:

```bash
npm run db:migrate
```

This creates the PostgreSQL schema required by the API endpoints. Without this step, requests such as `POST /notifications` will fail because the database tables do not exist yet.

Then start the API:

```bash
npm run dev
```

The API listens on `http://localhost:3000` by default.

### 5. Run the worker

In a separate terminal:

```bash
npm run worker
```

The worker consumes BullMQ jobs, loads notifications from PostgreSQL, checks user preferences, resolves templates, sends through fake providers, and updates delivery status.

## Verify the Setup

Once the API is running, check the health endpoint:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "notification-system-api",
  "environment": "development"
}
```

Create a notification:

```bash
curl -X POST http://localhost:3000/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "channel": "email",
    "recipient": "user@example.com",
    "subject": "Welcome",
    "body": "Hello from the notification system",
    "idempotencyKey": "readme-example-001"
  }'
```

Retrieve a notification:

```bash
curl http://localhost:3000/notifications/<notification-id>
```

## Available Scripts

- `npm run dev`: start the API in watch mode
- `npm run worker`: start the worker in watch mode
- `npm run build`: compile the project to `dist/`
- `npm run start`: run the compiled API
- `npm run start:worker`: run the compiled worker
- `npm run db:generate`: generate Drizzle migration files
- `npm run db:migrate`: apply Drizzle migrations to PostgreSQL
- `npm run test`: run the test suite
- `npm run test:e2e`: run end-to-end tests against local PostgreSQL and Redis
- `npm run test:watch`: run tests in watch mode
- `npm run typecheck`: run TypeScript type checking

## Configuration

Configuration is loaded from environment variables through `src/config/env.ts`.

### Core variables

| Variable             | Default               | Description                                |
| -------------------- | --------------------- | ------------------------------------------ |
| `NODE_ENV`           | `development`         | Runtime environment                        |
| `PORT`               | `3000`                | API port                                   |
| `LOG_LEVEL`          | `info`                | Pino log level                             |
| `POSTGRES_HOST`      | `127.0.0.1`           | PostgreSQL host                            |
| `POSTGRES_PORT`      | `5432`                | PostgreSQL port                            |
| `POSTGRES_DB`        | `notification_system` | PostgreSQL database name                   |
| `POSTGRES_USER`      | `postgres`            | PostgreSQL username                        |
| `POSTGRES_PASSWORD`  | `postgres`            | PostgreSQL password                        |
| `DATABASE_URL`       | derived               | Optional full PostgreSQL connection string |
| `REDIS_HOST`         | `127.0.0.1`           | Redis host                                 |
| `REDIS_PORT`         | `6379`                | Redis port                                 |
| `REDIS_PASSWORD`     | empty                 | Optional Redis password                    |
| `REDIS_DB`           | `0`                   | Redis database index                       |
| `QUEUE_NAME`         | `notifications`       | BullMQ queue name                          |
| `WORKER_CONCURRENCY` | `5`                   | Planned worker concurrency                 |
| `MAX_RETRY_ATTEMPTS` | `3`                   | Planned retry attempts                     |
| `RETRY_BACKOFF_MS`   | `1000`                | Planned retry backoff base                 |

### Notes

- If `DATABASE_URL` is not provided, it is derived from the `POSTGRES_*` variables.
- Empty optional values such as `DATABASE_URL=` and `REDIS_PASSWORD=` are accepted.
- The API and worker both fail fast if PostgreSQL or Redis are unavailable.

## What Is Implemented Today

This repository is still in an early implementation phase.

Implemented:

- project bootstrap
- local infrastructure definition
- environment validation and configuration loading
- PostgreSQL bootstrap client
- Drizzle schema and migrations
- Redis and BullMQ bootstrap setup
- API process startup with dependency checks
- worker process startup with queue consumption
- health endpoint
- `POST /notifications`
- `GET /notifications/:id`
- idempotency handling
- queue publishing and processing
- fake providers for `email` and `sms`
- retry handling with attempt persistence
- template rendering
- preference-aware delivery decisions
- smoke, unit, integration, and optional end-to-end coverage

Not implemented yet:

- real external providers
- preference management endpoints
- manual retry endpoint
- advanced observability metrics
- distributed tracing
- provider failover and dead-letter workflows

For the full target scope, read `DESIGN.md`.

## Recommended Reviewer Flow

If you are reviewing this project as part of a hiring process, this is a practical order:

1. Read `README.md` for setup instructions.
2. Start PostgreSQL and Redis with `docker compose up -d`.
3. Run `npm install`.
4. Apply the database migrations with `npm run db:migrate`.
5. Start the API with `npm run dev`.
6. Start the worker with `npm run worker`.
7. Verify `GET /health`.
8. Optionally exercise `POST /notifications`.
9. Run `npm run test` and `npm run typecheck`.
10. Optionally run `npm run test:e2e` with local PostgreSQL and Redis available.
11. Read `DESIGN.md` for the architecture and implementation plan.

## Troubleshooting

### API fails with `ECONNREFUSED`

This usually means PostgreSQL or Redis is not running locally.

Check:

```bash
docker compose ps
```

### API returns `500` on `POST /notifications`

If the API is up but notification creation fails with a database query error, the schema was likely not applied yet.

Run:

```bash
npm run db:migrate
```

### Worker does not process queued jobs

Make sure the worker is running in a separate terminal:

```bash
npm run worker
```

If you want to verify the full asynchronous lifecycle, also run:

```bash
npm run test:e2e
```

### Docker permission errors

If `docker compose up -d` fails with a socket permission error, your user likely does not have access to Docker on the machine. Resolve Docker access first, then retry.

### Bazzite and Distrobox

If you are running the project inside `Distrobox` on `Bazzite`, the Docker CLI may point to `/var/run/docker.sock`, while the working container runtime is actually the rootless Podman socket exposed by the host.

This repository includes `./scripts/compose.sh`, which automatically uses:

```bash
unix:///run/user/$(id -u)/podman/podman.sock
```

when that socket is available.

Use:

```bash
./scripts/compose.sh up -d
./scripts/compose.sh ps
./scripts/compose.sh down
```

You can also export the socket manually for the current shell:

```bash
export DOCKER_HOST="unix:///run/user/$(id -u)/podman/podman.sock"
docker compose up -d
```

### Port conflicts

If ports `3000`, `5432`, or `6379` are already in use, stop the conflicting service or change the port mapping and matching environment variables.

## Repository Structure

```text
src/
  app/        API and worker entrypoints
  config/     environment parsing and validation
  db/         database bootstrap
  modules/    queue and future domain modules
scripts/      local helper scripts
  shared/     shared logger and utilities
test/
  smoke/      startup and health checks
```

## Design Document

The architecture specification and challenge requirements are documented in `DESIGN.md`.

## Trade-Offs And Future Improvements

This repository intentionally stays within the boundaries of a challenge-sized modular monolith.

Current trade-offs:

- fake providers are used instead of real integrations to keep delivery behavior deterministic
- template rendering is intentionally simple and string-based
- retries rely on BullMQ scheduling while PostgreSQL remains the source of truth
- preference handling is enforced in the worker, not at request time

Likely next improvements:

- add real provider integrations and provider-specific error mapping
- add preference management endpoints
- add a manual retry endpoint for failed notifications
- add counters and health/readiness checks beyond `/health`
- add broader end-to-end coverage around retries and preference opt-outs
