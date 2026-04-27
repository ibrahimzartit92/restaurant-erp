import { BankAccountTransactionForm } from '../../../components/bank-account-transaction-form';
import { PageHeader } from '../../../components/page-header';
import { fetchList } from '../../../lib/api';
import type { BankAccountSummary, BranchOption } from '../../../lib/types';

export default async function NewBankAccountTransactionPage() {
  const [bankAccountsResult, branchesResult] = await Promise.all([
    fetchList<BankAccountSummary>('/bank-accounts'),
    fetchList<BranchOption>('/branches'),
  ]);

  return (
    <>
      <PageHeader title="صفحة إضافة حركة بنكية" description="سجّل حركة بنكية جديدة مع دعم الفرع والمصدر والمرجع والوصف والملاحظات." />
      {bankAccountsResult.error ? <p className="notice">{bankAccountsResult.error}</p> : null}
      <BankAccountTransactionForm bankAccounts={bankAccountsResult.data} branches={branchesResult.data} />
    </>
  );
}
