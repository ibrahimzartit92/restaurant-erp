import { BranchForm } from '../../../components/core-crud-forms';
import { PageHeader } from '../../../components/page-header';

export default function NewBranchPage() {
  return (
    <>
      <PageHeader title="إضافة فرع" description="أدخل كود الفرع واسمه وحالته حتى يصبح متاحا في باقي الشاشات." />
      <BranchForm />
    </>
  );
}
