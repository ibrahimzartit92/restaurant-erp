import { PageHeader } from '../../../components/page-header';
import { RoleForm } from '../../../components/role-form';

export default function NewRolePage() {
  return (
    <>
      <PageHeader title="صفحة إضافة دور" description="أنشئ دوراً جديداً بكود واضح واسم عربي مفهوم للفريق الإداري." />
      <RoleForm mode="create" />
    </>
  );
}
