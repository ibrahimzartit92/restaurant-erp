'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';
import type { DrawerOption, EmployeeAdvanceSummary, EmployeeSummary } from '../lib/types';

export function EmployeeAdvanceForm({
  employees,
  drawers = [],
  initialAdvance,
  initialEmployeeId,
}: Readonly<{
  employees: EmployeeSummary[];
  drawers?: DrawerOption[];
  initialAdvance?: EmployeeAdvanceSummary | null;
  initialEmployeeId?: string;
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
      advanceDate: String(formData.get('advanceDate') ?? ''),
      amount: Number(formData.get('amount') ?? 0),
      drawerId: String(formData.get('drawerId') ?? '') || null,
      payrollMonth: Number(formData.get('payrollMonth') ?? 0) || null,
      payrollYear: Number(formData.get('payrollYear') ?? 0) || null,
      notes: String(formData.get('notes') ?? '') || null,
    };

    try {
      await submitJson(initialAdvance ? `/employee-advances/${initialAdvance.id}` : '/employee-advances', initialAdvance ? 'PATCH' : 'POST', payload);
      router.push('/employee-advances');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ السلفة.');
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
          <select defaultValue={initialAdvance?.employeeId ?? initialEmployeeId ?? ''} name="employeeId" required>
            <option value="">اختر الموظف</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.fullName}
              </option>
            ))}
          </select>
        </label>
        <label>
          تاريخ السلفة
          <input defaultValue={initialAdvance?.advanceDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)} name="advanceDate" required type="date" />
        </label>
        <label>
          المبلغ
          <input defaultValue={initialAdvance?.amount ?? ''} min="0.01" name="amount" required step="0.01" type="number" />
        </label>
        <label>
          الدرج النقدي
          <select defaultValue={initialAdvance?.drawerId ?? ''} name="drawerId">
            <option value="">تلقائي حسب فرع الموظف أو بدون درج</option>
            {drawers.map((drawer) => (
              <option key={drawer.id} value={drawer.id}>
                {drawer.name} - {drawer.branch?.name ?? 'بدون فرع'}
              </option>
            ))}
          </select>
        </label>
        <label>
          شهر الراتب
          <input defaultValue={initialAdvance?.payrollMonth ?? ''} max="12" min="1" name="payrollMonth" type="number" />
        </label>
        <label>
          سنة الراتب
          <input defaultValue={initialAdvance?.payrollYear ?? ''} max="2100" min="2000" name="payrollYear" type="number" />
        </label>
      </div>
      <label>
        ملاحظات
        <textarea defaultValue={initialAdvance?.notes ?? ''} name="notes" rows={4} />
      </label>
      <div className="form-actions">
        <button disabled={isSaving} type="submit">{isSaving ? 'جار الحفظ...' : 'حفظ السلفة'}</button>
      </div>
    </form>
  );
}
