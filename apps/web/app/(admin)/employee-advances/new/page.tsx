import { EmployeeAdvanceForm } from '../../../components/employee-advance-form';
import { PageHeader } from '../../../components/page-header';
import { fetchList } from '../../../lib/api';
import type { BankAccountOption, DrawerOption, EmployeeSummary, VaultOption } from '../../../lib/types';

export default async function NewEmployeeAdvancePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const [employeesResult, drawersResult, bankAccountsResult, vaultsResult] = await Promise.all([
    fetchList<EmployeeSummary>('/employees'),
    fetchList<DrawerOption>('/drawers'),
    fetchList<BankAccountOption>('/bank-accounts'),
    fetchList<VaultOption>('/vaults'),
  ]);

  return (
    <>
      <PageHeader title="إضافة سلفة" description="سجل سلفة نقدية للموظف واربطها بفترة الراتب حتى تخصم مرة واحدة عند إنشاء الراتب." />
      {employeesResult.error ? <p className="notice">{employeesResult.error}</p> : null}
      {drawersResult.error ? <p className="notice">{drawersResult.error}</p> : null}
      <EmployeeAdvanceForm
        employees={employeesResult.data}
        drawers={drawersResult.data}
        bankAccounts={bankAccountsResult.data}
        vaults={vaultsResult.data}
        initialEmployeeId={params.employee_id}
      />
    </>
  );
}
