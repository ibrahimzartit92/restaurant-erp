# Restaurant ERP

Custom restaurant ERP workspace built with NestJS, Next.js, PostgreSQL, Docker Compose, and Nginx.

The code uses English for internal names. The first user interface is Arabic-only.

## Project Structure

```text
restaurant-erp/
  apps/
    api/
    web/
  packages/
    shared/
  infra/
    nginx/
    docker/
  docker-compose.yml
  package.json
  pnpm-workspace.yaml
```

## Folder Guide

- `apps/api` contains the NestJS backend. It currently has only the application bootstrap and a `/health` endpoint.
- `apps/web` contains the Next.js frontend. It currently has a simple Arabic start screen.
- `packages/shared` is a small TypeScript package reserved for future code shared by the backend and frontend, such as shared types.
- `infra/nginx` contains the Nginx reverse proxy configuration.
- `infra/docker` is reserved for future deployment-specific Docker files and scripts.
- `docker-compose.yml` runs PostgreSQL, the backend, the frontend, and Nginx together for local development.
- `pnpm-workspace.yaml` defines the monorepo workspace packages.
- `.env.example` documents the environment variables used by Docker Compose.

## Requirements

- Docker Desktop on Windows, or Docker Engine on Ubuntu
- Node.js 22 and pnpm are useful for local package commands, but Docker is enough to start the project

## Run Locally With Docker

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

   On Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Start all services:

   ```bash
   docker compose up --build
   ```

3. Open the app:

   - Frontend through Nginx: <http://localhost:8080>
   - Frontend directly: <http://localhost:3000>
   - Backend health check through Nginx: <http://localhost:8080/api/health>
   - Backend health check directly: <http://localhost:3001/health>

4. Stop the services:

   ```bash
   docker compose down
   ```

## Service Ports

- `3000`: Next.js frontend
- `3001`: NestJS backend
- `5432`: PostgreSQL database
- `8080`: Nginx entry point

These can be changed in `.env`.

## Backend Module Map

Backend domains live under `apps/api/src/modules`. Each domain is intentionally structured the same way:

```text
domain-name/
  dto/
  entities/
  domain-name.controller.ts
  domain-name.module.ts
  domain-name.service.ts
```

Current backend domain modules:

- `attachments` handles uploaded file references and document links.
- `attendance-files` handles imported attendance files.
- `auth` handles authentication entry points.
- `bank-accounts` handles restaurant bank account records.
- `branches` handles restaurant branches.
- `daily-sales` handles daily sales summaries.
- `drawers` handles cash drawer records.
- `employees` handles employee records.
- `expenses` handles expense records.
- `items` handles inventory and sale item records.
- `notifications` handles system notification records.
- `payroll` handles payroll records.
- `purchases` handles supplier purchase records.
- `settings` handles system configuration records.
- `supplier-payments` handles payments made to suppliers.
- `suppliers` handles supplier records.
- `transfers` handles stock or cash transfer records.
- `users` handles application user records.
- `warehouses` handles warehouse records.

The files are placeholders only. They define the clean NestJS boundaries now, while business logic, validation rules, database decorators, and permissions will be added later.

## Development Notes

- Domain module skeletons exist, but no business logic has been added yet.
- Keep backend module names in English.
- Keep UI text Arabic until another language is intentionally added.
- Add new backend features under `apps/api/src`.
- Add new frontend routes under `apps/web/app`.
- Use `packages/shared` only when both apps truly need the same code.

## Production Direction

This first version is development-focused but deployment-minded:

- Every app runs in Docker.
- Nginx is already included as the public entry point.
- PostgreSQL uses a named Docker volume.
- Environment values are separated from code.

Before production launch, add production Dockerfiles, database migrations, authentication, backups, HTTPS, and CI checks.
