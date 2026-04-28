import { DailySaleForm } from '../../../../components/daily-sale-form';
import { PageHeader } from '../../../../components/page-header';
import { fetchList, fetchOne } from '../../../../lib/api';
import type { BankAccountOption, BranchOption, DrawerOption } from '../../../../lib/types';

export default async function EditDailySalePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [dailySale, branches, drawers, bankAccounts] = await Promise.all([
    fetchOne<{
      id: string;
      branchId: string;
      salesDate: string;
      cashSalesAmount: number;
      drawerId?: string | null;
      bankSalesAmount: number;
      bankAccountId?: string | null;
      deliverySalesAmount: number;
      websiteSalesAmount: number;
      tipsAmount: number;
      salesReturnAmount: number;
      notes?: string | null;
    }>(`/daily-sales/${id}`),
    fetchList<BranchOption>('/branches'),
    fetchList<DrawerOption>('/drawers'),
    fetchList<BankAccountOption>('/bank-accounts'),
  ]);

  return (
    <>
      <PageHeader title="تعديل مبيعات يومية" description="تحديث أرقام المبيعات اليومية والربط المالي للدرج والبنك." />
      {dailySale.error ? <p className="notice">{dailySale.error}</p> : null}
      <DailySaleForm
        mode="edit"
        initialDailySale={dailySale.data}
        branches={branches.data}
        drawers={drawers.data}
        bankAccounts={bankAccounts.data}
      />
    </>
  );
}
