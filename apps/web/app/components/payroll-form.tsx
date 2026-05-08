'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { submitJson } from '../lib/client-api';
import { currentPayrollPeriod } from '../lib/payroll';
import type { BankAccountOption, DrawerOption, EmployeeSummary, PayrollSummary, VaultOption } from '../lib/types';
import { MonthSelect, YearSelect } from './month-year-selects';
import {
  PaymentSourceRows,
  activePaymentRows,
  createPaymentRow,
  paymentRowsTotal,
  toBackendPayment,
  validatePaymentRows,
  type UnifiedPaymentRow,
} from './payment-source-rows';

function computeNetSalary(values: {
  baseSalary: number;
  extraHoursAmount: number;
  allowancesAmount: number;
  advancesDeductionAmount: number;
  penaltiesDeductionAmount: number;
  otherDeductionAmount: number;
}) {
  return (
    values.baseSalary +
    values.extraHoursAmount +
    values.allowancesAmount -
    values.advancesDeductionAmount -
    values.penaltiesDeductionAmount -
    values.otherDeductionAmount
  );
}

function asNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fromBackendPayrollPayment(row: NonNullable<PayrollSummary['paymentAllocations']>[number]): UnifiedPaymentRow {
  return {
    sourceType: row.paymentMethod === 'cash' ? 'drawer' : row.paymentMethod,
    drawerId: row.drawerId ?? '',
    bankAccountId: row.bankAccountId ?? '',
    vaultId: row.vaultId ?? '',
    amount: String(row.amount ?? ''),
    paymentDate: row.paymentDate ?? new Date().toISOString().slice(0, 10),
    referenceNumber: row.referenceNumber ?? '',
    notes: row.notes ?? '',
  };
}

