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
- `apps/web` contains the Next.js frontend. It now includes the first Arabic RTL admin interface.
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

## Frontend Admin Interface

The first real frontend is Arabic-only and uses RTL layout.

Available pages:

- `/login`: تسجيل الدخول
- `/`: الرئيسية
- `/bank-accounts`: قائمة الحسابات البنكية
- `/bank-accounts/new`: صفحة إضافة حساب بنكي
- `/bank-accounts/:id`: صفحة تفاصيل الحساب البنكي
- `/bank-accounts/:id/edit`: صفحة تعديل حساب بنكي
- `/bank-account-transactions`: قائمة حركات البنك
- `/bank-account-transactions/new`: صفحة إضافة حركة بنكية
- `/users`: قائمة المستخدمين
- `/users/new`: صفحة إضافة مستخدم
- `/users/:id/edit`: صفحة تعديل مستخدم
- `/roles`: قائمة الأدوار
- `/roles/new`: صفحة إضافة دور
- `/roles/:id/edit`: صفحة تعديل دور
- `/roles/:id/permissions`: صفحة ربط الصلاحيات بالدور
- `/permissions`: قائمة الصلاحيات
- `/items`: المواد
- `/suppliers`: الموردون
- `/purchase-invoices`: فواتير الشراء
- `/supplier-payments`: دفعات الموردين
- `/expense-categories`: أنواع المصاريف
- `/expense-templates`: قوالب المصاريف
- `/expenses`: المصاريف
- `/expenses/new`: إضافة مصروف
- `/daily-sales`: المبيعات اليومية
- `/daily-sales/new`: إضافة مبيعات يومية
- `/transfers`: قائمة التحويلات بين الفروع
- `/transfers/new`: صفحة إضافة تحويل جديد
- `/transfers/:id`: صفحة تفاصيل تحويل
- `/transfers/:id/edit`: صفحة تعديل تحويل
- `/stock-counts`: قائمة الجرد
- `/stock-counts/new`: صفحة إضافة جرد جديد
- `/stock-counts/:id`: صفحة تفاصيل الجرد
- `/stock-counts/:id/edit`: صفحة تعديل الجرد
- `/employees`: قائمة الموظفين
- `/employees/new`: صفحة إضافة موظف
- `/employees/:id`: صفحة تفاصيل موظف
- `/employees/:id/edit`: صفحة تعديل موظف
- `/employee-advances`: قائمة السلف
- `/employee-advances/new`: صفحة إضافة سلفة
- `/employee-penalties`: قائمة العقوبات
- `/employee-penalties/new`: صفحة إضافة عقوبة
- `/payroll`: قائمة الرواتب
- `/payroll/new`: صفحة إضافة راتب
- `/payroll/:id/edit`: صفحة تعديل راتب
- `/attendance-files`: قائمة ملفات البصمة
- `/attendance-files/new`: صفحة رفع ملف بصمة


The admin layout includes a sidebar, top header, dashboard cards, table loading behavior, empty states, and list pages connected to the available backend endpoints.

Dashboard finance cards show simple live totals when the backend is running:

- إجمالي المصاريف
- إجمالي المبيعات اليومية
- مبيعات نقدية
- مبيعات غير نقدية
- إجمالي الرصيد البنكي
- إجمالي الإيداعات
- إجمالي السحوبات
- إجمالي التحويلات
- عدد عمليات الجرد
- إجمالي فرق الكميات
- إجمالي فرق التكلفة
- عدد الموظفين
- إجمالي السلف
- إجمالي العقوبات
- إجمالي الرواتب

Run the frontend locally:

```bash
cd apps/web
pnpm dev
```

Or run it with Docker from the repository root:

```bash
docker compose up web
```

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
- `employee-advances` handles employee advance records.
- `employee-penalties` handles employee penalty records.
- `auth` handles authentication entry points.
- `bank-accounts` handles restaurant bank account records.
- `bank-account-transactions` handles the bank ledger and transaction records linked to bank accounts.
- `branches` handles restaurant branches.
- `daily-sales` handles daily sales summaries.
- `drawers` handles cash drawer records.
- `employees` handles employee records.
- `expense-categories` handles expense category master data.
- `expense-templates` handles reusable recurring expense templates.
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
- `stock-counts` handles manual stock counting records and item count lines.
- `supplier-payments` handles payments made to suppliers.
- `supplier-representatives` handles supplier contact people.
- `suppliers` handles supplier master data.
- `transfers` handles branch-to-branch material transfer records.
- `users` handles application user records.
- `warehouses` handles warehouse records.

Some later business domains are still placeholders. Implemented domains use the same NestJS structure so they can be expanded safely over time.

## Development Notes

