import { DailySalesClosingWizard } from '../../../components/daily-sales-closing-wizard';
import { PageHeader } from '../../../components/page-header';
import { fetchList } from '../../../lib/api';
import type { BankAccountOption, BranchOption, DrawerOption, VaultOption } from '../../../lib/types';

export default async function NewDailySaleClosingPage() {
  const [branches, drawers, bankAccounts, vaults] = await Promise.all([
    fetchList<BranchOption>('/branches'),
    fetchList<DrawerOption>('/drawers'),
    fetchList<BankAccountOption>('/bank-accounts'),
    fetchList<VaultOption>('/vaults'),
  ]);

  return (
    <>
      <PageHeader title="إقفال المبيعات اليومية" description="معالج متعدد الخطوات يحفظ المسودة تلقائيًا ولا ينشئ أي حركة مالية نهائية إلا عند الضغط على إنهاء الإقفال." />
      <DailySalesClosingWizard branches={branches.data} drawers={drawers.data} bankAccounts={bankAccounts.data} vaults={vaults.data} />
    </>
  );
}
