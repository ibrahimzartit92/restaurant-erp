import Link from 'next/link';
import { DataTable, type DataColumn } from '../../components/data-table';
import { ListFilters } from '../../components/list-filters';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { buildQuery, fetchList, formatDate, formatMoney } from '../../lib/api';

type DrawerSessionRow = {
  id: string;
  drawer?: { name: string } | null;
  branch?: { name: string } | null;
  sessionDate: string;
  openingBalance: number;
  calculatedBalance: number;
  closingBalance?: number | null;
  differenceAmount: number;
  status: string;
};

const columns: DataColumn<DrawerSessionRow>[] = [
  { key: 'date', label: 'التاريخ', render: (row) => formatDate(row.sessionDate) },
  { key: 'drawer', label: 'الدرج', render: (row) => row.drawer?.name ?? 'غير محدد' },
  { key: 'branch', label: 'الفرع', render: (row) => row.branch?.name ?? 'غير محدد' },
  { key: 'opening', label: 'الرصيد الافتتاحي', render: (row) => formatMoney(row.openingBalance) },
  { key: 'calculated', label: 'الرصيد المحسوب', render: (row) => formatMoney(row.calculatedBalance) },
  { key: 'closing', label: 'الرصيد الختامي', render: (row) => row.closingBalance === null ? 'غير مغلق' : formatMoney(row.closingBalance) },
  { key: 'difference', label: 'الفرق', render: (row) => formatMoney(row.differenceAmount) },
  { key: 'status', label: 'الحالة', render: (row) => <StatusBadge value={row.status} /> },
  { key: 'actions', label: 'إجراء', render: (row) => <Link className="text-link" href={`/drawer-daily-sessions/${row.id}`}>تفاصيل</Link> },
];

export default async function DrawerDailySessionsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const result = await fetchList<DrawerSessionRow>(
    `/drawer-daily-sessions${buildQuery({
      branch_id: params.branch_id,
      date_from: params.date_from,
      date_to: params.date_to,
    })}`,
  );

  return (
    <>
      <PageHeader title="جلسات الدرج اليومية" description="فتح وإغلاق الدرج ومتابعة فرق النقد اليومي." />
      <div className="page-toolbar">
        <ListFilters showBranch showDateRange />
        <Link className="primary-button" href="/drawer-daily-sessions/new">فتح جلسة درج</Link>
      </div>
      {result.error ? <p className="notice">{result.error}</p> : null}
      <DataTable
        columns={columns}
        rows={result.data}
        emptyTitle="لا توجد جلسات درج"
        emptyText="افتح جلسة يومية للدرج قبل تسجيل أو مراجعة حركة النقد."
      />
    </>
  );
}
