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

- `apps/api` contains the NestJS backend. It now includes health checks plus the first authentication and access modules.
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
- `roles` handles access role records.
- `settings` handles system configuration records.
- `supplier-payments` handles payments made to suppliers.
- `suppliers` handles supplier records.
- `transfers` handles stock or cash transfer records.
- `users` handles application user records.
- `warehouses` handles warehouse records.

The files are placeholders only. They define the clean NestJS boundaries now, while business logic, validation rules, database decorators, and permissions will be added later.

## Development Notes

- Most domain modules are still placeholders. The first real backend logic is in `auth`, `roles`, `users`, and `branches`.
- Keep backend module names in English.
- Keep UI text Arabic until another language is intentionally added.
- Add new backend features under `apps/api/src`.
- Add new frontend routes under `apps/web/app`.
- Use `packages/shared` only when both apps truly need the same code.

## Authentication And Access Setup

The first real backend foundation includes:

- `roles`: defines access levels such as admin, accountant, and branch manager.
- `branches`: stores restaurant branches.
- `users`: stores users, hashed passwords, assigned role, and optional assigned branch.
- `auth`: handles login and returns a JWT access token.

Branch access rules:

- `admin` can access all branches.
- `accountant` can access all branches.
- `branch_manager` must be assigned to one branch and is restricted to that branch.

### Run Migrations

Start PostgreSQL first:

```bash
docker compose up postgres
```

In another terminal, run the backend migration inside the API service:

```bash
docker compose run --rm api pnpm migration:run
```

This creates the first real database tables:

- `roles`
- `branches`
- `users`

### Seed Roles

After migrations, seed the required roles:

```bash
docker compose run --rm api pnpm seed:roles
```

This creates:

- `admin`
- `accountant`
- `branch_manager`

### Create A Branch

Start the backend:

```bash
docker compose up api
```

Create a branch:

```bash
curl -X POST http://localhost:3001/branches \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Main Branch\",\"code\":\"MAIN\"}"
```

List branches:

```bash
curl http://localhost:3001/branches
```

### Create A User

Create an admin user:

```bash
curl -X POST http://localhost:3001/users \
  -H "Content-Type: application/json" \
  -d "{\"fullName\":\"System Admin\",\"email\":\"admin@example.com\",\"password\":\"password123\",\"role\":\"admin\"}"
```

Create a branch manager user after creating a branch. Replace `BRANCH_ID_HERE` with the branch `id`:

```bash
curl -X POST http://localhost:3001/users \
  -H "Content-Type: application/json" \
  -d "{\"fullName\":\"Branch Manager\",\"email\":\"manager@example.com\",\"password\":\"password123\",\"role\":\"branch_manager\",\"branchId\":\"BRANCH_ID_HERE\"}"
```

### Test Login

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@example.com\",\"password\":\"password123\"}"
```

The response includes:

- `accessToken`: the JWT token used for future protected requests.
- `user`: the logged-in user.
- `branchAccess`: whether the user can access all branches or only one branch.

## Production Direction

This first version is development-focused but deployment-minded:

- Every app runs in Docker.
- Nginx is already included as the public entry point.
- PostgreSQL uses a named Docker volume.
- Environment values are separated from code.

Before production launch, add production Dockerfiles, database migrations, authentication, backups, HTTPS, and CI checks.
