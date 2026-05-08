import { CustomerForm } from '../../../components/customer-form';
import { PageHeader } from '../../../components/page-header';

export default function NewCustomerPage() {
  return (
    <>
      <PageHeader title="عميل جديد" description="أضف بيانات عميل بيع الجملة لاستخدامه في الفواتير." />
      <CustomerForm />
    </>
  );
}
