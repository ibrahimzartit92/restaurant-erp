import { SupplierForm } from '../../../components/core-crud-forms';
import { PageHeader } from '../../../components/page-header';

export default function NewSupplierPage() {
  return (
    <>
      <PageHeader title="إضافة مورد" description="أدخل بيانات المورد الأساسية لاستخدامها في فواتير الشراء والمدفوعات." />
      <SupplierForm />
    </>
  );
}
