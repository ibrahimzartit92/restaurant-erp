'use client';

import { startTransition, useMemo, useState } from 'react';
import { fetchClientJson, submitJson } from '../lib/client-api';
import { displayLabel } from '../lib/display-labels';
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

function money(value: number | string | null | undefined) {
  return new Intl.NumberFormat('ar', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
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
      render: (row) => <StatusBadge value={typeLabels[row.obligationType] ?? displayLabel(row.obligationType)} className="info" />,
    },
    {
      key: 'status',
      label: 'الحالة',
      render: (row) => <StatusBadge value={statusLabels[row.status] ?? displayLabel(row.status)} className={statusTone(row.status)} />,
    },
    { key: 'original', label: 'الأصلي', render: (row) => money(row.originalAmount) },
    { key: 'recovered', label: 'المحصل', render: (row) => money(row.recoveredAmount) },
    { key: 'remaining', label: 'المتبقي', render: (row) => money(row.remainingAmount) },
  ];

  async function refreshRows() {
    const next = await fetchClientJson<EmployeeFinancialObligationSummary[]>(`/employee-financial-obligations${query}`);
    startTransition(() => setRows(next));
  }

  async function handleDebtSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setToast({ tone: 'success', message: null });
    setIsDebtSaving(true);
    const formData = new FormData(form);
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
      if (form.isConnected) form.reset();
      setIsDebtOpen(false);
      await refreshRows();
      setToast({ tone: 'success', message: 'تمت إضافة الدين وتحديث الجدول بنجاح.' });
    } catch (error) {
      setToast({ tone: 'danger', message: error instanceof Error ? error.message : 'تعذر حفظ الدين.' });
    } finally {
      setIsDebtSaving(false);
    }
  }

  async function handleRepaymentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setToast({ tone: 'success', message: null });
    setIsRepaymentSaving(true);
    const formData = new FormData(form);
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
      if (form.isConnected) form.reset();
      setIsRepaymentOpen(false);
      await refreshRows();
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
        <span className="payroll-amount">
          <small>إجمالي الالتزامات</small>
          <strong>{money(totals.original)}</strong>
        </span>
        <span className="payroll-amount">
          <small>المحصل</small>
          <strong>{money(totals.recovered)}</strong>
        </span>
        <span className="payroll-amount danger">
          <small>المتبقي</small>
          <strong>{money(totals.remaining)}</strong>
        </span>
      </div>

      <div className="compact-actions-bar">
        <button className="primary-button compact" onClick={() => setIsDebtOpen(true)} type="button">
          إضافة دين
        </button>
        <button className="secondary-button compact" onClick={() => setIsRepaymentOpen(true)} type="button">
          تسجيل تحصيل
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        emptyTitle="لا توجد التزامات"
        emptyText="ستظهر السلف والديون والغرامات المالية هنا حسب الفلاتر المختارة."
      />

      <ModalDialog onClose={() => !isDebtSaving && setIsDebtOpen(false)} open={isDebtOpen} title="إضافة دين موظف" width="920px">
        <form className="modal-form-grid" onSubmit={handleDebtSubmit}>
          <section className="modal-form-section full-span">
            <div className="modal-form-section-title">
              <strong>بيانات الدين</strong>
              <span>أدخل بيانات الالتزام بطريقة مختصرة وواضحة.</span>
            </div>
            <div className="modal-form-grid-inner three-columns">
              <label>
                الموظف
                <select name="employeeId" required>
                  <option value="">اختر الموظف</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                التاريخ
                <input defaultValue={today()} name="debtDate" required type="date" />
              </label>
              <label>
                المبلغ
                <input min="0.01" name="amount" required step="0.01" type="number" />
              </label>
              <label>
                طريقة السداد
                <select name="repaymentMode" defaultValue="manual">
                  <option value="manual">سداد حر</option>
                  <option value="installment">أقساط ثابتة</option>
                </select>
              </label>
              <label>
                قيمة القسط
                <input min="0" name="installmentAmount" step="0.01" type="number" />
              </label>
            </div>
          </section>

          <section className="modal-form-section full-span">
            <div className="modal-form-section-title">
              <strong>جهة الصرف</strong>
              <span>يمكن ترك الجهة فارغة عند عدم الحاجة لتسجيل مصدر تمويل مباشر.</span>
            </div>
            <div className="modal-form-grid-inner three-columns">
              <label>
                من درج
                <select name="drawerId">
                  <option value="">بدون</option>
                  {drawers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                من خزنة
                <select name="vaultId">
                  <option value="">بدون</option>
                  {vaults.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                من حساب بنكي
                <select name="bankAccountId">
                  <option value="">بدون</option>
                  {bankAccounts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <label className="full-span">
            ملاحظات
            <textarea name="notes" rows={3} />
          </label>

          <div className="modal-form-actions full-span">
            <button className="secondary-button compact" onClick={() => setIsDebtOpen(false)} type="button">
              إلغاء
            </button>
            <button disabled={isDebtSaving} type="submit">
              {isDebtSaving ? 'جارٍ الحفظ...' : 'حفظ الدين'}
            </button>
          </div>
        </form>
      </ModalDialog>

      <ModalDialog
        onClose={() => !isRepaymentSaving && setIsRepaymentOpen(false)}
        open={isRepaymentOpen}
        title="تسجيل تحصيل التزام"
        width="920px"
      >
        <form className="modal-form-grid" onSubmit={handleRepaymentSubmit}>
          <section className="modal-form-section full-span">
            <div className="modal-form-section-title">
              <strong>بيانات التحصيل</strong>
              <span>اختر الالتزام ثم سجل المبلغ والوجهة المالية.</span>
            </div>
            <div className="modal-form-grid-inner three-columns">
              <label className="full-span">
                الالتزام
                <select name="obligationId" required>
                  <option value="">اختر الالتزام</option>
                  {activeObligations.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.employee.fullName} - {typeLabels[item.obligationType] ?? item.obligationType} - {money(item.remainingAmount)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                تاريخ التحصيل
                <input defaultValue={today()} name="repaymentDate" required type="date" />
              </label>
              <label>
                المبلغ
                <input min="0.01" name="amount" required step="0.01" type="number" />
              </label>
              <label>
                رقم المرجع
                <input name="referenceNumber" />
              </label>
            </div>
          </section>

          <section className="modal-form-section full-span">
            <div className="modal-form-section-title">
              <strong>جهة الاستلام</strong>
              <span>اختر الدرج أو الخزنة أو الحساب البنكي الذي استلم قيمة التحصيل.</span>
            </div>
            <div className="modal-form-grid-inner three-columns">
              <label>
                إلى درج
                <select name="drawerId">
                  <option value="">بدون</option>
                  {drawers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                إلى خزنة
                <select name="vaultId">
                  <option value="">بدون</option>
                  {vaults.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                إلى حساب بنكي
                <select name="bankAccountId">
                  <option value="">بدون</option>
                  {bankAccounts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <label className="full-span">
            ملاحظات
            <textarea name="notes" rows={3} />
          </label>

          <div className="modal-form-actions full-span">
            <button className="secondary-button compact" onClick={() => setIsRepaymentOpen(false)} type="button">
              إلغاء
            </button>
            <button disabled={isRepaymentSaving} type="submit">
              {isRepaymentSaving ? 'جارٍ التسجيل...' : 'تسجيل التحصيل'}
            </button>
          </div>
        </form>
      </ModalDialog>
    </section>
  );
}
