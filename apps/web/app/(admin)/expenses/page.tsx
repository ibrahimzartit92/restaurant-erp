import Link from 'next/link';
import { AutoApplyFilterForm } from '../../components/auto-apply-filter-form';
import { DataTable, type DataColumn } from '../../components/data-table';
import { ExpenseHierarchyManager } from '../../components/expense-hierarchy-manager';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { buildQuery, fetchList, formatDate, getMoneyFormatter } from '../../lib/api';
import type { BankAccountOption, BranchOption, ExpenseCategoryOption, ExpenseTypeOption, VaultOption } from '../../lib/types';

type ExpensesPageProps = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

type ExpenseRow = {
  id: string;
  expenseNumber: string;
  expenseDate: string;
  branch?: { name: string } | null;
  expenseCategory?: { name: string } | null;
  expenseType?: { name: string } | null;
  drawer?: { name: string } | null;
  bankAccount?: { name: string } | null;
  title: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: 'unpaid' | 'partially_paid' | 'paid';
  paymentMethod: string;
  notes?: string | null;
};

const paymentMethodOptions = [
  { value: 'cash', label: 'درج' },
  { value: 'bank', label: 'حساب بنكي' },
  { value: 'vault', label: 'خزنة' },
  { value: 'other', label: 'غير مدفوع / أخرى' },
];

const paymentStatusOptions = [
  { value: 'unpaid', label: 'غير مدفوع' },
  { value: 'partially_paid', label: 'مدفوع جزئيًا' },
  { value: 'paid', label: 'مدفوع بالكامل' },
];

function expensesQuery(params: Record<string, string | undefined>) {
  return buildQuery({
    search: params.search,
    branch_id: params.branch_id,
    category_id: params.category_id,
    expense_type_id: params.expense_type_id,
    payment_method: params.payment_method,
    payment_status: params.payment_status,
    vault_id: params.vault_id,
    bank_account_id: params.bank_account_id,
    date_from: params.date_from,
    date_to: params.date_to,
  });
}

function expensesExportQuery(params: Record<string, string | undefined>, format: 'excel' | 'pdf') {
  return buildQuery({
    search: params.search,
    branch_id: params.branch_id,
    category_id: params.category_id,
    expense_type_id: params.expense_type_id,
    payment_method: params.payment_method,
    payment_status: params.payment_status,
    vault_id: params.vault_id,
    bank_account_id: params.bank_account_id,
    date_from: params.date_from,
    date_to: params.date_to,
    format,
  });
}

