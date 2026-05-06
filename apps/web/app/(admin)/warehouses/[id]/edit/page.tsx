import { WarehouseForm } from '../../../../components/core-crud-forms';
import { PageHeader } from '../../../../components/page-header';
import { fetchOne } from '../../../../lib/api';

type WarehouseDetails = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

export default async function EditWarehousePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const warehouse = await fetchOne<WarehouseDetails>(`/warehouses/${id}`);

  return (
    <>
      <PageHeader title="تعديل المخزن" description="تحديث بيانات المخزن أو تعطيله مع الحفاظ على حركات المخزون السابقة." />
      {warehouse.error ? <p className="notice">{warehouse.error}</p> : null}
      {warehouse.data ? <WarehouseForm initialWarehouse={warehouse.data} /> : null}
    </>
  );
}
