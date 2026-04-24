import { notFound } from 'next/navigation';
import { BranchTransferForm } from '../../../../components/branch-transfer-form';
import { PageHeader } from '../../../../components/page-header';
import { fetchList, fetchOne } from '../../../../lib/api';
import type {
  BranchOption,
  BranchTransferSummary,
  ItemOption,
  WarehouseOption,
} from '../../../../lib/types';

export default async function EditTransferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [transferResult, branchesResult, warehousesResult, itemsResult] = await Promise.all([
    fetchOne<BranchTransferSummary>(`/transfers/${id}`),
    fetchList<BranchOption>('/branches'),
    fetchList<WarehouseOption>('/warehouses'),
    fetchList<ItemOption>('/items'),
  ]);

  if (!transferResult.data) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title="صفحة تعديل تحويل"
        description="حدّث بيانات التحويل والمواد والكميات والتكلفة مع الحفاظ على نفس أسلوب الإدارة الحالي."
      />
      {transferResult.error || branchesResult.error || warehousesResult.error || itemsResult.error ? (
        <p className="notice">
          {transferResult.error ?? branchesResult.error ?? warehousesResult.error ?? itemsResult.error}
        </p>
      ) : null}
      <BranchTransferForm
        branches={branchesResult.data}
        initialTransfer={transferResult.data}
        items={itemsResult.data}
        mode="edit"
        warehouses={warehousesResult.data}
      />
    </>
  );
}
