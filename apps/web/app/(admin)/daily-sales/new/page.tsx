import { DailySaleForm } from '../../../components/daily-sale-form';
import { PageHeader } from '../../../components/page-header';
import { fetchList } from '../../../lib/api';
import type { BankAccountOption, BranchOption, DrawerOption, VaultOption } from '../../../lib/types';

export default async function NewDailySalePage() {
  const [branches, drawers, bankAccounts, vaults] = await Promise.all([
    fetchList<BranchOption>('/branches'),
    fetchList<DrawerOption>('/drawers'),
    fetchList<BankAccountOption>('/bank-accounts'),
    fetchList<VaultOption>('/vaults'),
  ]);

  return (
    <>
      <PageHeader title="إضافة مبيعات يومية" description="تسجيل مبيعات فرع واحد ليوم واحد وربط النقد بالدرج والبنك بالحساب البنكي." />
      <DailySaleForm mode="create" branches={branches.data} drawers={drawers.data} bankAccounts={bankAccounts.data} vaults={vaults.data} />
    </>
  );
}
