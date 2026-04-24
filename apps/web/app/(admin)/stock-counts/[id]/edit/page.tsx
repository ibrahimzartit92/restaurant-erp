import { notFound } from 'next/navigation';
import { PageHeader } from '../../../../components/page-header';
import { StockCountForm } from '../../../../components/stock-count-form';
import { fetchList, fetchOne } from '../../../../lib/api';
import type {
  BranchOption,
  ItemOption,
  StockCountSummary,
  WarehouseOption,
} from '../../../../lib/types';

export default async function EditStockCountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [stockCountResult, branchesResult, warehousesResult, itemsResult] = await Promise.all([
    fetchOne<StockCountSummary>(`/stock-counts/${id}`),
    fetchList<BranchOption>('/branches'),
    fetchList<WarehouseOption>('/warehouses'),
    fetchList<ItemOption>('/items'),
  ]);

  if (!stockCountResult.data) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title="صفحة تعديل الجرد"
        description="حدّث بيانات الجرد اليدوي وسطور المواد مع الإبقاء على نفس الواجهة الإدارية الحالية."
      />
      {stockCountResult.error || branchesResult.error || warehousesResult.error || itemsResult.error ? (
        <p className="notice">
          {stockCountResult.error ?? branchesResult.error ?? warehousesResult.error ?? itemsResult.error}
        </p>
      ) : null}
      <StockCountForm
        branches={branchesResult.data}
        initialStockCount={stockCountResult.data}
        items={itemsResult.data}
        mode="edit"
        warehouses={warehousesResult.data}
      />
    </>
  );
}
