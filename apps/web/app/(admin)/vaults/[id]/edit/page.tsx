import { notFound } from 'next/navigation';
import { PageHeader } from '../../../../components/page-header';
import { VaultForm } from '../../../../components/vault-form';
import { fetchOne } from '../../../../lib/api';

type VaultDetails = {
  id: string;
  code: string;
  name: string;
  openingBalance: number;
  openingBalanceDate?: string | null;
  isActive: boolean;
  notes?: string | null;
};

export default async function EditVaultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vault = await fetchOne<VaultDetails>(`/vaults/${id}`);

  if (!vault.data) {
    notFound();
  }

  return (
    <>
      <PageHeader title="تعديل الخزنة" description="تحديث بيانات الخزنة والرصيد الافتتاحي دون التأثير على سجل الحركات." />
      <VaultForm mode="edit" initialVault={vault.data} />
    </>
  );
}
