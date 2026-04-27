'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';
import type { EmployeePenaltySummary, EmployeeSummary } from '../lib/types';

export function EmployeePenaltyForm({
  employees,
  initialPenalty,
}: Readonly<{
  employees: EmployeeSummary[];
  initialPenalty?: EmployeePenaltySummary | null;
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
      penaltyDate: String(formData.get('penaltyDate') ?? ''),
      amount: Number(formData.get('amount') ?? 0),
      reason: String(formData.get('reason') ?? '') || null,
      payrollMonth: Number(formData.get('payrollMonth') ?? 0) || null,
      payrollYear: Number(formData.get('payrollYear') ?? 0) || null,
      notes: String(formData.get('notes') ?? '') || null,
    };

    try {
      await submitJson(initialPenalty ? `/employee-penalties/${initialPenalty.id}` : '/employee-penalties', initialPenalty ? 'PATCH' : 'POST', payload);
      router.push('/employee-penalties');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ العقوبة.');
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
          <select defaultValue={initialPenalty?.employeeId ?? ''} name="employeeId" required>
            <option value="">اختر الموظف</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.fullName}
              </option>
            ))}
          </select>
        </label>
        <label>
          تاريخ العقوبة
          <input defaultValue={initialPenalty?.penaltyDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)} name="penaltyDate" required type="date" />
        </label>
        <label>
          المبلغ
          <input defaultValue={initialPenalty?.amount ?? ''} min="0.01" name="amount" required step="0.01" type="number" />
        </label>
        <label>
          السبب
          <input defaultValue={initialPenalty?.reason ?? ''} maxLength={500} name="reason" />
        </label>
        <label>
          شهر الراتب
          <input defaultValue={initialPenalty?.payrollMonth ?? ''} max="12" min="1" name="payrollMonth" type="number" />
        </label>
        <label>
          سنة الراتب
          <input defaultValue={initialPenalty?.payrollYear ?? ''} max="2100" min="2000" name="payrollYear" type="number" />
        </label>
      </div>
      <label>
        ملاحظات
        <textarea defaultValue={initialPenalty?.notes ?? ''} name="notes" rows={4} />
      </label>
      <div className="form-actions">
        <button disabled={isSaving} type="submit">{isSaving ? 'جار الحفظ...' : 'حفظ العقوبة'}</button>
      </div>
    </form>
  );
}
