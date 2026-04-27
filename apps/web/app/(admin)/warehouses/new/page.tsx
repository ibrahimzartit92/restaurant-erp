import { WarehouseForm } from '../../../components/core-crud-forms';
import { PageHeader } from '../../../components/page-header';

export default function NewWarehousePage() {
  return (
    <>
      <PageHeader title="إضافة مخزن" description="أدخل بيانات المخزن الأساسية لاستخدامه في المشتريات والجرد والتحويلات." />
      <WarehouseForm />
    </>
  );
}
