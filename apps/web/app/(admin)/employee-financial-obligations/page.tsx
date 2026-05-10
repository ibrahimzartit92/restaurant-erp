import Link from 'next/link';
import { fetchList, buildQuery, getMoneyFormatter } from '../../lib/api';
import type {
  BankAccountOption,
  BranchOption,
  DrawerOption,
  EmployeeFinancialObligationSummary,
  EmployeeSummary,
  VaultOption,
} from '../../lib/types';
import { DataColumn, DataTable } from '../../components/data-table';
import { EmployeeObligationsActions } from '../../components/employee-obligations-actions';
import { PageHeader } from '../../components/page-header';

const typeLabels: Record<string, string> = {
  advance: 'سلفة',
  debt: 'دين',
  financial_penalty: 'غرامة مالية',
};

const statusLabels: Record<string, string> = {
  active: 'نشط',
  partially_recovered: 'محصل جزئيًا',
  settled: 'مسدد',
  cancelled: 'ملغى',
};

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
  const [obligationsResult, employeesResult, branchesResult, drawersResult, bankAccountsResult, vaultsResult, formatMoney] =
    await Promise.all([
      fetchList<EmployeeFinancialObligationSummary>(`/employee-financial-obligations${query}`),
      fetchList<EmployeeSummary>('/employees'),
      fetchList<BranchOption>('/branches'),
      fetchList<DrawerOption>('/drawers'),
      fetchList<BankAccountOption>('/bank-accounts'),
      fetchList<VaultOption>('/vaults'),
      getMoneyFormatter(),
    ]);

  const totals = obligationsResult.data.reduce(
    (summary, row) => ({
      original: summary.original + Number(row.originalAmount ?? 0),
      recovered: summary.recovered + Number(row.recoveredAmount ?? 0),
      remaining: summary.remaining + Number(row.remainingAmount ?? 0),
    }),
    { original: 0, recovered: 0, remaining: 0 },
  );

  const columns: DataColumn<EmployeeFinancialObligationSummary>[] = [
    { key: 'date', label: 'التاريخ', render: (row) => row.date },
    { key: 'employee', label: 'الموظف', render: (row) => row.employee?.fullName ?? '-' },
    { key: 'type', label: 'النوع', render: (row) => <span className={`payroll-status ${row.obligationType === 'debt' ? 'danger' : row.obligationType === 'advance' ? 'warning' : 'info'}`}>{typeLabels[row.obligationType] ?? row.obligationType}</span> },
    { key: 'status', label: 'الحالة', render: (row) => statusLabels[row.status] ?? row.status },
    { key: 'original', label: 'الأصلي', render: (row) => formatMoney(row.originalAmount) },
    { key: 'recovered', label: 'المحصل', render: (row) => formatMoney(row.recoveredAmount) },
    { key: 'remaining', label: 'المتبقي', render: (row) => formatMoney(row.remainingAmount) },
  ];

  const exportQuery = query ? `${query}&` : '?';

  return (
    <>
      <PageHeader
        title="Employee Financial Obligations"
        description="متابعة موحدة للسلف والديون والغرامات المالية وربطها بالرواتب والتحصيلات."
      />

      <form className="filter-bar auto-apply-filter" action="/employee-financial-obligations">
        <select defaultValue={params.employee_id ?? ''} name="employee_id">
          <option value="">كل الموظفين</option>
          {employeesResult.data.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
        </select>
        <select defaultValue={params.branch_id ?? ''} name="branch_id">
          <option value="">كل الفروع</option>
          {branchesResult.data.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </select>
        <select defaultValue={params.obligation_type ?? ''} name="obligation_type">
          <option value="">كل الأنواع</option>
          <option value="advance">السلف</option>
          <option value="debt">الديون</option>
          <option value="financial_penalty">الغرامات المالية</option>
        </select>
        <select defaultValue={params.status ?? ''} name="status">
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="partially_recovered">محصل جزئيًا</option>
          <option value="settled">مسدد</option>
          <option value="cancelled">ملغى</option>
        </select>
        <input defaultValue={params.date_from ?? ''} name="date_from" type="date" />
        <input defaultValue={params.date_to ?? ''} name="date_to" type="date" />
        <button type="submit">تصفية</button>
        <Link className="secondary-button" href="/employee-financial-obligations">إعادة ضبط</Link>
      </form>

      <div className="payroll-amount-grid">
        <span className="payroll-amount"><small>إجمالي الالتزامات</small><strong>{formatMoney(totals.original)}</strong></span>
        <span className="payroll-amount"><small>المحصل</small><strong>{formatMoney(totals.recovered)}</strong></span>
        <span className="payroll-amount danger"><small>المتبقي</small><strong>{formatMoney(totals.remaining)}</strong></span>
      </div>

      <div className="form-actions">
        <Link className="secondary-button" href={`/api/employee-financial-obligations/export${exportQuery}format=pdf`}>تصدير PDF</Link>
        <Link className="secondary-button" href={`/api/employee-financial-obligations/export${exportQuery}format=excel`}>تصدير Excel</Link>
      </div>

      {obligationsResult.error ? <p className="notice danger">{obligationsResult.error}</p> : null}
      <DataTable
        columns={columns}
        rows={obligationsResult.data}
        emptyTitle="لا توجد التزامات"
        emptyText="ستظهر السلف والديون والغرامات المالية هنا حسب الفلاتر المختارة."
      />

      <EmployeeObligationsActions
        employees={employeesResult.data}
        drawers={drawersResult.data}
        bankAccounts={bankAccountsResult.data}
        vaults={vaultsResult.data}
        obligations={obligationsResult.data}
      />
    </>
  );
}
