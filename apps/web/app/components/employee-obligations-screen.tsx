'use client';

import { startTransition, useMemo, useState } from 'react';
import { fetchClientJson, submitJson } from '../lib/client-api';
import type {
  BankAccountOption,
  DrawerOption,
  EmployeeFinancialObligationSummary,
  EmployeeSummary,
  VaultOption,
} from '../lib/types';
import { ActionToast } from './action-toast';
import { DataColumn, DataTable } from './data-table';
import { ModalDialog } from './modal-dialog';
import { StatusBadge } from './status-badge';

const typeLabels: Record<string, string> = {
  advance: 'سلفة',
  debt: 'دين',
  financial_penalty: 'غرامة مالية',
};

const statusLabels: Record<string, string> = {
  active: 'غير مسدد',
  partially_recovered: 'مسدد جزئيًا',
  settled: 'مسدد',
  cancelled: 'ملغى',
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function statusTone(status: string) {
  if (status === 'settled') return 'success';
  if (status === 'partially_recovered') return 'warning';
  if (status === 'active') return 'danger';
  return 'muted';
}

export function EmployeeObligationsScreen({
  initialRows,
  query,
  employees,
  drawers,
  bankAccounts,
  vaults,
}: Readonly<{
  initialRows: EmployeeFinancialObligationSummary[];
  query: string;
  employees: EmployeeSummary[];
  drawers: DrawerOption[];
  bankAccounts: BankAccountOption[];
  vaults: VaultOption[];
}>) {
  const [rows, setRows] = useState(initialRows);
  const [toast, setToast] = useState<{ tone: 'success' | 'danger'; message: string | null }>({
    tone: 'success',
    message: null,
  });
  const [isDebtOpen, setIsDebtOpen] = useState(false);
  const [isRepaymentOpen, setIsRepaymentOpen] = useState(false);
  const [isDebtSaving, setIsDebtSaving] = useState(false);
  const [isRepaymentSaving, setIsRepaymentSaving] = useState(false);

  function formatMoney(value: number | string | null | undefined) {
    return new Intl.NumberFormat('ar', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value ?? 0));
  }

  const activeObligations = rows.filter((item) => Number(item.remainingAmount ?? 0) > 0 && item.status !== 'cancelled');
  const totals = useMemo(
    () =>
      rows.reduce(
        (summary, row) => ({
          original: summary.original + Number(row.originalAmount ?? 0),
          recovered: summary.recovered + Number(row.recoveredAmount ?? 0),
          remaining: summary.remaining + Number(row.remainingAmount ?? 0),
        }),
        { original: 0, recovered: 0, remaining: 0 },
      ),
    [rows],
  );

  const columns: DataColumn<EmployeeFinancialObligationSummary>[] = [
    { key: 'date', label: 'التاريخ', render: (row) => row.date },
    { key: 'employee', label: 'الموظف', render: (row) => row.employee?.fullName ?? '-' },
    {
      key: 'type',
      label: 'النوع',
      render: (row) => <StatusBadge value={typeLabels[row.obligationType] ?? row.obligationType} className="info" />,
    },
    {
      key: 'status',
      label: 'الحالة',
      render: (row) => <StatusBadge value={statusLabels[row.status] ?? row.status} className={statusTone(row.status)} />,
    },
    { key: 'original', label: 'الأصلي', render: (row) => formatMoney(row.originalAmount) },
    { key: 'recovered', label: 'المحصل', render: (row) => formatMoney(row.recoveredAmount) },
    { key: 'remaining', label: 'المتبقي', render: (row) => formatMoney(row.remainingAmount) },
  ];

  async function refreshRows() {
    const next = await fetchClientJson<EmployeeFinancialObligationSummary[]>(`/employee-financial-obligations${query}`);
    startTransition(() => setRows(next));
  }

  async function handleDebtSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setToast({ tone: 'success', message: null });
    setIsDebtSaving(true);
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
      await refreshRows();
      event.currentTarget.reset();
      setIsDebtOpen(false);
      setToast({ tone: 'success', message: 'تم إضافة الدين وتحديث الجدول بنجاح.' });
    } catch (error) {
      setToast({ tone: 'danger', message: error instanceof Error ? error.message : 'تعذر حفظ الدين.' });
    } finally {
      setIsDebtSaving(false);
    }
  }

  async function handleRepaymentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setToast({ tone: 'success', message: null });
    setIsRepaymentSaving(true);
    const formData = new FormData(event.currentTarget);
    const selected = activeObligations.find((item) => item.id === String(formData.get('obligationId') ?? ''));
    if (!selected) {
      setToast({ tone: 'danger', message: 'اختر التزامًا قائمًا أولًا.' });
      setIsRepaymentSaving(false);
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
      await refreshRows();
      event.currentTarget.reset();
      setIsRepaymentOpen(false);
      setToast({ tone: 'success', message: 'تم تسجيل التحصيل وتحديث الجدول بنجاح.' });
    } catch (error) {
      setToast({ tone: 'danger', message: error instanceof Error ? error.message : 'تعذر تسجيل التحصيل.' });
    } finally {
      setIsRepaymentSaving(false);
    }
  }

  return (
    <section className="compact-stack">
      <ActionToast message={toast.message} tone={toast.tone} />

      <div className="payroll-amount-grid">
        <span className="payroll-amount"><small>إجمالي الالتزامات</small><strong>{formatMoney(totals.original)}</strong></span>
        <span className="payroll-amount"><small>المحصل</small><strong>{formatMoney(totals.recovered)}</strong></span>
        <span className="payroll-amount danger"><small>المتبقي</small><strong>{formatMoney(totals.remaining)}</strong></span>
      </div>

      <div className="compact-actions-bar">
        <button className="primary-button compact" onClick={() => setIsDebtOpen(true)} type="button">إضافة دين</button>
        <button className="secondary-button compact" onClick={() => setIsRepaymentOpen(true)} type="button">تسجيل تحصيل</button>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        emptyTitle="لا توجد التزامات"
        emptyText="ستظهر السلف والديون والغرامات المالية هنا حسب الفلاتر المختارة."
      />

      <ModalDialog onClose={() => !isDebtSaving && setIsDebtOpen(false)} open={isDebtOpen} title="إضافة دين موظف" width="860px">
        <form className="inline-form-grid" onSubmit={handleDebtSubmit}>
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
          <label style={{ gridColumn: '1 / -1' }}>
            ملاحظات
            <textarea name="notes" rows={2} />
          </label>
          <div className="compact-actions-bar" style={{ gridColumn: '1 / -1' }}>
            <button className="secondary-button compact" onClick={() => setIsDebtOpen(false)} type="button">إلغاء</button>
            <button disabled={isDebtSaving} type="submit">{isDebtSaving ? 'جارٍ الحفظ...' : 'حفظ الدين'}</button>
          </div>
        </form>
      </ModalDialog>

      <ModalDialog onClose={() => !isRepaymentSaving && setIsRepaymentOpen(false)} open={isRepaymentOpen} title="تسجيل تحصيل التزام" width="860px">
        <form className="inline-form-grid" onSubmit={handleRepaymentSubmit}>
          <label>
            الالتزام
            <select name="obligationId" required>
              <option value="">اختر الالتزام</option>
              {activeObligations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.employee.fullName} - {typeLabels[item.obligationType] ?? item.obligationType} - {formatMoney(item.remainingAmount)}
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
          <label style={{ gridColumn: '1 / -1' }}>
            ملاحظات
            <textarea name="notes" rows={2} />
          </label>
          <div className="compact-actions-bar" style={{ gridColumn: '1 / -1' }}>
            <button className="secondary-button compact" onClick={() => setIsRepaymentOpen(false)} type="button">إلغاء</button>
            <button disabled={isRepaymentSaving} type="submit">{isRepaymentSaving ? 'جارٍ التسجيل...' : 'تسجيل التحصيل'}</button>
          </div>
        </form>
      </ModalDialog>
    </section>
  );
}