- Most later domain modules are still placeholders. Real backend logic now exists in `auth`, `roles`, `users`, `branches`, `item-categories`, `units`, `items`, `suppliers`, `supplier-representatives`, `warehouses`, `drawers`, `bank-accounts`, `bank-account-transactions`, `purchase-invoices`, `purchase-invoice-items`, `supplier-payments`, `expense-categories`, `expense-templates`, `expenses`, `daily-sales`, `transfers`, `stock-counts`, `employees`, `employee-advances`, `employee-penalties`, `payroll`, and `attendance-files`.
- Keep backend module names in English.
- Keep UI text Arabic until another language is intentionally added.
- Add new backend features under `apps/api/src`.
- Add new frontend routes under `apps/web/app`.
- Use `packages/shared` only when both apps truly need the same code.

## Authentication And Access Setup

The access-control foundation now includes:

- `roles`: editable records with `code`, `name`, `notes`, and assigned permissions.
- `permissions`: editable catalog entries with `code`, `name`, `module`, and `notes`.
- `role_permissions`: links each role to its granted permissions.
- `branches`: stores restaurant branches.
- `users`: stores full name, username, nullable email, hashed password, assigned role, optional branch, active state, and notes.
- `auth`: handles login and returns a JWT access token with the resolved user access context.

Default branch access behavior:

- `admin` always has full access across all branches.
- Any non-admin user without a `branch_id` is treated as cross-branch.
- Any non-admin user with a `branch_id` is treated as restricted to that single branch.
- This keeps branch restriction simple and understandable: the user assignment defines branch scope, while the role defines allowed actions.

Default seeded system role codes:

- `admin`
- `accountant`
- `branch_manager`

### Run Migrations

Start PostgreSQL first:

```bash
docker compose up postgres
```

In another terminal, run the backend migration inside the API service:

```bash
docker compose run --rm api pnpm migration:run
```

This creates the real database tables, including:

- `roles`
- `permissions`
- `role_permissions`
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
- `bank_account_transactions`
- `purchase_invoices`
- `purchase_invoice_items`
- `supplier_payments`
- `expense_categories`
- `expense_templates`
- `expenses`
- `daily_sales`
- `stock_counts`
- `employees`
- `employee_advances`
- `employee_penalties`
- `payrolls`
- `attendance_files`

### Seed Access Control

After migrations, seed the default roles, permissions catalog, and role-permission links:

```bash
docker compose run --rm api pnpm seed:access-control
```

If you only need to recreate the base roles, you can still run:

```bash
docker compose run --rm api pnpm seed:roles
```

The full seed creates:

- `admin`
- `accountant`
- `branch_manager`
- the permissions catalog for modules such as `users`, `roles`, `branches`, `warehouses`, `bank_accounts`, `drawers`, `items`, `suppliers`, `purchase_invoices`, `supplier_payments`, `expenses`, `daily_sales`, `reports`, and `settings`
- the default role-permission assignments

## Bank Accounts And Bank Transactions

The bank module now has two clear parts:

- `bank-accounts`: master data for each bank account with `code`, `name`, `bank_name`, optional `iban`, optional `account_number`, `currency`, active state, and `notes`
- `bank-account-transactions`: the transaction ledger linked to bank accounts, with optional branch and future-ready source references

Supported bank transaction types:

- `deposit`: manual or operational deposit into a bank account
- `withdrawal`: direct withdrawal from a bank account
- `transfer`: transfer movement between financial contexts
- `settlement`: balancing or adjustment transaction
- `supplier_payment_bank`: supplier payment made through a bank account
- `expense_bank`: expense paid through a bank account
- `sales_receipt_bank`: bank receipt for sales proceeds
- `refund_bank`: bank-side refund or return

Each bank transaction also stores:

- `direction`: `incoming` or `outgoing`
- `branch_id`: optional branch relation
- `source_type` and `source_id`: optional future link to modules such as expenses, supplier payments, daily sales, or returns
- `reference_number`, `description`, and `notes`

## Branch Transfers Between Branches

The branch transfer module now stores material transfers between branches in a simple and extendable way:

- `branch-transfers`: the transfer header with `transfer_number`, `transfer_date`, source branch and warehouse, destination branch and warehouse, `status`, `total_cost_amount`, and `notes`
- `branch-transfer-items`: the transfer lines with `item_id`, `quantity`, `unit_cost`, `line_total`, and `notes`

Current transfer flow:

- the user creates one transfer from a source branch to a destination branch
- the first version does not require a separate receive confirmation
- the total cost is visible in the list, form, and details page
- the structure is ready to apply stock decrease on the source warehouse and stock increase on the destination warehouse later without changing the main data model

## Manual Stock Counts

The stock count module now stores manual inventory counting in a simple and extendable way:

- `stock-counts`: the count header with `count_number`, `branch_id`, `warehouse_id`, `count_date`, `status`, and `notes`
- `stock-count-items`: the count lines with `item_id`, `system_quantity`, `counted_quantity`, `difference_quantity`, `estimated_cost_difference`, and `notes`

