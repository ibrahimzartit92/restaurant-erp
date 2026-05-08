import { notFound } from 'next/navigation';
import { PageHeader } from '../../../../components/page-header';
import { VaultForm } from '../../../../components/vault-form';
import { fetchList, fetchOne } from '../../../../lib/api';
import type { BranchOption } from '../../../../lib/types';

type VaultDetails = {
  id: string;
  code: string;
  name: string;
  branchId?: string | null;
  openingBalance: number;
  openingBalanceDate?: string | null;
  isActive: boolean;
  notes?: string | null;
};

export default async function EditVaultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [vault, branches] = await Promise.all([
    fetchOne<VaultDetails>(`/vaults/${id}`),
    fetchList<BranchOption>('/branches'),
  ]);

  if (!vault.data) {
    notFound();
  }

  return (
    <>
      <PageHeader title="تعديل الخزنة" description="تحديث بيانات الخزنة والرصيد الافتتاحي دون التأثير على سجل الحركات." />
      <VaultForm mode="edit" initialVault={vault.data} branches={branches.data} />
    </>
  );
}
