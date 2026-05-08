import { PageHeader } from '../../../components/page-header';
import { VaultForm } from '../../../components/vault-form';
import { fetchList } from '../../../lib/api';
import type { BranchOption } from '../../../lib/types';

export default async function NewVaultPage() {
  const branches = await fetchList<BranchOption>('/branches');

  return (
    <>
      <PageHeader title="خزنة جديدة" description="إضافة خزنة مركزية أو فرعية مع رصيد افتتاحي واضح." />
      <VaultForm mode="create" branches={branches.data} />
    </>
  );
}
