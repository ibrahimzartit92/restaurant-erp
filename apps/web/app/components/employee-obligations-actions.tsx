'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';
import type {
  BankAccountOption,
  DrawerOption,
  EmployeeFinancialObligationSummary,
  EmployeeSummary,
  VaultOption,
} from '../lib/types';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function EmployeeObligationsActions({
  employees,
  drawers,
  bankAccounts,
  vaults,
  obligations,
}: Readonly<{
  employees: EmployeeSummary[];
  drawers: DrawerOption[];
  bankAccounts: BankAccountOption[];
  vaults: VaultOption[];
  obligations: EmployeeFinancialObligationSummary[];
}>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const activeObligations = obligations.filter((item) => Number(item.remainingAmount ?? 0) > 0 && item.status !== 'cancelled');

  async function handleDebtSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const payload = {
      employeeId: String(formData.get('employeeId') ?? ''),
      debtDate: String(formData.get('debtDate') ?? today()),
      amount: Number(formData.get('amount') ?? 0),
      repaymentMode: String(formData.get('repaymentMode') ?? 'manual'),
      installmentAmount: Number(formData.get('installmentAmount') ?? 0),
      drawerId: String(formData.get('drawerId') ?? '') || null,
      bankAccountId: String(formData.get('bankAccountId') ?? '') || null,
      vaultId: String(formData.get('vaultId') ?? '') || null,
      notes: String(formData.get('notes') ?? '') || null,
    };
    try {
      await submitJson('/employee-financial-obligations/debts', 'POST', payload);
      setMessage('تم حفظ الدين وتسجيل الحركة المالية.');
      event.currentTarget.reset();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ الدين.');
    }
  }

  async function handleRepaymentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const selected = activeObligations.find((item) => item.id === String(formData.get('obligationId') ?? ''));
    if (!selected) {
      setMessage('اختر التزامًا قائمًا أولًا.');
      return;
    }
    const payload = {
      employeeId: selected.employeeId,
      obligationKind: selected.obligationType,
      obligationId: selected.id,
      repaymentDate: String(formData.get('repaymentDate') ?? today()),
      amount: Number(formData.get('amount') ?? 0),
      drawerId: String(formData.get('drawerId') ?? '') || null,
      bankAccountId: String(formData.get('bankAccountId') ?? '') || null,
      vaultId: String(formData.get('vaultId') ?? '') || null,
      referenceNumber: String(formData.get('referenceNumber') ?? '') || null,
      notes: String(formData.get('notes') ?? '') || null,
    };
    try {
      await submitJson('/employee-financial-obligations/repayments', 'POST', payload);
      setMessage('تم تسجيل التحصيل وتحديث رصيد الالتزام.');
      event.currentTarget.reset();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر تسجيل التحصيل.');
    }
  }

  return (
    <section className="stacked-sections">
      {message ? <p className="notice">{message}</p> : null}
      <details className="form-panel">
        <summary>إضافة دين موظف</summary>
        <form className="form-grid" onSubmit={handleDebtSubmit}>
          <label>
            الموظف
            <select name="employeeId" required>
              <option value="">اختر الموظف</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.fullName}</option>
              ))}
            </select>
          </label>
          <label>التاريخ<input defaultValue={today()} name="debtDate" required type="date" /></label>
          <label>المبلغ<input min="0.01" name="amount" required step="0.01" type="number" /></label>
          <label>
            طريقة السداد
            <select name="repaymentMode" defaultValue="manual">
              <option value="manual">سداد حر</option>
              <option value="installment">أقساط ثابتة</option>
            </select>
          </label>
          <label>قيمة القسط<input min="0" name="installmentAmount" step="0.01" type="number" /></label>
          <label>
            من درج
            <select name="drawerId"><option value="">بدون</option>{drawers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          </label>
          <label>
            من خزنة
            <select name="vaultId"><option value="">بدون</option>{vaults.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          </label>
          <label>
            من حساب بنكي
            <select name="bankAccountId"><option value="">بدون</option>{bankAccounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          </label>
          <label className="full-row">ملاحظات<textarea name="notes" rows={2} /></label>
          <button type="submit">حفظ الدين</button>
        </form>
      </details>
      <details className="form-panel">
        <summary>تسجيل تحصيل التزام</summary>
        <form className="form-grid" onSubmit={handleRepaymentSubmit}>
          <label>
            الالتزام
            <select name="obligationId" required>
              <option value="">اختر الالتزام</option>
              {activeObligations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.employee.fullName} - {item.obligationType} - {Number(item.remainingAmount).toFixed(2)}
                </option>
              ))}
            </select>
          </label>
          <label>تاريخ التحصيل<input defaultValue={today()} name="repaymentDate" required type="date" /></label>
          <label>المبلغ<input min="0.01" name="amount" required step="0.01" type="number" /></label>
          <label>
            إلى درج
            <select name="drawerId"><option value="">بدون</option>{drawers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          </label>
          <label>
            إلى خزنة
            <select name="vaultId"><option value="">بدون</option>{vaults.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          </label>
          <label>
            إلى حساب بنكي
            <select name="bankAccountId"><option value="">بدون</option>{bankAccounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          </label>
          <label>رقم المرجع<input name="referenceNumber" /></label>
          <label className="full-row">ملاحظات<textarea name="notes" rows={2} /></label>
          <button type="submit">تسجيل التحصيل</button>
        </form>
      </details>
    </section>
  );
}
