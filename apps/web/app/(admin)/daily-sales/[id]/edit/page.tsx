import { DailySaleForm } from '../../../../components/daily-sale-form';
import { PageHeader } from '../../../../components/page-header';
import { fetchList, fetchOne } from '../../../../lib/api';
import type { BranchOption } from '../../../../lib/types';

export default async function EditDailySalePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [dailySale, branches] = await Promise.all([
    fetchOne<{
      id: string;
      branchId: string;
      salesDate: string;
      cashSalesAmount: number;
      bankSalesAmount: number;
      deliverySalesAmount: number;
      websiteSalesAmount: number;
      tipsAmount: number;
      salesReturnAmount: number;
      notes?: string | null;
    }>(`/daily-sales/${id}`),
    fetchList<BranchOption>('/branches'),
  ]);

  return (
    <>
      <PageHeader title="تعديل مبيعات يومية" description="تحديث أرقام المبيعات اليومية وصافي المبيعات." />
      {dailySale.error ? <p className="notice">{dailySale.error}</p> : null}
      <DailySaleForm mode="edit" initialDailySale={dailySale.data} branches={branches.data} />
    </>
  );
}
