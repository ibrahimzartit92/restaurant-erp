import { notFound } from 'next/navigation';
import { BankAccountForm } from '../../../../components/bank-account-form';
import { PageHeader } from '../../../../components/page-header';
import { fetchOne } from '../../../../lib/api';
import type { BankAccountSummary } from '../../../../lib/types';

export default async function EditBankAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchOne<BankAccountSummary>(`/bank-accounts/${id}`);

  if (!result.data) {
    notFound();
  }

  return (
    <>
      <PageHeader title="صفحة تعديل حساب بنكي" description="حدّث بيانات الحساب البنكي وحالته والعملة والملاحظات عند الحاجة." />
      {result.error ? <p className="notice">{result.error}</p> : null}
      <BankAccountForm initialAccount={result.data} mode="edit" />
    </>
  );
}