Current stock count flow:

- the user creates a manual stock count for one branch and one warehouse
- the first version stores the system quantity snapshot directly inside each line for clarity and future comparison
- the counted quantity is entered manually by the user
- `difference_quantity = counted_quantity - system_quantity`
- `estimated_cost_difference` uses the current item cost price when available
- the structure is ready for future adjustment posting and later comparison between purchases, stock counts, daily sales, waste, and profit analysis

## Employees, Payroll, And Attendance Files

The employee and payroll area now stores simple manual HR records in a way that stays easy to extend:

- `employees`: employee master data with employee number, full name, optional phone, optional job title, optional default branch, optional hire date, active state, and notes
- `employee-advances`: advance records linked to employees, with optional payroll month and year
- `employee-penalties`: penalty records linked to employees, with optional reason and optional payroll month and year
- `payrolls`: manual payroll records with base salary, allowances, deductions, net salary, and notes
- `attendance-files`: uploaded PDF and Excel files linked optionally to employee, branch, month, and year

Current payroll and attendance flow:

- employee records are maintained separately from payroll
- advances and penalties are entered independently so they can be linked to payroll later
- payroll is entered manually and duplicate payroll for the same employee, month, and year is blocked
- attendance files are uploaded for record keeping and viewing only in this version
- the structure is ready for future parsing, payroll automation, and cross-checking with attendance and branch activity later

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

## Cash Drawer System

The cash drawer backend and frontend now support:

- `drawers`: one active cash drawer per branch in the first version.
- `drawer-daily-sessions`: daily opening and closing sessions for each drawer.
- `drawer-transactions`: cash movements in or out of a drawer.

Main frontend pages:

- `/drawers`: قائمة الأدراج
- `/drawer-daily-sessions`: قائمة جلسات الدرج اليومية
- `/drawer-daily-sessions/new`: فتح جلسة درج
- `/drawer-daily-sessions/:id`: تفاصيل جلسة الدرج
- `/drawer-daily-sessions/:id/close`: إغلاق جلسة درج
- `/drawer-transactions`: قائمة حركات الدرج

Session flow:

1. Create one drawer for each branch.
2. Open a daily drawer session with a manual `openingBalance`.
3. Add drawer transactions for cash sales, cash expenses, supplier payments, deposits, withdrawals, settlements, or transfers.
4. The session `calculatedBalance` is opening balance plus incoming transactions minus outgoing transactions.
5. Close the session with the actual `closingBalance`; the system stores `differenceAmount = closingBalance - calculatedBalance`.

The dashboard includes drawer summary cards for current drawer balance, today cash expenses placeholder, and drawer difference.

### Create A User

Create an admin user:

```bash
curl -X POST http://localhost:3001/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -d "{\"fullName\":\"System Admin\",\"username\":\"admin\",\"email\":\"admin@example.com\",\"password\":\"password123\",\"roleId\":\"ROLE_ID_HERE\",\"isActive\":true,\"notes\":\"Main system administrator\"}"
```

Create a branch-restricted manager user after creating a branch. Replace `ROLE_ID_HERE` and `BRANCH_ID_HERE` with real values:

```bash
curl -X POST http://localhost:3001/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -d "{\"fullName\":\"Branch Manager\",\"username\":\"manager_main\",\"email\":\"manager@example.com\",\"password\":\"password123\",\"roleId\":\"ROLE_ID_HERE\",\"branchId\":\"BRANCH_ID_HERE\",\"isActive\":true}"
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
- `user.permissions`: the resolved permission codes inherited from the role.
- `user.branchAccess`: whether the user can access all branches or only one branch.

### Protected Access Management Endpoints

These access-management endpoints now use JWT plus permission checks:

- `GET /auth/me`
- `GET /users`
- `GET /users/:id`
- `POST /users`
- `PATCH /users/:id`
- `GET /roles`
- `GET /roles/:id`
- `POST /roles`
- `PATCH /roles/:id`
- `PATCH /roles/:id/permissions`
- `GET /permissions`
- `POST /permissions`
- `PATCH /permissions/:id`

The backend permission-ready structure is intentionally small:

- `JwtAuthGuard` reads the bearer token and loads the safe user context.
- `PermissionGuard` checks the required permission codes.
- `RequirePermissions(...)` is the decorator used on protected routes.

This keeps future module protection extendable without pushing all access logic into the frontend.

## Production Direction

This first version is development-focused but deployment-minded:

- Every app runs in Docker.
- Nginx is already included as the public entry point.
- PostgreSQL uses a named Docker volume.
- Environment values are separated from code.

Before production launch, add production Dockerfiles, database migrations, authentication, backups, HTTPS, and CI checks.
