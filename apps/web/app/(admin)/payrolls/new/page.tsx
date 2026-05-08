import { PageHeader } from '../../../components/page-header';
import { PayrollForm } from '../../../components/payroll-form';
import { buildQuery, fetchList, fetchOne } from '../../../lib/api';
import { currentPayrollPeriod, sumEmployeeAdvances, sumEmployeePenalties } from '../../../lib/payroll';
import type {
  BankAccountOption,
  DrawerOption,
  EmployeeAdvanceSummary,
  EmployeePenaltySummary,
  EmployeeSummary,
  PayrollSummary,
  VaultOption,
} from '../../../lib/types';

function nextPayrollPeriod(payroll: PayrollSummary) {
  return {
    month: payroll.payrollMonth === 12 ? 1 : payroll.payrollMonth + 1,
    year: payroll.payrollMonth === 12 ? payroll.payrollYear + 1 : payroll.payrollYear,
  };
}

function buildPayrollProposal(
  employee: EmployeeSummary | undefined,
  month: number,
  year: number,
  advances: EmployeeAdvanceSummary[],
  penalties: EmployeePenaltySummary[],
): PayrollSummary | null {
  if (!employee) return null;

  const payrollMode = employee.payrollMode ?? 'fixed_monthly';
  const baseSalary = payrollMode === 'hourly' ? 0 : Number(employee.baseMonthlySalary ?? 0);
  const advancesDeductionAmount = sumEmployeeAdvances(advances);
  const penaltiesDeductionAmount = sumEmployeePenalties(penalties);
  const netSalary = baseSalary - advancesDeductionAmount - penaltiesDeductionAmount;

  return {
    id: '',
    employeeId: employee.id,
    employee,
    payrollMonth: month,
    payrollYear: year,
    baseSalary,
    payrollMode,
    workHours: payrollMode === 'hourly' ? 0 : 0,
    hourlyRate: Number(employee.hourlyRate ?? 0),
    extraHours: 0,
    extraHourRate: payrollMode === 'fixed_monthly' ? Number(employee.hourlyRate ?? 0) : 0,
    extraHoursAmount: 0,
    allowancesAmount: 0,
    advancesDeductionAmount,
    penaltiesDeductionAmount,
    otherDeductionAmount: 0,
    netSalary,
    paidAmount: 0,
    remainingAmount: netSalary,
    paymentStatus: 'unpaid',
    paymentAllocations: [],
    notes: null,
  };
}

export default async function NewPayrollPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const currentPeriod = currentPayrollPeriod();
  const requestedMonth = Number(params.payroll_month ?? currentPeriod.month);
  const requestedYear = Number(params.payroll_year ?? currentPeriod.year);
  const selectedEmployeeId = params.employee_id;

  const [employeesResult, drawersResult, bankAccountsResult, vaultsResult, repeatResult, advancesResult, penaltiesResult] =
    await Promise.all([
      fetchList<EmployeeSummary>('/employees'),
      fetchList<DrawerOption>('/drawers'),
      fetchList<BankAccountOption>('/bank-accounts'),
      fetchList<VaultOption>('/vaults'),
      params.repeat_from ? fetchOne<PayrollSummary>(`/payrolls/${params.repeat_from}`) : Promise.resolve({ data: null, error: null }),
      selectedEmployeeId
        ? fetchList<EmployeeAdvanceSummary>(
            `/employee-advances${buildQuery({
              employee_id: selectedEmployeeId,
              payroll_month: String(requestedMonth),
              payroll_year: String(requestedYear),
            })}`,
          )
        : Promise.resolve({ data: [], error: null }),
      selectedEmployeeId
        ? fetchList<EmployeePenaltySummary>(
            `/employee-penalties${buildQuery({
              employee_id: selectedEmployeeId,
              payroll_month: String(requestedMonth),
              payroll_year: String(requestedYear),
            })}`,
          )
        : Promise.resolve({ data: [], error: null }),
    ]);

  const repeatPeriod = repeatResult.data ? nextPayrollPeriod(repeatResult.data) : null;
  const repeatPayroll = repeatResult.data
    ? {
        ...repeatResult.data,
        id: '',
        payrollMonth: repeatPeriod!.month,
        payrollYear: repeatPeriod!.year,
        extraHours: 0,
        extraHoursAmount: 0,
        extraHourRate: repeatResult.data.employee?.hourlyRate ?? repeatResult.data.hourlyRate ?? 0,
        advancesDeductionAmount: 0,
        penaltiesDeductionAmount: 0,
        paymentAllocations: [],
        paidAmount: 0,
        remainingAmount: 0,
      }
    : null;
  const selectedEmployee = employeesResult.data.find((employee) => employee.id === selectedEmployeeId);
  const proposalPayroll =
    !repeatPayroll && selectedEmployeeId
      ? buildPayrollProposal(selectedEmployee, requestedMonth, requestedYear, advancesResult.data, penaltiesResult.data)
      : null;

  return (
    <>
      <PageHeader
        title="إضافة راتب"
        description="راجع الراتب المقترح للشهر المحدد ثم احفظه عند الاعتماد. لا يتم إنشاء سجل راتب نهائي قبل ضغط زر الحفظ."
      />
      {employeesResult.error ? <p className="notice">{employeesResult.error}</p> : null}
      {drawersResult.error ?? bankAccountsResult.error ?? vaultsResult.error ? (
        <p className="notice">{drawersResult.error ?? bankAccountsResult.error ?? vaultsResult.error}</p>
      ) : null}
      {advancesResult.error ?? penaltiesResult.error ? <p className="notice">{advancesResult.error ?? penaltiesResult.error}</p> : null}
      <PayrollForm
        employees={employeesResult.data}
        drawers={drawersResult.data}
        bankAccounts={bankAccountsResult.data}
        vaults={vaultsResult.data}
        initialEmployeeId={selectedEmployeeId}
        initialPayroll={repeatPayroll ?? proposalPayroll}
        repeatMode={Boolean(repeatPayroll)}
        proposalMode={Boolean(proposalPayroll)}
      />
    </>
  );
}
