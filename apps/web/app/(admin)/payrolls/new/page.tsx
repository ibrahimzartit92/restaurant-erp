import { PageHeader } from '../../../components/page-header';
import { PayrollForm } from '../../../components/payroll-form';
import { fetchList } from '../../../lib/api';
import type { BankAccountOption, DrawerOption, EmployeeSummary, VaultOption } from '../../../lib/types';

export default async function NewPayrollPage() {
  const [employeesResult, drawersResult, bankAccountsResult, vaultsResult] = await Promise.all([
    fetchList<EmployeeSummary>('/employees'),
    fetchList<DrawerOption>('/drawers'),
    fetchList<BankAccountOption>('/bank-accounts'),
    fetchList<VaultOption>('/vaults'),
  ]);

  return (
    <>
      <PageHeader title="إضافة راتب" description="سجل راتبا شهريا مع إمكانية دفعه من الدرج أو البنك أو الخزنة." />
      {employeesResult.error ? <p className="notice">{employeesResult.error}</p> : null}
      {drawersResult.error ?? bankAccountsResult.error ?? vaultsResult.error ? (
        <p className="notice">{drawersResult.error ?? bankAccountsResult.error ?? vaultsResult.error}</p>
      ) : null}
      <PayrollForm
        employees={employeesResult.data}
        drawers={drawersResult.data}
        bankAccounts={bankAccountsResult.data}
        vaults={vaultsResult.data}
      />
    </>
  );
}
