import Link from 'next/link';
import { EmployeeObligationsScreen } from '../../components/employee-obligations-screen';
import { PageHeader } from '../../components/page-header';
import { buildQuery, fetchList } from '../../lib/api';
import type {
  BankAccountOption,
  BranchOption,
  DrawerOption,
  EmployeeFinancialObligationSummary,
  EmployeeSummary,
  VaultOption,
} from '../../lib/types';

export default async function EmployeeFinancialObligationsPage({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | undefined>> }>) {
  const params = (await searchParams) ?? {};
  const query = buildQuery({
    employee_id: params.employee_id,
    branch_id: params.branch_id,
    obligation_type: params.obligation_type,
    status: params.status,
    date_from: params.date_from,
    date_to: params.date_to,
    debt_repayment_mode: params.debt_repayment_mode,
  });

  const [obligationsResult, employeesResult, branchesResult, drawersResult, bankAccountsResult, vaultsResult] =
    await Promise.all([
      fetchList<EmployeeFinancialObligationSummary>(`/employee-financial-obligations${query}`),
      fetchList<EmployeeSummary>('/employees'),
      fetchList<BranchOption>('/branches'),
      fetchList<DrawerOption>('/drawers'),
      fetchList<BankAccountOption>('/bank-accounts'),
      fetchList<VaultOption>('/vaults'),
    ]);

  const exportQuery = query ? `${query}&` : '?';

  return (
    <>
      <PageHeader
        title="الالتزامات المالية للموظفين"
        description="متابعة موحدة للسلف والديون والغرامات المالية وربطها بالتحصيلات بشكل سريع وواضح."
      />

      <form action="/employee-financial-obligations" className="filters compact-filters compact-panel compact-filter-bar">
        <label>
          الموظف
          <select defaultValue={params.employee_id ?? ''} name="employee_id">
            <option value="">كل الموظفين</option>
            {employeesResult.data.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.fullName}
              </option>
            ))}
          </select>
        </label>
        <label>
          الفرع
          <select defaultValue={params.branch_id ?? ''} name="branch_id">
            <option value="">كل الفروع</option>
            {branchesResult.data.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          النوع
          <select defaultValue={params.obligation_type ?? ''} name="obligation_type">
            <option value="">كل الأنواع</option>
            <option value="advance">السلف</option>
            <option value="debt">الديون</option>
            <option value="financial_penalty">الغرامات المالية</option>
          </select>
        </label>
        <label>
          الحالة
          <select defaultValue={params.status ?? ''} name="status">
            <option value="">كل الحالات</option>
            <option value="active">غير مسدد</option>
            <option value="partially_recovered">مسدد جزئيًا</option>
            <option value="settled">مسدد</option>
            <option value="cancelled">ملغى</option>
          </select>
        </label>
        <label>
          من تاريخ
          <input defaultValue={params.date_from ?? ''} name="date_from" type="date" />
        </label>
        <label>
          إلى تاريخ
          <input defaultValue={params.date_to ?? ''} name="date_to" type="date" />
        </label>
        <button className="primary-button compact" type="submit">
          تصفية
        </button>
        <Link className="secondary-button compact" href="/employee-financial-obligations">
          إعادة ضبط
        </Link>
      </form>

      <div className="compact-actions-bar">
        <Link className="secondary-button compact" href={`/api/employee-financial-obligations/export${exportQuery}format=pdf`}>
          تصدير PDF
        </Link>
        <Link className="secondary-button compact" href={`/api/employee-financial-obligations/export${exportQuery}format=excel`}>
          تصدير Excel
        </Link>
      </div>

      {obligationsResult.error ? <p className="notice danger">{obligationsResult.error}</p> : null}

      <EmployeeObligationsScreen
        bankAccounts={bankAccountsResult.data}
        drawers={drawersResult.data}
        employees={employeesResult.data}
        initialRows={obligationsResult.data}
        query={query}
        vaults={vaultsResult.data}
      />
    </>
  );
}