function paymentStatusLabel(status: ExpenseRow['paymentStatus']) {
  if (status === 'paid') return 'مدفوع بالكامل';
  if (status === 'partially_paid') return 'مدفوع جزئيًا';
  return 'غير مدفوع';
}

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const params = (await searchParams) ?? {};
  const [result, branchesResult, categoriesResult, typesResult, vaultsResult, bankAccountsResult, formatMoney] = await Promise.all([
    fetchList<ExpenseRow>(`/expenses${expensesQuery(params)}`),
    fetchList<BranchOption>('/branches'),
    fetchList<ExpenseCategoryOption>('/expense-categories'),
    fetchList<ExpenseTypeOption>('/expense-types'),
    fetchList<VaultOption>('/vaults'),
    fetchList<BankAccountOption>('/bank-accounts'),
    getMoneyFormatter(),
  ]);
  const filteredTypes = typesResult.data.filter((type) => !params.category_id || type.categoryId === params.category_id);

  const columns: DataColumn<ExpenseRow>[] = [
    { key: 'expenseNumber', label: 'رقم المصروف', render: (row) => row.expenseNumber },
    { key: 'expenseDate', label: 'التاريخ', render: (row) => formatDate(row.expenseDate) },
    { key: 'branch', label: 'الفرع', render: (row) => row.branch?.name ?? 'غير محدد' },
    { key: 'category', label: 'التصنيف', render: (row) => row.expenseCategory?.name ?? 'غير محدد' },
    { key: 'type', label: 'النوع', render: (row) => row.expenseType?.name ?? 'غير محدد' },
    { key: 'title', label: 'العنوان', render: (row) => row.title },
    { key: 'amount', label: 'إجمالي التكلفة', render: (row) => formatMoney(row.amount) },
    { key: 'paidAmount', label: 'المدفوع', render: (row) => formatMoney(row.paidAmount ?? 0) },
    { key: 'remainingAmount', label: 'المتبقي', render: (row) => formatMoney(row.remainingAmount ?? 0) },
    { key: 'paymentStatus', label: 'حالة الدفع', render: (row) => <StatusBadge value={paymentStatusLabel(row.paymentStatus)} /> },
    { key: 'source', label: 'جهة الدفع', render: (row) => row.drawer?.name ?? row.bankAccount?.name ?? row.paymentMethod },
    {
      key: 'actions',
      label: 'إجراء',
      render: (row) => (
        <Link className="text-link" href={`/expenses/${row.id}/edit`}>
          تعديل
        </Link>
      ),
    },
  ];

  const exportBase = '/api/reports/expenses/export';

  return (
    <>
      <PageHeader
        title="المصاريف"
        description="إدارة المصاريف حسب تصنيف ثم نوع، مع تتبع المدفوع والمتبقي وتصدير النتائج حسب الفلاتر."
        actionLabel="مصروف جديد"
        actionHref="/expenses/new"
      />

      <section className="report-toolbar">
        <AutoApplyFilterForm className="filters report-filters">
          <label>
            الفرع
            <select defaultValue={params.branch_id ?? ''} name="branch_id">
              <option value="">كل الفروع</option>
              {branchesResult.data.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            التصنيف
            <select defaultValue={params.category_id ?? ''} name="category_id">
              <option value="">كل التصنيفات</option>
              {categoriesResult.data.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            نوع المصروف
            <select defaultValue={params.expense_type_id ?? ''} name="expense_type_id">
              <option value="">كل الأنواع</option>
              {filteredTypes.map((expenseType) => (
                <option key={expenseType.id} value={expenseType.id}>
                  {expenseType.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            طريقة الدفع
            <select defaultValue={params.payment_method ?? ''} name="payment_method">
              <option value="">كل الطرق</option>
              {paymentMethodOptions.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            حالة الدفع
            <select defaultValue={params.payment_status ?? ''} name="payment_status">
              <option value="">كل الحالات</option>
              {paymentStatusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            الخزنة
            <select defaultValue={params.vault_id ?? ''} name="vault_id">
              <option value="">كل الخزن</option>
              {vaultsResult.data.map((vault) => (
                <option key={vault.id} value={vault.id}>
                  {vault.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            الحساب البنكي
            <select defaultValue={params.bank_account_id ?? ''} name="bank_account_id">
              <option value="">كل الحسابات</option>
              {bankAccountsResult.data.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            من تاريخ
            <input defaultValue={params.date_from ?? ''} name="date_from" type="date" />
          </label>
          <label>
            إلى تاريخ
            <input defaultValue={params.date_to ?? ''} name="date_to" type="date" />
          </label>
          <label>
            بحث
            <input defaultValue={params.search ?? ''} name="search" placeholder="رقم أو عنوان المصروف" />
          </label>
          <Link className="secondary-button" href="/expenses">
            مسح
          </Link>
        </AutoApplyFilterForm>

        <div className="report-export-actions">
          <a className="secondary-button" href={`${exportBase}${expensesExportQuery(params, 'excel')}`}>
            Excel
          </a>
          <a className="secondary-button" href={`${exportBase}${expensesExportQuery(params, 'pdf')}`}>
            PDF
          </a>
        </div>
      </section>

      {result.error ? <p className="notice">{result.error}</p> : null}
      <DataTable columns={columns} rows={result.data} emptyTitle="لا توجد مصاريف" emptyText="غير الفلاتر أو سجل مصروفًا جديدًا ليظهر هنا." />

      <ExpenseHierarchyManager categories={categoriesResult.data} expenseTypes={typesResult.data} />
    </>
  );
}
