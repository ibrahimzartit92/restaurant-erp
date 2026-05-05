import { PageHeader } from '../../../components/page-header';
import { UnitForm } from '../../../components/unit-form';

export default function NewUnitPage() {
  return (
    <>
      <PageHeader title="إضافة وحدة قياس" description="أضف وحدة بسيطة لاستخدامها كوحدة رئيسية للمادة." />
      <UnitForm />
    </>
  );
}
