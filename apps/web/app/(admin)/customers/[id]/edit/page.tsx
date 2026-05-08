import { CustomerForm } from '../../../../components/customer-form';
import { PageHeader } from '../../../../components/page-header';
import { fetchOne } from '../../../../lib/api';
import type { CustomerOption } from '../../../../lib/types';

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await fetchOne<CustomerOption>(`/customers/${id}`);

  return (
    <>
      <PageHeader title="تعديل العميل" description="حدّث بيانات العميل بدون التأثير على الفواتير التاريخية." />
      {result.error ? <p className="notice danger">{result.error}</p> : null}
      <CustomerForm initialCustomer={result.data} />
    </>
  );
}
