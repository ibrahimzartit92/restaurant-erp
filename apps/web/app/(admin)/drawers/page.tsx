import Link from 'next/link';
import { DataTable, type DataColumn } from '../../components/data-table';
import { DrawerDailyWorkflow } from '../../components/drawer-daily-workflow';
import { ListFilters } from '../../components/list-filters';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { buildQuery, fetchList, formatMoney } from '../../lib/api';

type DrawerRow = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  branch?: { name: string } | null;
  defaultOpeningBalance?: number;
  defaultCashFloat?: number;
  isActive: boolean;
  notes?: string | null;
};

type DrawerSessionRow = {
  id: string;
  drawerId: string;
  branchId: string;
  sessionDate: string;
  openingBalance: number;
  calculatedBalance: number;
  requiredClosingFloat?: number;
  closingBalance?: number | null;
  differenceAmount: number;
  status: string;
};

const columns: DataColumn<DrawerRow>[] = [
  { key: 'code', label: 'الكود', render: (row) => row.code },
  { key: 'name', label: 'اسم الدرج', render: (row) => row.name },
  { key: 'branch', label: 'الفرع', render: (row) => row.branch?.name ?? 'غير محدد' },
  { key: 'opening', label: 'الافتتاحي الافتراضي', render: (row) => formatMoney(row.defaultOpeningBalance ?? 0) },
  { key: 'float', label: 'الفكة الثابتة', render: (row) => formatMoney(row.defaultCashFloat ?? 0) },
  { key: 'isActive', label: 'الحالة', render: (row) => <StatusBadge value={row.isActive} /> },
  { key: 'notes', label: 'ملاحظات', render: (row) => row.notes ?? 'لا توجد' },
];

export default async function DrawersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const today = new Date().toISOString().slice(0, 10);
  const [drawers, todaySessions] = await Promise.all([
    fetchList<DrawerRow>(`/drawers${buildQuery({ search: params.search, branch_id: params.branch_id })}`),
    fetchList<DrawerSessionRow>(
      `/drawer-daily-sessions${buildQuery({
        branch_id: params.branch_id,
        date_from: today,
        date_to: today,
      })}`,
    ),
  ]);

  return (
    <>
      <PageHeader title="الأدراج" description="فتح وإغلاق درج اليوم ومراجعة الفكة الثابتة لكل فرع من نفس الصفحة." />

      <div className="page-toolbar">
        <ListFilters searchPlaceholder="اسم أو كود الدرج" showBranch />
        <Link className="primary-button" href="/drawers/new">
          درج جديد
        </Link>
      </div>

      {drawers.error ? <p className="notice">{drawers.error}</p> : null}
      {todaySessions.error ? <p className="notice">{todaySessions.error}</p> : null}

      {drawers.data.length > 0 ? (
        <DrawerDailyWorkflow drawers={drawers.data} today={today} todaySessions={todaySessions.data} />
      ) : null}

      <DataTable
        columns={columns}
        rows={drawers.data}
        emptyTitle="لا توجد أدراج"
        emptyText="أضف درجا لكل فرع حتى تبدأ جلسات النقد اليومية."
      />
    </>
  );
}
