import { BankAccountForm } from '../../../components/bank-account-form';
import { PageHeader } from '../../../components/page-header';

export default function NewBankAccountPage() {
  return (
    <>
      <PageHeader title="صفحة إضافة حساب بنكي" description="أدخل بيانات الحساب البنكي الأساسية مع معلومات البنك والعملة والملاحظات." />
      <BankAccountForm mode="create" />
    </>
  );
}