export function PayrollForm({
  employees,
  drawers,
  bankAccounts,
  vaults,
  initialPayroll,
  initialEmployeeId,
  repeatMode = false,
  proposalMode = false,
}: Readonly<{
  employees: EmployeeSummary[];
  drawers: DrawerOption[];
  bankAccounts: BankAccountOption[];
  vaults: VaultOption[];
  initialPayroll?: PayrollSummary | null;
  initialEmployeeId?: string;
  repeatMode?: boolean;
  proposalMode?: boolean;
}>) {
  const router = useRouter();
  const defaultPeriod = useMemo(() => currentPayrollPeriod(), []);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const initialEmployee = employees.find((employee) => employee.id === (initialPayroll?.employeeId ?? initialEmployeeId));
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(initialPayroll?.employeeId ?? initialEmployeeId ?? '');
  const [salaryValues, setSalaryValues] = useState({
    payrollMode: String(initialPayroll?.payrollMode ?? initialEmployee?.payrollMode ?? 'fixed_monthly') as 'fixed_monthly' | 'hourly',
    baseSalary: String(initialPayroll?.baseSalary ?? initialEmployee?.baseMonthlySalary ?? ''),
    workHours: String(initialPayroll?.workHours ?? ''),
    hourlyRate: String(initialPayroll?.hourlyRate ?? initialEmployee?.hourlyRate ?? 0),
    extraHours: String(initialPayroll?.extraHours ?? 0),
    extraHourRate: String(initialPayroll?.extraHourRate ?? initialEmployee?.hourlyRate ?? 0),
    allowancesAmount: String(initialPayroll?.allowancesAmount ?? 0),
    advancesDeductionAmount: String(initialPayroll?.advancesDeductionAmount ?? 0),
    penaltiesDeductionAmount: String(initialPayroll?.penaltiesDeductionAmount ?? 0),
    otherDeductionAmount: String(initialPayroll?.otherDeductionAmount ?? 0),
  });
  const initialRows = useMemo(
    () =>
      initialPayroll?.paymentAllocations?.length
        ? initialPayroll.paymentAllocations.map(fromBackendPayrollPayment)
        : [createPaymentRow()],
    [initialPayroll],
  );
  const [paymentRows, setPaymentRows] = useState<UnifiedPaymentRow[]>(initialRows);
  const baseSalary =
    salaryValues.payrollMode === 'hourly'
      ? asNumber(salaryValues.workHours) * asNumber(salaryValues.hourlyRate)
      : asNumber(salaryValues.baseSalary);
  const extraHoursAmount =
    salaryValues.payrollMode === 'fixed_monthly'
      ? asNumber(salaryValues.extraHours) * asNumber(salaryValues.extraHourRate)
      : 0;
  const netSalary = Number(
    computeNetSalary({
      baseSalary,
      extraHoursAmount,
      allowancesAmount: asNumber(salaryValues.allowancesAmount),
      advancesDeductionAmount: asNumber(salaryValues.advancesDeductionAmount),
      penaltiesDeductionAmount: asNumber(salaryValues.penaltiesDeductionAmount),
      otherDeductionAmount: asNumber(salaryValues.otherDeductionAmount),
    }).toFixed(2),
  );
  const paidTotal = paymentRowsTotal(paymentRows);

  function updateSalaryField(field: keyof typeof salaryValues, value: string) {
    setSalaryValues((current) => ({ ...current, [field]: value }) as typeof current);
  }

  function handleEmployeeChange(employeeId: string) {
    setSelectedEmployeeId(employeeId);
    const employee = employees.find((item) => item.id === employeeId);
    if (!initialPayroll && employee) {
      setSalaryValues((current) => ({
        ...current,
        payrollMode: employee.payrollMode ?? 'fixed_monthly',
        baseSalary: String(employee.baseMonthlySalary ?? 0),
        workHours: '',
        hourlyRate: String(employee.hourlyRate ?? 0),
        extraHours: '0',
        extraHourRate: String(employee.hourlyRate ?? 0),
        advancesDeductionAmount: '0',
        penaltiesDeductionAmount: '0',
      }));
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const validationMessage = paidTotal > 0 ? validatePaymentRows(paymentRows) : null;

    if (validationMessage) {
      setMessage(validationMessage);
      setIsSaving(false);
      return;
    }

    if (paidTotal > netSalary) {
      setMessage('مجموع دفعات الراتب لا يمكن أن يتجاوز صافي الراتب.');
      setIsSaving(false);
      return;
    }

    const payload = {
      employeeId: String(formData.get('employeeId') ?? ''),
      payrollMonth: Number(formData.get('payrollMonth') ?? 0),
      payrollYear: Number(formData.get('payrollYear') ?? 0),
      payrollMode: salaryValues.payrollMode,
      baseSalary,
      workHours: asNumber(salaryValues.workHours),
      hourlyRate: asNumber(salaryValues.hourlyRate),
      extraHours: asNumber(salaryValues.extraHours),
      extraHourRate: asNumber(salaryValues.extraHourRate),
      allowancesAmount: asNumber(salaryValues.allowancesAmount),
      advancesDeductionAmount: asNumber(salaryValues.advancesDeductionAmount),
      penaltiesDeductionAmount: asNumber(salaryValues.penaltiesDeductionAmount),
      otherDeductionAmount: asNumber(salaryValues.otherDeductionAmount),
      netSalary,
      payments: activePaymentRows(paymentRows).map(toBackendPayment),
      notes: String(formData.get('notes') ?? '') || null,
    };

    try {
      const isEditing = Boolean(initialPayroll && !repeatMode && !proposalMode);
      await submitJson(isEditing ? `/payrolls/${initialPayroll?.id}` : '/payrolls', isEditing ? 'PATCH' : 'POST', payload);
      router.push('/payrolls');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ الراتب.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel stacked-sections" onSubmit={handleSubmit}>
      {proposalMode ? (
        <p className="notice">هذا راتب مقترح للشهر المحدد. راجع القيم والخصومات ثم احفظه لاعتماد سجل الراتب.</p>
      ) : null}
      {message ? <p className="notice danger">{message}</p> : null}
      <div className="form-grid">
        <label>
          الموظف
          <select value={selectedEmployeeId} onChange={(event) => handleEmployeeChange(event.target.value)} name="employeeId" required>
            <option value="">اختر الموظف</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.fullName}
              </option>
            ))}
          </select>
        </label>
        <label>
          الشهر
          <MonthSelect defaultValue={initialPayroll?.payrollMonth ?? defaultPeriod.month} emptyLabel="اختر الشهر" name="payrollMonth" required />
        </label>
        <label>
          السنة
          <YearSelect defaultValue={initialPayroll?.payrollYear ?? defaultPeriod.year} emptyLabel="اختر السنة" name="payrollYear" required />
        </label>
        <label>
          نظام الراتب
          <select value={salaryValues.payrollMode} onChange={(event) => updateSalaryField('payrollMode', event.target.value)}>
            <option value="fixed_monthly">راتب شهري ثابت</option>
            <option value="hourly">بالساعة</option>
          </select>
        </label>
        {salaryValues.payrollMode === 'hourly' ? (
          <>
            <label>
              عدد الساعات
              <input value={salaryValues.workHours} onChange={(event) => updateSalaryField('workHours', event.target.value)} min="0" required step="0.01" type="number" />
            </label>
            <label>
              أجر الساعة
              <input value={salaryValues.hourlyRate} onChange={(event) => updateSalaryField('hourlyRate', event.target.value)} min="0" required step="0.01" type="number" />
            </label>
          </>
        ) : (
          <>
            <label>
              الراتب الأساسي
              <input value={salaryValues.baseSalary} onChange={(event) => updateSalaryField('baseSalary', event.target.value)} min="0" required step="0.01" type="number" />
            </label>
            <label>
              ساعات إضافية
              <input value={salaryValues.extraHours} onChange={(event) => updateSalaryField('extraHours', event.target.value)} min="0" step="0.01" type="number" />
            </label>
            <label>
              أجر الساعة الإضافية
              <input value={salaryValues.extraHourRate} onChange={(event) => updateSalaryField('extraHourRate', event.target.value)} min="0" step="0.01" type="number" />
            </label>
          </>
        )}
        <label>
          البدلات
          <input value={salaryValues.allowancesAmount} onChange={(event) => updateSalaryField('allowancesAmount', event.target.value)} min="0" step="0.01" type="number" />
        </label>
        <label>
          خصم السلف (تلقائي)
          <input readOnly value={salaryValues.advancesDeductionAmount} min="0" step="0.01" type="number" />
        </label>
        <label>
          خصم العقوبات (تلقائي)
          <input readOnly value={salaryValues.penaltiesDeductionAmount} min="0" step="0.01" type="number" />
        </label>
        <label>
          خصومات أخرى
          <input value={salaryValues.otherDeductionAmount} onChange={(event) => updateSalaryField('otherDeductionAmount', event.target.value)} min="0" step="0.01" type="number" />
        </label>
        <label>
          صافي الراتب
          <input disabled value={netSalary.toFixed(2)} />
        </label>
      </div>

      <p className="field-hint">
        صافي الراتب يتم احتسابه تلقائيًا عند الحفظ. السلف والعقوبات المرتبطة بنفس الشهر والسنة تُخصم مرة واحدة فقط.
      </p>

      <PaymentSourceRows
        rows={paymentRows}
        onChange={setPaymentRows}
        drawers={drawers}
        bankAccounts={bankAccounts}
        vaults={vaults}
        title="دفعات الراتب"
        description="يمكن دفع الراتب كاملًا أو جزئيًا من درج أو حساب بنكي أو خزنة."
        totalAmount={netSalary}
        showRemaining
        allowSettleRemaining
      />

      <label>
        ملاحظات
        <textarea defaultValue={initialPayroll?.notes ?? ''} name="notes" rows={4} />
      </label>
      <div className="form-actions">
        <button disabled={isSaving} type="submit">
          {isSaving ? 'جار الحفظ...' : proposalMode ? 'اعتماد وحفظ الراتب' : 'حفظ الراتب'}
        </button>
      </div>
    </form>
  );
}
