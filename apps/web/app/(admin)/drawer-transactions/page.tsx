import { AutoApplyFilterForm } from '../../components/auto-apply-filter-form';
import { type DataColumn } from '../../components/data-table';
import { PageHeader } from '../../components/page-header';
import { SplitTransactionsTables } from '../../components/split-transactions-tables';
import { StatusBadge } from '../../components/status-badge';
import { buildQuery, fetchList, formatDate, formatMoney } from '../../lib/api';
import type { BranchOption, DrawerOption } from '../../lib/types';

type DrawerTransactionRow = {
  id: string;
  drawer?: { name: string } | null;
  branch?: { name: string } | null;
  transactionDate: string;
  transactionType: string;
  direction: string;
  amount: number;
  description: string;
};

const columns: DataColumn<DrawerTransactionRow>[] = [
  { key: 'date', label: 'التاريخ', render: (row) => formatDate(row.transactionDate) },
  { key: 'drawer', label: 'الدرج', render: (row) => row.drawer?.name ?? 'غير محدد' },
  { key: 'branch', label: 'الفرع', render: (row) => row.branch?.name ?? 'غير محدد' },
  { key: 'type', label: 'نوع الحركة', render: (row) => <StatusBadge value={row.transactionType} /> },
  { key: 'amount', label: 'المبلغ', render: (row) => formatMoney(row.amount) },
  { key: 'description', label: 'الوصف', render: (row) => row.description },
];

export default async function DrawerTransactionsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const showAll = params.show_all === '1';
  const showAllHref = `/drawer-transactions${buildQuery({ ...params, show_all: '1' })}`;
  const [result, branchesResult, drawersResult] = await Promise.all([
    fetchList<DrawerTransactionRow>(
      `/drawer-transactions${buildQuery({
        drawer_id: params.drawer_id,
        branch_id: params.branch_id,
        date_from: params.date_from,
        date_to: params.date_to,
      })}`,
    ),
    fetchList<BranchOption>('/branches'),
    fetchList<DrawerOption>('/drawers'),
  ]);

  return (
    <>
      <PageHeader title="حركات الدرج" description="كل حركة نقدية داخلة أو خارجة من الدرج مع فصل واضح بين الداخل والخارج." />
      <AutoApplyFilterForm className="filters">
        <label>
          الفرع
          <select name="branch_id" defaultValue={params.branch_id ?? ''}>
            <option value="">كل الفروع</option>
            {branchesResult.data.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          الدرج
          <select name="drawer_id" defaultValue={params.drawer_id ?? ''}>
            <option value="">كل الأدراج</option>
            {drawersResult.data.map((drawer) => (
              <option key={drawer.id} value={drawer.id}>
                {drawer.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          من تاريخ
          <input name="date_from" type="date" defaultValue={params.date_from ?? ''} />
        </label>
        <label>
          إلى تاريخ
          <input name="date_to" type="date" defaultValue={params.date_to ?? ''} />
        </label>
      </AutoApplyFilterForm>
      {result.error ? <p className="notice">{result.error}</p> : null}
      <SplitTransactionsTables
        columns={columns}
        rows={result.data}
        getDate={(row) => row.transactionDate}
        getDirection={(row) => (row.direction === 'in' ? 'in' : 'out')}
        showAll={showAll}
        showAllHref={showAllHref}
        emptyIncomingText="لا توجد حركات درج داخلة مطابقة للفلاتر الحالية."
        emptyOutgoingText="لا توجد حركات درج خارجة مطابقة للفلاتر الحالية."
      />
    </>
  );
}
