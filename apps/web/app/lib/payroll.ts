import type { EmployeeAdvanceSummary, EmployeePenaltySummary, PayrollSummary } from './types';

export const payrollStatusLabels: Record<NonNullable<PayrollSummary['paymentStatus']>, string> = {
  unpaid: 'غير مدفوع',
  partially_paid: 'مدفوع جزئيًا',
  paid: 'مدفوع بالكامل',
};

export const payrollStatusClass: Record<NonNullable<PayrollSummary['paymentStatus']>, string> = {
  unpaid: 'danger',
  partially_paid: 'info',
  paid: 'success',
};

export function currentPayrollPeriod() {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

export function payrollStatusLabel(status?: PayrollSummary['paymentStatus']) {
  return payrollStatusLabels[status ?? 'unpaid'];
}

export function payrollStatusTone(status?: PayrollSummary['paymentStatus']) {
  return payrollStatusClass[status ?? 'unpaid'];
}

export function moneyValue(value?: number | string | null) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function sumEmployeeAdvances(advances: EmployeeAdvanceSummary[], payrollId?: string) {
  return advances
    .filter((advance) => !advance.payrollRecordId || advance.payrollRecordId === payrollId)
    .reduce((sum, advance) => sum + moneyValue(advance.amount), 0);
}

export function sumEmployeePenalties(penalties: EmployeePenaltySummary[], payrollId?: string) {
  return penalties
    .filter((penalty) => !penalty.payrollRecordId || penalty.payrollRecordId === payrollId)
    .reduce((sum, penalty) => sum + moneyValue(penalty.amount), 0);
}

export function payrollGrossAmount(payroll: PayrollSummary) {
  return moneyValue(payroll.baseSalary) + moneyValue(payroll.extraHoursAmount) + moneyValue(payroll.allowancesAmount);
}
