import Link from 'next/link';
import { DataTable, type DataColumn } from '../../components/data-table';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { buildQuery, fetchList, formatDate, getMoneyFormatter } from '../../lib/api';
import type { BranchOption, ExpenseCategoryOption } from '../../lib/types';

type ExpensesPageProps = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

type ExpenseRow = {
  id: string;
  expenseNumber: string;
  expenseDate: string;
  branch?: { name: string } | null;
  expenseCategory?: { name: string } | null;
  drawer?: { name: string } | null;
  bankAccount?: { name: string } | null;
  title: string;
  amount: number;
  paymentMethod: string;
  isFixed: boolean;
  notes?: string | null;
};

const paymentMethodOptions = [
  { value: 'cash', label: 'نقدي' },
  { value: 'bank', label: 'بنكي' },
  { value: 'other', label: 'أخرى' },
];

function expensesQuery(params: Record<string, string | undefined>) {
  return buildQuery({
    search: params.search,
    branch_id: params.branch_id,
    category_id: params.category_id,
    payment_method: params.payment_method,
    date_from: params.date_from,
    date_to: params.date_to,
  });
}

function expensesExportQuery(params: Record<string, string | undefined>, format: 'excel' | 'pdf') {
  return buildQuery({
    search: params.search,
    branch_id: params.branch_id,
    category_id: params.category_id,
    payment_method: params.payment_method,
    date_from: params.date_from,
    date_to: params.date_to,
    format,
  });
}

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const params = (await searchParams) ?? {};
  const [result, branchesResult, categoriesResult, formatMoney] = await Promise.all([
    fetchList<ExpenseRow>(`/expenses${expensesQuery(params)}`),
    fetchList<BranchOption>('/branches'),
    fetchList<ExpenseCategoryOption>('/expense-categories'),
    getMoneyFormatter(),
  ]);

  const columns: DataColumn<ExpenseRow>[] = [
    { key: 'expenseNumber', label: 'رقم المصروف', render: (row) => row.expenseNumber },
    { key: 'expenseDate', label: 'التاريخ', render: (row) => formatDate(row.expenseDate) },
    { key: 'branch', label: 'الفرع', render: (row) => row.branch?.name ?? 'غير محدد' },
    { key: 'category', label: 'التصنيف', render: (row) => row.expenseCategory?.name ?? 'غير محدد' },
    { key: 'title', label: 'العنوان', render: (row) => row.title },
    { key: 'amount', label: 'المبلغ', render: (row) => formatMoney(row.amount) },
    { key: 'paymentMethod', label: 'طريقة الدفع', render: (row) => <StatusBadge value={row.paymentMethod} /> },
    { key: 'source', label: 'المصدر', render: (row) => row.drawer?.name ?? row.bankAccount?.name ?? 'غير محدد' },
    { key: 'notes', label: 'ملاحظات', render: (row) => row.notes ?? 'بدون ملاحظات' },
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
        description="تسجيل ومراجعة مصاريف التشغيل والمتفرقات مع فلاتر وتصدير للمحاسبة."
        actionLabel="مصروف جديد"
        actionHref="/expenses/new"
      />

      <section className="report-toolbar">
        <form action="" className="filters report-filters">
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
          <button type="submit">تطبيق</button>
          <Link className="secondary-button" href="/expenses">
            مسح
          </Link>
        </form>

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
      <DataTable
        columns={columns}
        rows={result.data}
        emptyTitle="لا توجد مصاريف"
        emptyText="غيّر الفلاتر أو سجل مصروفا جديدا ليظهر هنا."
      />
    </>
  );
}
