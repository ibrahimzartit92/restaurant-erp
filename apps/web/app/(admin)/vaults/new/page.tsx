import { PageHeader } from '../../../components/page-header';
import { VaultForm } from '../../../components/vault-form';

export default function NewVaultPage() {
  return (
    <>
      <PageHeader title="خزنة جديدة" description="إضافة خزنة مركزية أو فرعية مع رصيد افتتاحي واضح." />
      <VaultForm mode="create" />
    </>
  );
}
