import Link from 'next/link';
import { DataTable, type DataColumn } from '../../components/data-table';
import { DrawerDailyWorkflow } from '../../components/drawer-daily-workflow';
import { DrawerToVaultTransferForm } from '../../components/drawer-to-vault-transfer-form';
import { ListFilters } from '../../components/list-filters';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { buildQuery, fetchList, formatMoney } from '../../lib/api';
import type { VaultOption } from '../../lib/types';

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

type DrawerReconciliationRow = {
  id: string | null;
  drawerId: string;
  branchId: string;
  sessionDate: string;
  openingBalance: number;
  calculatedBalance: number;
  theoreticalBalance?: number;
  requiredClosingFloat?: number;
  closingBalance?: number | null;
  differenceAmount: number;
  reconciliationDifference?: number | null;
  movementTotals?: {
    inflows: number;
    outflows: number;
  };
  status: string;
  notes?: string | null;
  isReconciled?: boolean;
};

const columns: DataColumn<DrawerRow>[] = [
  { key: 'code', label: 'الكود', render: (row) => row.code },
  { key: 'name', label: 'اسم الدرج', render: (row) => row.name },
  { key: 'branch', label: 'الفرع', render: (row) => row.branch?.name ?? 'غير محدد' },
  { key: 'opening', label: 'العهدة الافتراضية', render: (row) => formatMoney(row.defaultOpeningBalance ?? 0) },
  { key: 'float', label: 'العهدة الثابتة', render: (row) => formatMoney(row.defaultCashFloat ?? 0) },
  { key: 'isActive', label: 'الحالة', render: (row) => <StatusBadge value={row.isActive} /> },
  { key: 'notes', label: 'ملاحظات', render: (row) => row.notes ?? 'لا توجد' },
  {
    key: 'actions',
    label: 'إجراء',
    render: (row) => (
      <div className="inline-actions">
        <Link className="text-link" href={`/drawers/${row.id}/edit`}>
          تعديل
        </Link>
      </div>
    ),
  },
];

export default async function DrawersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const today = new Date().toISOString().slice(0, 10);
  const [drawers, todaySummaries, vaults] = await Promise.all([
    fetchList<DrawerRow>(`/drawers${buildQuery({ search: params.search, branch_id: params.branch_id })}`),
    fetchList<DrawerReconciliationRow>(
      `/drawer-daily-sessions/summary${buildQuery({
        branch_id: params.branch_id,
        date: today,
      })}`,
    ),
    fetchList<VaultOption>('/vaults'),
  ]);

  return (
    <>
      <PageHeader title="الأدراج" description="تسوية النقد في نهاية اليوم بناء على الحركات النقدية المسجلة تلقائيا." />

      <div className="page-toolbar">
        <ListFilters searchPlaceholder="اسم أو كود الدرج" showBranch />
        <Link className="secondary-button" href="/drawer-transactions">
          حركات الدرج
        </Link>
        <Link className="primary-button" href="/drawers/new">
          درج جديد
        </Link>
      </div>

      {drawers.error ? <p className="notice">{drawers.error}</p> : null}
      {todaySummaries.error ? <p className="notice">{todaySummaries.error}</p> : null}
      {vaults.error ? <p className="notice">{vaults.error}</p> : null}

      {drawers.data.length > 0 ? (
        <>
          <DrawerDailyWorkflow drawers={drawers.data} today={today} summaries={todaySummaries.data} />
          <DrawerToVaultTransferForm drawers={drawers.data} vaults={vaults.data} />
        </>
      ) : null}

      <DataTable
        columns={columns}
        rows={drawers.data}
        emptyTitle="لا توجد أدراج"
        emptyText="أضف درجا لكل فرع حتى تظهر تسوية النقد اليومية."
      />
    </>
  );
}
