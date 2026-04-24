import Link from 'next/link';
import { DataTable, type DataColumn } from '../../components/data-table';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { buildQuery, fetchList, formatDate, formatMoney } from '../../lib/api';
import type { BranchOption, BranchTransferSummary } from '../../lib/types';

const columns: DataColumn<BranchTransferSummary>[] = [
  { key: 'transferNumber', label: 'رقم التحويل', render: (row) => row.transferNumber },
  { key: 'transferDate', label: 'التاريخ', render: (row) => formatDate(row.transferDate) },
  { key: 'fromBranch', label: 'من فرع', render: (row) => row.fromBranch?.name ?? 'غير محدد' },
  { key: 'toBranch', label: 'إلى فرع', render: (row) => row.toBranch?.name ?? 'غير محدد' },
  { key: 'items', label: 'المواد', render: (row) => row.items.length },
  { key: 'totalCostAmount', label: 'إجمالي التكلفة', render: (row) => formatMoney(row.totalCostAmount) },
  { key: 'status', label: 'الحالة', render: (row) => <StatusBadge value={row.status} /> },
  {
    key: 'actions',
    label: 'إجراء',
    render: (row) => (
      <div className="table-actions">
        <Link className="text-link" href={`/transfers/${row.id}`}>
          التفاصيل
        </Link>
        <Link className="text-link" href={`/transfers/${row.id}/edit`}>
          تعديل
        </Link>
      </div>
    ),
  },
];

export default async function TransfersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const [transfersResult, branchesResult] = await Promise.all([
    fetchList<BranchTransferSummary>(
      `/transfers${buildQuery({
        search: params.search,
        from_branch_id: params.from_branch_id,
        to_branch_id: params.to_branch_id,
        date_from: params.date_from,
        date_to: params.date_to,
      })}`,
    ),
    fetchList<BranchOption>('/branches'),
  ]);

  return (
    <>
      <PageHeader
        title="قائمة التحويلات بين الفروع"
        description="تابع التحويلات بين الفروع مع إظهار الفرع المصدر والمستهدف والتاريخ والمواد والتكلفة الإجمالية."
      />
      <div className="page-toolbar">
        <form action="" className="filters">
          <label>
            بحث
            <input defaultValue={params.search ?? ''} name="search" placeholder="ابحث برقم التحويل أو اسم الفرع" />
          </label>
          <label>
            من فرع
            <select defaultValue={params.from_branch_id ?? ''} name="from_branch_id">
              <option value="">كل الفروع</option>
              {branchesResult.data.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            إلى فرع
            <select defaultValue={params.to_branch_id ?? ''} name="to_branch_id">
              <option value="">كل الفروع</option>
              {branchesResult.data.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
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
          <button type="submit">تطبيق</button>
        </form>
        <Link className="primary-button" href="/transfers/new">
          تحويل جديد
        </Link>
      </div>
      {transfersResult.error ? <p className="notice">{transfersResult.error}</p> : null}
      <DataTable
        columns={columns}
        rows={transfersResult.data}
        emptyTitle="لا توجد تحويلات بين الفروع"
        emptyText="أضف تحويلًا جديدًا بين الفروع وسيظهر هنا مع المواد والكميات والتكلفة."
      />
    </>
  );
}
