import Link from 'next/link';
import { DataTable, type DataColumn } from '../../components/data-table';
import { ListFilters } from '../../components/list-filters';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { buildQuery, fetchList, formatMoney } from '../../lib/api';
import type { BankAccountSummary } from '../../lib/types';

const columns: DataColumn<BankAccountSummary>[] = [
  { key: 'code', label: 'الكود', render: (row) => row.code },
  { key: 'name', label: 'اسم الحساب', render: (row) => row.name },
  { key: 'bankName', label: 'البنك', render: (row) => row.bankName },
  { key: 'currency', label: 'العملة', render: (row) => row.currency },
  { key: 'balance', label: 'الرصيد الحالي', render: (row) => formatMoney(row.currentBalance ?? 0) },
  { key: 'status', label: 'الحالة', render: (row) => <StatusBadge value={row.isActive} /> },
  {
    key: 'actions',
    label: 'إجراء',
    render: (row) => (
      <div className="table-actions">
        <Link className="text-link" href={`/bank-accounts/${row.id}`}>
          التفاصيل
        </Link>
        <Link className="text-link" href={`/bank-accounts/${row.id}/edit`}>
          تعديل
        </Link>
      </div>
    ),
  },
];

export default async function BankAccountsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const result = await fetchList<BankAccountSummary>(`/bank-accounts${buildQuery({ search: params.search })}`);

  return (
    <>
      <PageHeader title="قائمة الحسابات البنكية" description="إدارة الحسابات البنكية ومراجعة الرصيد والحالة وبيانات البنك لكل حساب." />
      <div className="page-toolbar">
        <ListFilters searchPlaceholder="ابحث بالكود أو اسم الحساب أو اسم البنك" />
        <Link className="primary-button" href="/bank-accounts/new">
          حساب بنكي جديد
        </Link>
      </div>
      {result.error ? <p className="notice">{result.error}</p> : null}
      <DataTable
        columns={columns}
        rows={result.data}
        emptyTitle="لا توجد حسابات بنكية"
        emptyText="أضف حساباً بنكياً جديداً وسيظهر هنا مع الرصيد الحالي وبيانات البنك."
      />
    </>
  );
}
