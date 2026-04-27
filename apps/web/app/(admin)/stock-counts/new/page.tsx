import { PageHeader } from '../../../components/page-header';
import { StockCountForm } from '../../../components/stock-count-form';
import { fetchList } from '../../../lib/api';
import type { BranchOption, ItemOption, WarehouseOption } from '../../../lib/types';

export default async function NewStockCountPage() {
  const [branchesResult, warehousesResult, itemsResult] = await Promise.all([
    fetchList<BranchOption>('/branches'),
    fetchList<WarehouseOption>('/warehouses'),
    fetchList<ItemOption>('/items'),
  ]);

  return (
    <>
      <PageHeader
        title="صفحة إضافة جرد جديد"
        description="سجل جردًا يدويًا للمخزن مع إظهار الكمية بالنظام والكمية المعدودة والفرق وفرق التكلفة."
      />
      {branchesResult.error || warehousesResult.error || itemsResult.error ? (
        <p className="notice">{branchesResult.error ?? warehousesResult.error ?? itemsResult.error}</p>
      ) : null}
      <StockCountForm
        branches={branchesResult.data}
        items={itemsResult.data}
        mode="create"
        warehouses={warehousesResult.data}
      />
    </>
  );
}
