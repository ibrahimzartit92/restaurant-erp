import { BankAccountForm } from '../../../components/bank-account-form';
import { PageHeader } from '../../../components/page-header';
import { fetchList } from '../../../lib/api';
import type { BranchOption } from '../../../lib/types';

export default async function NewBankAccountPage() {
  const branches = await fetchList<BranchOption>('/branches');

  return (
    <>
      <PageHeader title="صفحة إضافة حساب بنكي" description="أدخل بيانات الحساب البنكي الأساسية مع معلومات البنك والعملة والملاحظات." />
      <BankAccountForm mode="create" branches={branches.data} />
    </>
  );
}
