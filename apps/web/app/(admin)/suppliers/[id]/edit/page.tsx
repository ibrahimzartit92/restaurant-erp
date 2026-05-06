import { SupplierForm } from '../../../../components/core-crud-forms';
import { PageHeader } from '../../../../components/page-header';
import { fetchOne } from '../../../../lib/api';

type SupplierDetails = {
  id: string;
  code: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  defaultDueDays: number;
  isActive: boolean;
  notes?: string | null;
};

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplier = await fetchOne<SupplierDetails>(`/suppliers/${id}`);

  return (
    <>
      <PageHeader title="تعديل المورد" description="تحديث بيانات المورد أو تعطيله مع الحفاظ على فواتيره ومدفوعاته السابقة." />
      {supplier.error ? <p className="notice">{supplier.error}</p> : null}
      {supplier.data ? <SupplierForm initialSupplier={supplier.data} /> : null}
    </>
  );
}
