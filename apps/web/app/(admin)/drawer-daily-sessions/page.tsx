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
  movementTotals?: {
    inflows: number;
    outflows: number;
  };
};

const columns: DataColumn<DrawerSessionRow>[] = [
  { key: 'date', label: 'التاريخ', render: (row) => formatDate(row.sessionDate) },
  { key: 'drawer', label: 'الدرج', render: (row) => row.drawer?.name ?? 'غير محدد' },
  { key: 'branch', label: 'الفرع', render: (row) => row.branch?.name ?? 'غير محدد' },
  { key: 'inflows', label: 'إجمالي الداخل', render: (row) => formatMoney(row.movementTotals?.inflows ?? 0) },
  { key: 'outflows', label: 'إجمالي الخارج', render: (row) => formatMoney(row.movementTotals?.outflows ?? 0) },
  { key: 'calculated', label: 'الرصيد النظري', render: (row) => formatMoney(row.calculatedBalance) },
  {
    key: 'closing',
    label: 'النقد الفعلي',
    render: (row) => (row.closingBalance === null ? 'لم يدخل' : formatMoney(row.closingBalance)),
  },
  { key: 'difference', label: 'الفرق', render: (row) => formatMoney(row.differenceAmount) },
  { key: 'status', label: 'الحالة', render: (row) => <StatusBadge value={row.status} /> },
  {
    key: 'actions',
    label: 'إجراء',
    render: (row) => (
      <Link className="text-link" href={`/drawer-daily-sessions/${row.id}`}>
        تفاصيل
      </Link>
    ),
  },
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
      drawer_id: params.drawer_id,
      date_from: params.date ?? params.date_from,
      date_to: params.date ?? params.date_to,
    })}`,
  );

  return (
    <>
      <PageHeader title="تسويات الأدراج اليومية" description="مراجعة إغلاقات النقد اليومية والفرق بين النقد الفعلي والرصيد النظري." />
      <div className="page-toolbar">
        <ListFilters showBranch showDrawer showDate showDateRange />
        <Link className="primary-button" href="/drawers">
          تسوية اليوم
        </Link>
      </div>
      {result.error ? <p className="notice">{result.error}</p> : null}
      <DataTable
        columns={columns}
        rows={result.data}
        emptyTitle="لا توجد تسويات درج"
        emptyText="ستظهر التسويات هنا بعد حفظ إغلاق نهاية اليوم من صفحة الأدراج."
      />
    </>
  );
}
