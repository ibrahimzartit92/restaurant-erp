import { BranchTransferForm } from '../../../components/branch-transfer-form';
import { PageHeader } from '../../../components/page-header';
import { fetchList } from '../../../lib/api';
import type { BranchOption, ItemOption, WarehouseOption } from '../../../lib/types';

export default async function NewTransferPage() {
  const [branchesResult, warehousesResult, itemsResult] = await Promise.all([
    fetchList<BranchOption>('/branches'),
    fetchList<WarehouseOption>('/warehouses'),
    fetchList<ItemOption>('/items'),
  ]);

  return (
    <>
      <PageHeader
        title="صفحة إضافة تحويل جديد"
        description="سجل تحويل مواد بين فرعين مع تحديد المخزن المصدر والمستهدف والمواد والكميات والتكلفة."
      />
      {branchesResult.error || warehousesResult.error || itemsResult.error ? (
        <p className="notice">{branchesResult.error ?? warehousesResult.error ?? itemsResult.error}</p>
      ) : null}
      <BranchTransferForm
        branches={branchesResult.data}
        items={itemsResult.data}
        mode="create"
        warehouses={warehousesResult.data}
      />
    </>
  );
}
