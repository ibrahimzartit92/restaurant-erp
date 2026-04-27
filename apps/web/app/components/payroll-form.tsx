'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';
import type { EmployeeSummary, PayrollSummary } from '../lib/types';

function computeNetSalary(payload: {
  baseSalary: number;
  allowancesAmount: number;
  advancesDeductionAmount: number;
  penaltiesDeductionAmount: number;
  otherDeductionAmount: number;
}) {
  return (
    payload.baseSalary +
    payload.allowancesAmount -
    payload.advancesDeductionAmount -
    payload.penaltiesDeductionAmount -
    payload.otherDeductionAmount
  );
}

export function PayrollForm({
  employees,
  initialPayroll,
}: Readonly<{
  employees: EmployeeSummary[];
  initialPayroll?: PayrollSummary | null;
}>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      employeeId: String(formData.get('employeeId') ?? ''),
      payrollMonth: Number(formData.get('payrollMonth') ?? 0),
      payrollYear: Number(formData.get('payrollYear') ?? 0),
      baseSalary: Number(formData.get('baseSalary') ?? 0),
      allowancesAmount: Number(formData.get('allowancesAmount') ?? 0),
      advancesDeductionAmount: Number(formData.get('advancesDeductionAmount') ?? 0),
      penaltiesDeductionAmount: Number(formData.get('penaltiesDeductionAmount') ?? 0),
      otherDeductionAmount: Number(formData.get('otherDeductionAmount') ?? 0),
      notes: String(formData.get('notes') ?? '') || null,
    };

    try {
      await submitJson(
        initialPayroll ? `/payrolls/${initialPayroll.id}` : '/payrolls',
        initialPayroll ? 'PATCH' : 'POST',
        {
          ...payload,
          netSalary: Number(computeNetSalary(payload).toFixed(2)),
        },
      );
      router.push('/payroll');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ الراتب.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
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
          <input defaultValue={initialPayroll?.baseSalary ?? ''} min="0" name="baseSalary" required step="0.01" type="number" />
        </label>
        <label>
          البدلات
          <input defaultValue={initialPayroll?.allowancesAmount ?? 0} min="0" name="allowancesAmount" step="0.01" type="number" />
        </label>
        <label>
          خصم السلف
          <input defaultValue={initialPayroll?.advancesDeductionAmount ?? 0} min="0" name="advancesDeductionAmount" step="0.01" type="number" />
        </label>
        <label>
          خصم العقوبات
          <input defaultValue={initialPayroll?.penaltiesDeductionAmount ?? 0} min="0" name="penaltiesDeductionAmount" step="0.01" type="number" />
        </label>
        <label>
          خصومات أخرى
          <input defaultValue={initialPayroll?.otherDeductionAmount ?? 0} min="0" name="otherDeductionAmount" step="0.01" type="number" />
        </label>
      </div>

      <p className="field-hint">صافي الراتب يتم احتسابه تلقائيًا عند الحفظ: الأساسي + البدلات - جميع الخصومات.</p>

      <label>
        ملاحظات
        <textarea defaultValue={initialPayroll?.notes ?? ''} name="notes" rows={4} />
      </label>
      <div className="form-actions">
        <button disabled={isSaving} type="submit">{isSaving ? 'جار الحفظ...' : 'حفظ الراتب'}</button>
      </div>
    </form>
  );
}
