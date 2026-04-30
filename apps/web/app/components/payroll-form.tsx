'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { submitJson } from '../lib/client-api';
import type { BankAccountOption, DrawerOption, EmployeeSummary, PayrollSummary, VaultOption } from '../lib/types';
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
  allowancesAmount: number;
  advancesDeductionAmount: number;
  penaltiesDeductionAmount: number;
  otherDeductionAmount: number;
}) {
  return (
    values.baseSalary +
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
}: Readonly<{
  employees: EmployeeSummary[];
  drawers: DrawerOption[];
  bankAccounts: BankAccountOption[];
  vaults: VaultOption[];
  initialPayroll?: PayrollSummary | null;
}>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [salaryValues, setSalaryValues] = useState({
    baseSalary: String(initialPayroll?.baseSalary ?? ''),
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
  const netSalary = Number(
    computeNetSalary({
      baseSalary: asNumber(salaryValues.baseSalary),
      allowancesAmount: asNumber(salaryValues.allowancesAmount),
      advancesDeductionAmount: asNumber(salaryValues.advancesDeductionAmount),
      penaltiesDeductionAmount: asNumber(salaryValues.penaltiesDeductionAmount),
      otherDeductionAmount: asNumber(salaryValues.otherDeductionAmount),
    }).toFixed(2),
  );
  const paidTotal = paymentRowsTotal(paymentRows);

  function updateSalaryField(field: keyof typeof salaryValues, value: string) {
    setSalaryValues((current) => ({ ...current, [field]: value }));
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
      baseSalary: asNumber(salaryValues.baseSalary),
      allowancesAmount: asNumber(salaryValues.allowancesAmount),
      advancesDeductionAmount: asNumber(salaryValues.advancesDeductionAmount),
      penaltiesDeductionAmount: asNumber(salaryValues.penaltiesDeductionAmount),
      otherDeductionAmount: asNumber(salaryValues.otherDeductionAmount),
      netSalary,
      payments: activePaymentRows(paymentRows).map(toBackendPayment),
      notes: String(formData.get('notes') ?? '') || null,
    };

    try {
      await submitJson(initialPayroll ? `/payrolls/${initialPayroll.id}` : '/payrolls', initialPayroll ? 'PATCH' : 'POST', payload);
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
      {message ? <p className="notice danger">{message}</p> : null}
      <div className="form-grid">
        <label>
          الموظف
          <select defaultValue={initialPayroll?.employeeId ?? ''} name="employeeId" required>
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
          <input defaultValue={initialPayroll?.payrollMonth ?? ''} max="12" min="1" name="payrollMonth" required type="number" />
        </label>
        <label>
          السنة
          <input defaultValue={initialPayroll?.payrollYear ?? ''} max="2100" min="2000" name="payrollYear" required type="number" />
        </label>
        <label>
          الراتب الأساسي
          <input value={salaryValues.baseSalary} onChange={(event) => updateSalaryField('baseSalary', event.target.value)} min="0" required step="0.01" type="number" />
        </label>
        <label>
          البدلات
          <input value={salaryValues.allowancesAmount} onChange={(event) => updateSalaryField('allowancesAmount', event.target.value)} min="0" step="0.01" type="number" />
        </label>
        <label>
          خصم السلف
          <input value={salaryValues.advancesDeductionAmount} onChange={(event) => updateSalaryField('advancesDeductionAmount', event.target.value)} min="0" step="0.01" type="number" />
        </label>
        <label>
          خصم العقوبات
          <input value={salaryValues.penaltiesDeductionAmount} onChange={(event) => updateSalaryField('penaltiesDeductionAmount', event.target.value)} min="0" step="0.01" type="number" />
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

      <p className="field-hint">صافي الراتب يتم احتسابه تلقائيا عند الحفظ: الأساسي + البدلات - جميع الخصومات.</p>

      <PaymentSourceRows
        rows={paymentRows}
        onChange={setPaymentRows}
        drawers={drawers}
        bankAccounts={bankAccounts}
        vaults={vaults}
        title="دفعات الراتب"
        description="يمكن دفع الراتب كاملا أو جزئيا من درج، حساب بنكي، أو خزنة."
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
          {isSaving ? 'جار الحفظ...' : 'حفظ الراتب'}
        </button>
      </div>
    </form>
  );
}
