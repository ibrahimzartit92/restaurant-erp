import { notFound } from 'next/navigation';
import { BankAccountForm } from '../../../../components/bank-account-form';
import { PageHeader } from '../../../../components/page-header';
import { fetchList, fetchOne } from '../../../../lib/api';
import type { BankAccountSummary, BranchOption } from '../../../../lib/types';

export default async function EditBankAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [result, branches] = await Promise.all([
    fetchOne<BankAccountSummary>(`/bank-accounts/${id}`),
    fetchList<BranchOption>('/branches'),
  ]);

  if (!result.data) {
    notFound();
  }

  return (
    <>
      <PageHeader title="صفحة تعديل حساب بنكي" description="حدّث بيانات الحساب البنكي وحالته والعملة والملاحظات عند الحاجة." />
      {result.error ? <p className="notice">{result.error}</p> : null}
      <BankAccountForm initialAccount={result.data} mode="edit" branches={branches.data} />
    </>
  );
}
