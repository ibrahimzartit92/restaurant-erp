'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';
import type { BankAccountOption, DrawerOption, EmployeeAdvanceSummary, EmployeeSummary, VaultOption } from '../lib/types';
import { MonthSelect, YearSelect } from './month-year-selects';

export function EmployeeAdvanceForm({
  employees,
  drawers = [],
  bankAccounts = [],
  vaults = [],
  initialAdvance,
  initialEmployeeId,
}: Readonly<{
  employees: EmployeeSummary[];
  drawers?: DrawerOption[];
  bankAccounts?: BankAccountOption[];
  vaults?: VaultOption[];
  initialAdvance?: EmployeeAdvanceSummary | null;
  initialEmployeeId?: string;
}>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const today = new Date();
  const defaultPayrollMonth = today.getMonth() + 1;
  const defaultPayrollYear = today.getFullYear();

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
      bankAccountId: String(formData.get('bankAccountId') ?? '') || null,
      vaultId: String(formData.get('vaultId') ?? '') || null,
      payrollMonth: Number(formData.get('payrollMonth') ?? 0) || null,
      payrollYear: Number(formData.get('payrollYear') ?? 0) || null,
      notes: String(formData.get('notes') ?? '') || null,
    };
    const sourceCount = [payload.drawerId, payload.bankAccountId, payload.vaultId].filter(Boolean).length;

    if (sourceCount !== 1) {
      setMessage('اختر مصدر دفع واحد فقط للسلفة: درج أو حساب بنكي أو خزنة.');
      setIsSaving(false);
      return;
    }

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
            <option value="">غير مستخدم</option>
            {drawers.map((drawer) => (
              <option key={drawer.id} value={drawer.id}>
                {drawer.name} - {drawer.branch?.name ?? 'بدون فرع'}
              </option>
            ))}
          </select>
        </label>
        <label>
          الحساب البنكي
          <select defaultValue={initialAdvance?.bankAccountId ?? ''} name="bankAccountId">
            <option value="">غير مستخدم</option>
            {bankAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          الخزنة
          <select defaultValue={initialAdvance?.vaultId ?? ''} name="vaultId">
            <option value="">غير مستخدمة</option>
            {vaults.map((vault) => (
              <option key={vault.id} value={vault.id}>
                {vault.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          شهر الراتب
          <MonthSelect defaultValue={initialAdvance?.payrollMonth ?? defaultPayrollMonth} emptyLabel="اختر الشهر" name="payrollMonth" required />
        </label>
        <label>
          سنة الراتب
          <YearSelect defaultValue={initialAdvance?.payrollYear ?? defaultPayrollYear} emptyLabel="اختر السنة" name="payrollYear" required />
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
