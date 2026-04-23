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

- `apps/api` contains the NestJS backend. It now includes health checks, authentication/access modules, and the first inventory/supplier master-data modules.
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
- `item-categories` handles inventory category master data.
- `items` handles inventory and sale item master data.
- `notifications` handles system notification records.
- `payroll` handles payroll records.
- `purchase-invoice-items` handles purchase invoice line items.
- `purchase-invoices` handles supplier and miscellaneous purchase invoices.
- `purchases` handles supplier purchase records.
- `roles` handles access role records.
- `settings` handles system configuration records.
- `supplier-payments` handles payments made to suppliers.
- `supplier-representatives` handles supplier contact people.
- `suppliers` handles supplier master data.
- `transfers` handles stock or cash transfer records.
- `users` handles application user records.
- `warehouses` handles warehouse records.

Some later business domains are still placeholders. Implemented domains use the same NestJS structure so they can be expanded safely over time.

## Development Notes

- Most later domain modules are still placeholders. Real backend logic now exists in `auth`, `roles`, `users`, `branches`, `item-categories`, `units`, `items`, `suppliers`, `supplier-representatives`, `warehouses`, `drawers`, `bank-accounts`, `purchase-invoices`, `purchase-invoice-items`, and `supplier-payments`.
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
- `item_categories`
- `units`
- `items`
- `suppliers`
- `supplier_representatives`
- `warehouses`
- `drawers`
- `bank_accounts`
- `purchase_invoices`
- `purchase_invoice_items`
- `supplier_payments`

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

## Inventory And Supplier Master Data

The first core business domain includes these backend-only CRUD modules:

- `item-categories`
- `units`
- `items`
- `suppliers`
- `supplier-representatives`

All modules support:

- `GET /resource`
- `GET /resource/:id`
- `POST /resource`
- `PATCH /resource/:id`
- `DELETE /resource/:id`

List endpoints support simple search where useful:

```bash
curl "http://localhost:3001/items?search=coffee"
curl "http://localhost:3001/suppliers?search=main"
curl "http://localhost:3001/supplier-representatives?supplierId=SUPPLIER_ID_HERE"
```

Create inventory setup records first:

```bash
curl -X POST http://localhost:3001/item-categories \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"FOOD\",\"name\":\"Food\"}"

curl -X POST http://localhost:3001/units \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"KG\",\"name\":\"Kilogram\"}"
```

Create an item after creating a category and unit:

```bash
curl -X POST http://localhost:3001/items \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"ITEM-001\",\"name\":\"Coffee Beans\",\"categoryId\":\"CATEGORY_ID_HERE\",\"unitId\":\"UNIT_ID_HERE\",\"initialPrice\":0,\"costPrice\":12.5,\"salePrice\":18,\"searchKeywords\":\"coffee beans espresso\"}"
```

Create supplier master data:

```bash
curl -X POST http://localhost:3001/suppliers \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"SUP-001\",\"name\":\"Main Supplier\",\"phone\":\"+123456789\",\"address\":\"Industrial Area\",\"defaultDueDays\":30}"

curl -X POST http://localhost:3001/supplier-representatives \
  -H "Content-Type: application/json" \
  -d "{\"supplierId\":\"SUPPLIER_ID_HERE\",\"name\":\"Sales Contact\",\"phone\":\"+123456789\",\"isPrimary\":true}"
```

## Purchasing Core

The purchasing backend supports supplier invoices, miscellaneous purchase invoices, invoice line items, and supplier payments.

Main endpoints:

- `GET /purchase-invoices`
- `GET /purchase-invoices/:id`
- `POST /purchase-invoices`
- `PATCH /purchase-invoices/:id`
- `DELETE /purchase-invoices/:id`
- `POST /purchase-invoices/:id/payments`
- `GET /purchase-invoice-items?purchase_invoice_id=INVOICE_ID_HERE`
- `POST /purchase-invoice-items`
- `GET /supplier-payments?purchase_invoice_id=INVOICE_ID_HERE`
- `POST /supplier-payments`

Invoice list filters:

```bash
curl "http://localhost:3001/purchase-invoices?branch_id=BRANCH_ID_HERE&status=open"
curl "http://localhost:3001/purchase-invoices?supplier_id=SUPPLIER_ID_HERE"
curl "http://localhost:3001/purchase-invoices?invoice_date_from=2026-04-01&invoice_date_to=2026-04-30"
curl "http://localhost:3001/purchase-invoices?search=PI-202604"
```

Create the setup records used by purchases:

```bash
curl -X POST http://localhost:3001/warehouses \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"MAIN-WH\",\"name\":\"Main Warehouse\"}"

curl -X POST http://localhost:3001/drawers \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"MAIN-CASH\",\"name\":\"Main Cash Drawer\"}"

curl -X POST http://localhost:3001/bank-accounts \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"MAIN-BANK\",\"accountName\":\"Main Bank Account\",\"bankName\":\"Restaurant Bank\"}"
```

Create a purchase invoice with items. If `invoiceNumber` is not sent, the backend generates a temporary number such as `PI-20260423-00001`.

```bash
curl -X POST http://localhost:3001/purchase-invoices \
  -H "Content-Type: application/json" \
  -d "{\"invoiceLabel\":\"Weekly coffee order\",\"branchId\":\"BRANCH_ID_HERE\",\"warehouseId\":\"WAREHOUSE_ID_HERE\",\"supplierId\":\"SUPPLIER_ID_HERE\",\"supplierRepresentativeId\":\"REPRESENTATIVE_ID_HERE\",\"invoiceDate\":\"2026-04-23\",\"discountAmount\":0,\"dueDate\":\"2026-05-23\",\"items\":[{\"itemId\":\"ITEM_ID_HERE\",\"quantity\":10,\"unitPrice\":12.5,\"notes\":\"Green beans\"}]}"
```

Create a miscellaneous invoice by omitting `supplierId`. The backend sets `isMiscellaneous` to `true`.

Add a cash payment to an invoice:

```bash
curl -X POST http://localhost:3001/purchase-invoices/INVOICE_ID_HERE/payments \
  -H "Content-Type: application/json" \
  -d "{\"branchId\":\"BRANCH_ID_HERE\",\"paymentDate\":\"2026-04-23\",\"paymentMethod\":\"cash\",\"drawerId\":\"DRAWER_ID_HERE\",\"amount\":50,\"referenceNumber\":\"CASH-001\"}"
```

Add a bank payment:

```bash
curl -X POST http://localhost:3001/purchase-invoices/INVOICE_ID_HERE/payments \
  -H "Content-Type: application/json" \
  -d "{\"branchId\":\"BRANCH_ID_HERE\",\"paymentDate\":\"2026-04-23\",\"paymentMethod\":\"bank\",\"bankAccountId\":\"BANK_ACCOUNT_ID_HERE\",\"amount\":75,\"referenceNumber\":\"TRANSFER-001\"}"
```

Payment rules:

- Cash payments require `drawerId`.
- Bank payments require `bankAccountId`.
- Multiple payments can be added to one invoice.
- After each payment, the invoice updates `paidAmount`, `remainingAmount`, `lastPaymentDate`, and payment status.

The invoice detail endpoint returns the invoice with its `items` and `payments`, leaving a clear place to add attachments, returns, and reporting later.

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
