import Link from 'next/link';
import { DataTable, type DataColumn } from '../../components/data-table';
import { ListFilters } from '../../components/list-filters';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { buildQuery, fetchList, getMoneyFormatter } from '../../lib/api';

type VaultRow = {
  id: string;
  code: string;
  name: string;
  openingBalance: number;
  openingBalanceDate?: string | null;
  currentBalance: number;
  isActive: boolean;
  notes?: string | null;
  transactionTotals?: {
    inflows: number;
    outflows: number;
  };
};

export default async function VaultsPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const params = (await searchParams) ?? {};
  const [vaults, formatMoney] = await Promise.all([
    fetchList<VaultRow>(`/vaults${buildQuery({ search: params.search })}`),
    getMoneyFormatter(),
  ]);

  const columns: DataColumn<VaultRow>[] = [
    { key: 'code', label: 'الكود', render: (row) => row.code },
    { key: 'name', label: 'اسم الخزنة', render: (row) => row.name },
    { key: 'opening', label: 'الرصيد الافتتاحي', render: (row) => formatMoney(row.openingBalance) },
    { key: 'inflows', label: 'إجمالي الداخل', render: (row) => formatMoney(row.transactionTotals?.inflows ?? 0) },
    { key: 'outflows', label: 'إجمالي الخارج', render: (row) => formatMoney(row.transactionTotals?.outflows ?? 0) },
    { key: 'balance', label: 'الرصيد الحالي', render: (row) => formatMoney(row.currentBalance) },
    { key: 'isActive', label: 'الحالة', render: (row) => <StatusBadge value={row.isActive} /> },
    {
      key: 'actions',
      label: 'إجراء',
      render: (row) => (
        <div className="inline-actions">
          <Link className="text-link" href={`/vaults/${row.id}`}>
            التفاصيل
          </Link>
          <Link className="text-link" href={`/vaults/${row.id}/edit`}>
            تعديل
          </Link>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="الخزن" description="إدارة الخزنة المركزية وتتبع الداخل والخارج والرصيد الحالي." />
      <div className="page-toolbar">
        <ListFilters searchPlaceholder="بحث باسم أو كود الخزنة" />
        <Link className="primary-button" href="/vaults/new">
          خزنة جديدة
        </Link>
      </div>
      {vaults.error ? <p className="notice">{vaults.error}</p> : null}
      <DataTable columns={columns} rows={vaults.data} emptyTitle="لا توجد خزن" emptyText="أضف الخزنة الرئيسية للبدء بتسجيل الحركات المركزية." />
    </>
  );
}
