import { DailySalesClosingWizard } from '../../../../components/daily-sales-closing-wizard';
import { PageHeader } from '../../../../components/page-header';
import { fetchList, fetchOne } from '../../../../lib/api';
import type { BankAccountOption, BranchOption, DailySalesClosingSummary, DrawerOption, VaultOption } from '../../../../lib/types';

export default async function EditDailySaleClosingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [closing, branches, drawers, bankAccounts, vaults] = await Promise.all([
    fetchOne<DailySalesClosingSummary>(`/daily-sales/${id}`),
    fetchList<BranchOption>('/branches'),
    fetchList<DrawerOption>('/drawers'),
    fetchList<BankAccountOption>('/bank-accounts'),
    fetchList<VaultOption>('/vaults'),
  ]);

  return (
    <>
      <PageHeader title="مراجعة إقفال المبيعات اليومية" description="راجع المسودة أو الإقفال النهائي مع الملخص والتحذيرات والحركات المرتبطة." />
      {closing.error ? <p className="notice danger">{closing.error}</p> : null}
      <DailySalesClosingWizard
        initialClosing={closing.data}
        branches={branches.data}
        drawers={drawers.data}
        bankAccounts={bankAccounts.data}
        vaults={vaults.data}
      />
    </>
  );
}
