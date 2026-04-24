import Link from 'next/link';
import { DataTable, type DataColumn } from '../../components/data-table';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { buildQuery, fetchList, formatMoney } from '../../lib/api';
import type { BranchOption, StockCountSummary, WarehouseOption } from '../../lib/types';

const columns: DataColumn<StockCountSummary>[] = [
  { key: 'countNumber', label: 'رقم الجرد', render: (row) => row.countNumber },
  { key: 'countDate', label: 'التاريخ', render: (row) => row.countDate },
  { key: 'branch', label: 'الفرع', render: (row) => row.branch?.name ?? 'غير محدد' },
  { key: 'warehouse', label: 'المخزن', render: (row) => row.warehouse?.name ?? 'غير محدد' },
  { key: 'items', label: 'المواد', render: (row) => row.items.length },
  {
    key: 'differenceQuantity',
    label: 'إجمالي فرق الكميات',
    render: (row) => row.items.reduce((sum, item) => sum + Number(item.differenceQuantity ?? 0), 0).toFixed(3),
  },
  {
    key: 'costDifference',
    label: 'إجمالي فرق التكلفة',
    render: (row) => formatMoney(row.items.reduce((sum, item) => sum + Number(item.estimatedCostDifference ?? 0), 0)),
  },
  { key: 'status', label: 'الحالة', render: (row) => <StatusBadge value={row.status} /> },
  {
    key: 'actions',
    label: 'إجراء',
    render: (row) => (
      <div className="table-actions">
        <Link className="text-link" href={`/stock-counts/${row.id}`}>
          التفاصيل
        </Link>
        <Link className="text-link" href={`/stock-counts/${row.id}/edit`}>
          تعديل
        </Link>
      </div>
    ),
  },
];

export default async function StockCountsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const [stockCountsResult, branchesResult, warehousesResult] = await Promise.all([
    fetchList<StockCountSummary>(
      `/stock-counts${buildQuery({
        search: params.search,
        branch_id: params.branch_id,
        warehouse_id: params.warehouse_id,
        date_from: params.date_from,
        date_to: params.date_to,
      })}`,
    ),
    fetchList<BranchOption>('/branches'),
    fetchList<WarehouseOption>('/warehouses'),
  ]);

  return (
    <>
      <PageHeader
        title="قائمة الجرد"
        description="تابع عمليات الجرد اليدوي مع الفرع والمخزن والتاريخ وفروقات الكميات والتكلفة."
      />
      <div className="page-toolbar">
        <form action="" className="filters">
          <label>
            بحث
            <input defaultValue={params.search ?? ''} name="search" placeholder="ابحث برقم الجرد أو اسم الفرع أو المخزن" />
          </label>
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
            المخزن
            <select defaultValue={params.warehouse_id ?? ''} name="warehouse_id">
              <option value="">كل المخازن</option>
              {warehousesResult.data.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
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
        <Link className="primary-button" href="/stock-counts/new">
          جرد جديد
        </Link>
      </div>
      {stockCountsResult.error ? <p className="notice">{stockCountsResult.error}</p> : null}
      <DataTable
        columns={columns}
        rows={stockCountsResult.data}
        emptyTitle="لا توجد عمليات جرد"
        emptyText="أضف جردًا جديدًا وسيظهر هنا مع فرق الكميات وفرق التكلفة."
      />
    </>
  );
}
