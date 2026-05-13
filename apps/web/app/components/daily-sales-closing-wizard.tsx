'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { fetchClientJson, submitJson } from '../lib/client-api';
import type { BankAccountOption, BranchOption, DailySalesClosingSummary, DrawerOption, VaultOption } from '../lib/types';

const steps = ['الفرع والتاريخ', 'المصروفات', 'مبيعات البنك', 'تسوية النقد', 'تحويل الخزنة', 'الملخص النهائي'];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(value?: number | string | null) {
  return new Intl.NumberFormat('ar', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value ?? 0));
}

function statusLabel(status?: 'draft' | 'finalized' | 'cancelled' | null) {
  if (status === 'finalized') return 'نهائي';
  if (status === 'cancelled') return 'ملغى';
  return 'مسودة';
}

type DraftData = {
  deliverySales?: {
    enabled?: boolean;
    fromDate?: string;
    toDate?: string;
    amount?: number;
    bankAccountId?: string;
  };
  websiteSales?: {
    enabled?: boolean;
    fromDate?: string;
    toDate?: string;
    cashAmount?: number;
    bankAmount?: number;
    drawerId?: string;
    bankAccountId?: string;
  };
  inStoreCardSales?: {
    enabled?: boolean;
    amount?: number;
    bankAccountId?: string;
  };
  cashReconciliation?: {
    handedCashAmount?: number;
  };
  vaultTransfer?: {
    enabled?: boolean;
    amount?: number;
    vaultId?: string;
  };
  notes?: string | null;
};

type SummaryLine = {
  id: string;
  description: string;
  amount: number;
};

export function DailySalesClosingWizard({
  branches,
  drawers,
  bankAccounts,
  vaults,
  initialClosing,
}: Readonly<{
  branches: BranchOption[];
  drawers: DrawerOption[];
  bankAccounts: BankAccountOption[];
  vaults: VaultOption[];
  initialClosing?: DailySalesClosingSummary | null;
}>) {
  const router = useRouter();
  const [closing, setClosing] = useState<DailySalesClosingSummary | null>(initialClosing ?? null);
  const [step, setStep] = useState(initialClosing?.currentStep ?? 1);
  const [branchId, setBranchId] = useState(initialClosing?.branchId ?? '');
  const [closingDate, setClosingDate] = useState(initialClosing?.closingDate ?? today());
  const [drawerId, setDrawerId] = useState(initialClosing?.drawerId ?? '');
  const [bankAccountId, setBankAccountId] = useState(initialClosing?.bankAccountId ?? '');
  const [draftData, setDraftData] = useState<DraftData>((initialClosing?.draftData as DraftData | null) ?? {});
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const readOnly = closing?.status === 'finalized' || closing?.status === 'cancelled';
  const summary = closing?.summaryValues;
  const selectedBranch = branches.find((branch) => branch.id === branchId);
  const deliverySales = draftData.deliverySales ?? {};
  const websiteSales = draftData.websiteSales ?? {};
  const inStoreCardSales = draftData.inStoreCardSales ?? {};
  const cashReconciliation = draftData.cashReconciliation ?? {};
  const vaultTransfer = draftData.vaultTransfer ?? {};

  useEffect(() => {
    if (!branchId || initialClosing) return;
    fetchClientJson<{ drawerId: string | null; bankAccountId: string | null }>(`/daily-sales/closings/defaults?branch_id=${branchId}`)
      .then((defaults) => {
        setDrawerId((current) => current || defaults.drawerId || '');
        setBankAccountId((current) => current || defaults.bankAccountId || '');
      })
      .catch(() => undefined);
  }, [branchId, initialClosing]);

  const autosavePayload = useMemo(
    () => ({
      branchId,
      closingDate,
      drawerId: drawerId || null,
      bankAccountId: bankAccountId || null,
      currentStep: step,
      draftData,
      notes: String(draftData.notes ?? '') || null,
    }),
    [bankAccountId, branchId, closingDate, drawerId, draftData, step],
  );

  useEffect(() => {
    if (!branchId || !closingDate || readOnly) return;
    const handle = setTimeout(() => {
      submitJson<DailySalesClosingSummary>('/daily-sales/closings/draft', 'POST', autosavePayload)
        .then((saved) => {
          setClosing(saved);
          if (!initialClosing) window.history.replaceState(null, '', `/daily-sales/${saved.id}/edit`);
        })
        .catch((error) => setMessage(error instanceof Error ? error.message : 'تعذر حفظ المسودة.'));
    }, 500);
    return () => clearTimeout(handle);
  }, [autosavePayload, branchId, closingDate, initialClosing, readOnly]);

  useEffect(() => {
    if (!closing?.id || readOnly) return;
    const closingId = closing.id;
    function refreshClosing() {
      fetchClientJson<DailySalesClosingSummary>(`/daily-sales/${closingId}`).then(setClosing).catch(() => undefined);
    }
    window.addEventListener('focus', refreshClosing);
    return () => window.removeEventListener('focus', refreshClosing);
  }, [closing?.id, readOnly]);

  function updateDraft(section: keyof DraftData, value: Record<string, unknown>) {
    setDraftData((current) => {
      const currentSection = (current[section] ?? {}) as Record<string, unknown>;
      return { ...current, [section]: { ...currentSection, ...value } };
    });
  }

  async function finish() {
    if (!closing?.id) {
      setMessage('احفظ بيانات الفرع والتاريخ أولًا.');
      return;
    }
    setIsSaving(true);
    setMessage(null);
    try {
      const saved = await submitJson<DailySalesClosingSummary>(`/daily-sales/closings/${closing.id}/finalize`, 'POST', {});
      setClosing(saved);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر إنهاء الإقفال.');
    } finally {
      setIsSaving(false);
    }
  }

  async function cancelWithReversal() {
    if (!closing?.id) return;
    const saved = await submitJson<DailySalesClosingSummary>(`/daily-sales/closings/${closing.id}/cancel?reverse_financial_effect=true`, 'POST', {});
    setClosing(saved);
    router.refresh();
  }

  async function deleteDraft() {
    if (!closing?.id || closing.status !== 'draft') return;
    if (!confirm('سيتم حذف مسودة الإقفال وكل البيانات المحفوظة تلقائيًا. هل تريد المتابعة؟')) return;
    setIsSaving(true);
    setMessage(null);
    try {
      await submitJson(`/daily-sales/closings/${closing.id}`, 'DELETE', {});
      router.push('/daily-sales');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حذف المسودة.');
    } finally {
      setIsSaving(false);
    }
  }

  function renderSummaryTable(title: string, rows: SummaryLine[] | undefined, total: number | undefined) {
    return (
      <div className="table-wrap compact-table">
        <strong>{title}</strong>
        <table>
          <thead>
            <tr>
              <th>البيان</th>
              <th>المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).length > 0 ? (
              rows?.map((row) => (
                <tr key={row.id}>
                  <td>{row.description}</td>
                  <td>{money(row.amount)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2}>لا توجد حركات لهذا اليوم.</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <th>الإجمالي</th>
              <th>{money(total)}</th>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  }

  return (
    <div className="closing-wizard-shell">
      <main className="closing-wizard-main">
        {message ? <p className="notice danger">{message}</p> : null}
        <nav className="wizard-progress" aria-label="خطوات الإقفال">
          {steps.map((label, index) => {
            const number = index + 1;
            return (
              <button className={number === step ? 'active' : number < step ? 'done' : ''} key={label} onClick={() => setStep(number)} type="button">
                <span>{number}</span>
                {label}
              </button>
            );
          })}
        </nav>

        <section className="form-panel closing-step-panel">
          {step === 1 ? (
            <>
              <h3>الفرع والتاريخ</h3>
              <div className="form-grid">
                <label>
                  الفرع
                  <select disabled={readOnly} value={branchId} onChange={(event) => setBranchId(event.target.value)} required>
                    <option value="">اختر الفرع</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  تاريخ الإقفال
                  <input disabled={readOnly} type="date" value={closingDate} onChange={(event) => setClosingDate(event.target.value)} />
                </label>
                <label>
                  الدرج الافتراضي
                  <select disabled={readOnly} value={drawerId} onChange={(event) => setDrawerId(event.target.value)}>
                    <option value="">بدون</option>
                    {drawers.map((drawer) => (
                      <option key={drawer.id} value={drawer.id}>
                        {drawer.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  الحساب البنكي
                  <select disabled={readOnly} value={bankAccountId} onChange={(event) => setBankAccountId(event.target.value)}>
                    <option value="">بدون</option>
                    {bankAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <h3>مصروفات اليوم</h3>
              <div className="payroll-amount-grid">
                <span className="payroll-amount">
                  <small>إجمالي المصروفات</small>
                  <strong>{money(summary?.expensesAmount)}</strong>
                </span>
                <span className="payroll-amount">
                  <small>مصروفات الدرج</small>
                  <strong>{money(summary?.drawerPaidExpensesAmount)}</strong>
                </span>
                <span className="payroll-amount">
                  <small>مصروفات البنك</small>
                  <strong>{money(summary?.bankPaidExpensesAmount)}</strong>
                </span>
                <span className="payroll-amount">
                  <small>مشتريات الدرج</small>
                  <strong>{money(summary?.cashPurchasesFromDrawer)}</strong>
                </span>
                <span className="payroll-amount">
                  <small>مشتريات البنك</small>
                  <strong>{money(summary?.bankPaidPurchasesAmount)}</strong>
                </span>
                <span className="payroll-amount muted">
                  <small>الفرع</small>
                  <strong>{selectedBranch?.name ?? '-'}</strong>
                </span>
              </div>
              <div className="form-grid">
                {renderSummaryTable('المصروفات المدفوعة من الدرج', summary?.drawerPaidExpenses, summary?.drawerPaidExpensesAmount)}
                {renderSummaryTable('المصروفات المدفوعة من البنك', summary?.bankPaidExpenses, summary?.bankPaidExpensesAmount)}
                {renderSummaryTable('المشتريات المدفوعة من الدرج', summary?.drawerPaidPurchases, summary?.cashPurchasesFromDrawer)}
                {renderSummaryTable('المشتريات المدفوعة من البنك', summary?.bankPaidPurchases, summary?.bankPaidPurchasesAmount)}
              </div>
              <div className="form-actions">
                <Link className="primary-button" href={`/expenses/new?branch_id=${branchId}&expense_date=${closingDate}`} target="_blank">
                  إضافة مصروف سريع
                </Link>
                <Link className="secondary-button" href={`/expenses?branch_id=${branchId}&date_from=${closingDate}&date_to=${closingDate}`}>
                  عرض مصروفات اليوم
                </Link>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <h3>المبيعات البنكية</h3>
              <div className="form-grid">
                <label>
                  مبلغ مبيعات داخل الفرع البنكية
                  <input
                    disabled={readOnly}
                    type="number"
                    min="0"
                    step="0.01"
                    value={inStoreCardSales.amount ?? 0}
                    onChange={(event) => updateDraft('inStoreCardSales', { amount: Number(event.target.value) })}
                  />
                </label>
                <label>
                  الحساب البنكي
                  <select
                    disabled={readOnly}
                    value={inStoreCardSales.bankAccountId ?? bankAccountId}
                    onChange={(event) => updateDraft('inStoreCardSales', { bankAccountId: event.target.value })}
                  >
                    <option value="">اختر الحساب البنكي</option>
                    {bankAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="payroll-amount-grid">
                <span className="payroll-amount">
                  <small>مبيعات داخل الفرع البنكية</small>
                  <strong>{money(summary?.inStoreCardSalesAmount)}</strong>
                </span>
                <span className="payroll-amount">
                  <small>مبيعات التوصيل</small>
                  <strong>{money(summary?.deliverySalesAmount)}</strong>
                </span>
                <span className="payroll-amount">
                  <small>مبيعات الموقع بنكيًا</small>
                  <strong>{money(summary?.websiteBankSalesAmount)}</strong>
                </span>
                <span className="payroll-amount">
                  <small>تحصيلات الجملة البنكية</small>
                  <strong>{money(summary?.wholesaleBankCollections)}</strong>
                </span>
                <span className="payroll-amount success">
                  <small>المبيعات البنكية التشغيلية</small>
                  <strong>{money(summary?.normalBankSalesAmount)}</strong>
                </span>
              </div>

              <label className="checkbox-field">
                <input disabled={readOnly} checked={Boolean(deliverySales.enabled)} onChange={(event) => updateDraft('deliverySales', { enabled: event.target.checked })} type="checkbox" />
                تفعيل مبيعات التوصيل
              </label>
              {deliverySales.enabled ? (
                <div className="form-grid">
                  <label>
                    من تاريخ
                    <input disabled={readOnly} type="date" value={deliverySales.fromDate ?? closingDate} onChange={(event) => updateDraft('deliverySales', { fromDate: event.target.value })} />
                  </label>
                  <label>
                    إلى تاريخ
                    <input disabled={readOnly} type="date" value={deliverySales.toDate ?? closingDate} onChange={(event) => updateDraft('deliverySales', { toDate: event.target.value })} />
                  </label>
                  <label>
                    المبلغ
                    <input disabled={readOnly} type="number" min="0" step="0.01" value={deliverySales.amount ?? 0} onChange={(event) => updateDraft('deliverySales', { amount: Number(event.target.value) })} />
                  </label>
                  <label>
                    الحساب البنكي
                    <select disabled={readOnly} value={deliverySales.bankAccountId ?? bankAccountId} onChange={(event) => updateDraft('deliverySales', { bankAccountId: event.target.value })}>
                      {bankAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}

              <label className="checkbox-field">
                <input disabled={readOnly} checked={Boolean(websiteSales.enabled)} onChange={(event) => updateDraft('websiteSales', { enabled: event.target.checked })} type="checkbox" />
                تفعيل مبيعات الموقع
              </label>
              {websiteSales.enabled ? (
                <div className="form-grid">
                  <label>
                    من تاريخ
                    <input disabled={readOnly} type="date" value={websiteSales.fromDate ?? closingDate} onChange={(event) => updateDraft('websiteSales', { fromDate: event.target.value })} />
                  </label>
                  <label>
                    إلى تاريخ
                    <input disabled={readOnly} type="date" value={websiteSales.toDate ?? closingDate} onChange={(event) => updateDraft('websiteSales', { toDate: event.target.value })} />
                  </label>
                  <label>
                    نقدي
                    <input disabled={readOnly} type="number" min="0" step="0.01" value={websiteSales.cashAmount ?? 0} onChange={(event) => updateDraft('websiteSales', { cashAmount: Number(event.target.value) })} />
                  </label>
                  <label>
                    بنكي
                    <input disabled={readOnly} type="number" min="0" step="0.01" value={websiteSales.bankAmount ?? 0} onChange={(event) => updateDraft('websiteSales', { bankAmount: Number(event.target.value) })} />
                  </label>
                  <label>
                    الدرج
                    <select disabled={readOnly} value={websiteSales.drawerId ?? drawerId} onChange={(event) => updateDraft('websiteSales', { drawerId: event.target.value })}>
                      {drawers.map((drawer) => (
                        <option key={drawer.id} value={drawer.id}>
                          {drawer.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    الحساب البنكي
                    <select disabled={readOnly} value={websiteSales.bankAccountId ?? bankAccountId} onChange={(event) => updateDraft('websiteSales', { bankAccountId: event.target.value })}>
                      {bankAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}
            </>
          ) : null}

          {step === 4 ? (
            <>
              <h3>تسوية النقد</h3>
              <p className="notice">
                إذا وُجدت تحصيلات جملة نقدية داخل الدرج فهي جزء من المبلغ المستلم من المحاسب فعلًا، وتظهر هنا كبند مستقل ليتم خصمها عند اشتقاق صافي
                المبيعات اليومية التشغيلية.
              </p>
              <div className="form-grid">
                <label>
                  المبلغ المستلم من المحاسب
                  <input
                    disabled={readOnly}
                    type="number"
                    min="0"
                    step="0.01"
                    value={cashReconciliation.handedCashAmount ?? 0}
                    onChange={(event) => updateDraft('cashReconciliation', { handedCashAmount: Number(event.target.value) })}
                  />
                </label>
              </div>
              <div className="payroll-amount-grid">
                <span className="payroll-amount">
                  <small>المبلغ المستلم من المحاسب</small>
                  <strong>{money(summary?.handedCashAmount)}</strong>
                </span>
                <span className="payroll-amount">
                  <small>تحصيلات الجملة النقدية ضمن النقد المستلم</small>
                  <strong>{money(summary?.wholesaleCashCollections)}</strong>
                </span>
                <span className="payroll-amount">
                  <small>مصروفات الدرج</small>
                  <strong>{money(summary?.cashExpensesFromDrawer)}</strong>
                </span>
                <span className="payroll-amount">
                  <small>مصروفات البنك</small>
                  <strong>{money(summary?.bankPaidExpensesAmount)}</strong>
                </span>
                <span className="payroll-amount">
                  <small>مشتريات الدرج</small>
                  <strong>{money(summary?.cashPurchasesFromDrawer)}</strong>
                </span>
                <span className="payroll-amount">
                  <small>مشتريات البنك</small>
                  <strong>{money(summary?.bankPaidPurchasesAmount)}</strong>
                </span>
                <span className="payroll-amount">
                  <small>المبيعات البنكية التشغيلية</small>
                  <strong>{money(summary?.normalBankSalesAmount)}</strong>
                </span>
                <span className="payroll-amount">
                  <small>تحصيلات الجملة البنكية</small>
                  <strong>{money(summary?.wholesaleBankCollections)}</strong>
                </span>
                <span className="payroll-amount success">
                  <small>صافي المبيعات اليومية التشغيلية</small>
                  <strong>{money(summary?.normalDailySalesAmount)}</strong>
                </span>
              </div>
            </>
          ) : null}

          {step === 5 ? (
            <>
              <h3>تحويل الخزنة</h3>
              <label className="checkbox-field">
                <input
                  disabled={readOnly}
                  checked={Boolean(vaultTransfer.enabled)}
                  onChange={(event) => updateDraft('vaultTransfer', { enabled: event.target.checked, amount: cashReconciliation.handedCashAmount ?? 0 })}
                  type="checkbox"
                />
                تحويل النقد إلى خزنة
              </label>
              {vaultTransfer.enabled ? (
                <div className="form-grid">
                  <label>
                    مبلغ التحويل
                    <input disabled={readOnly} type="number" min="0" step="0.01" value={vaultTransfer.amount ?? 0} onChange={(event) => updateDraft('vaultTransfer', { amount: Number(event.target.value) })} />
                  </label>
                  <label>
                    الخزنة
                    <select disabled={readOnly} value={vaultTransfer.vaultId ?? ''} onChange={(event) => updateDraft('vaultTransfer', { vaultId: event.target.value })}>
                      <option value="">اختر الخزنة</option>
                      {vaults.map((vault) => (
                        <option key={vault.id} value={vault.id}>
                          {vault.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}
            </>
          ) : null}

          {step === 6 ? (
            <>
              <h3>الملخص النهائي</h3>
              <div className="table-wrap compact-table">
                <table className="compact-readable-table">
                  <tbody>
                    <tr><th>الفرع</th><td>{selectedBranch?.name ?? '-'}</td></tr>
                    <tr><th>تاريخ الإقفال</th><td>{closingDate}</td></tr>
                    <tr><th>المبلغ المستلم من المحاسب</th><td>{money(summary?.handedCashAmount)}</td></tr>
                    <tr><th>المبيعات البنكية التشغيلية</th><td>{money(summary?.normalBankSalesAmount)}</td></tr>
                    <tr><th>مصروفات الدرج</th><td>{money(summary?.drawerPaidExpensesAmount)}</td></tr>
                    <tr><th>مصروفات البنك</th><td>{money(summary?.bankPaidExpensesAmount)}</td></tr>
                    <tr><th>مشتريات الدرج</th><td>{money(summary?.cashPurchasesFromDrawer)}</td></tr>
                    <tr><th>مشتريات البنك</th><td>{money(summary?.bankPaidPurchasesAmount)}</td></tr>
                    <tr><th>مبيعات داخل الفرع البنكية</th><td>{money(summary?.inStoreCardSalesAmount)}</td></tr>
                    <tr><th>مبيعات التوصيل</th><td>{money(summary?.deliverySalesAmount)}</td></tr>
                    <tr><th>مبيعات الموقع نقدًا</th><td>{money(summary?.websiteCashSales)}</td></tr>
                    <tr><th>مبيعات الموقع بنكيًا</th><td>{money(summary?.websiteBankSalesAmount)}</td></tr>
                    <tr><th>تحصيلات الجملة النقدية</th><td>{money(summary?.wholesaleCashCollections)}</td></tr>
                    <tr><th>تحصيلات الجملة البنكية</th><td>{money(summary?.wholesaleBankCollections)}</td></tr>
                    <tr><th>إجمالي تحصيلات الجملة</th><td>{money(summary?.wholesaleCollectionsTotal)}</td></tr>
                    <tr><th>صافي المبيعات اليومية التشغيلية</th><td>{money(summary?.normalDailySalesAmount)}</td></tr>
                    <tr><th>إجمالي الحركة اليومية</th><td>{money(summary?.totalDailyActivityAmount)}</td></tr>
                    <tr><th>تحويل الخزنة</th><td>{money(summary?.vaultTransferAmount)}</td></tr>
                  </tbody>
                </table>
              </div>
              {!readOnly ? (
                <button disabled={isSaving || !closing?.id} onClick={finish} type="button">
                  {isSaving ? 'جارِ الإنهاء...' : 'إنهاء الإقفال'}
                </button>
              ) : null}
              {closing?.status === 'finalized' ? (
                <button className="danger-button" onClick={cancelWithReversal} type="button">
                  إلغاء مع عكس الأثر المالي
                </button>
              ) : null}
              {closing?.status === 'draft' ? (
                <button className="danger-button" disabled={isSaving} onClick={deleteDraft} type="button">
                  حذف المسودة
                </button>
              ) : null}
            </>
          ) : null}
        </section>

        <div className="form-actions">
          <button disabled={step <= 1} onClick={() => setStep((current) => Math.max(1, current - 1))} type="button">
            السابق
          </button>
          <button disabled={step >= 6} onClick={() => setStep((current) => Math.min(6, current + 1))} type="button">
            التالي
          </button>
        </div>
      </main>

      <aside className="closing-sticky-summary">
        <strong>ملخص الإقفال</strong>
        <span>
          {selectedBranch?.name ?? 'اختر الفرع'} - {closingDate}
        </span>
        <dl>
          <div><dt>الحالة</dt><dd>{statusLabel(closing?.status)}</dd></div>
          <div><dt>المبلغ المستلم</dt><dd>{money(summary?.handedCashAmount)}</dd></div>
          <div><dt>المبيعات البنكية التشغيلية</dt><dd>{money(summary?.normalBankSalesAmount)}</dd></div>
          <div><dt>مصروفات الدرج</dt><dd>{money(summary?.drawerPaidExpensesAmount)}</dd></div>
          <div><dt>مصروفات البنك</dt><dd>{money(summary?.bankPaidExpensesAmount)}</dd></div>
          <div><dt>مشتريات الدرج</dt><dd>{money(summary?.cashPurchasesFromDrawer)}</dd></div>
          <div><dt>مشتريات البنك</dt><dd>{money(summary?.bankPaidPurchasesAmount)}</dd></div>
          <div><dt>تحصيلات الجملة النقدية</dt><dd>{money(summary?.wholesaleCashCollections)}</dd></div>
          <div><dt>تحصيلات الجملة البنكية</dt><dd>{money(summary?.wholesaleBankCollections)}</dd></div>
          <div><dt>صافي المبيعات اليومية</dt><dd>{money(summary?.normalDailySalesAmount)}</dd></div>
          <div><dt>إجمالي تحصيلات الجملة</dt><dd>{money(summary?.wholesaleCollectionsTotal)}</dd></div>
          <div><dt>تحويل الخزنة</dt><dd>{money(summary?.vaultTransferAmount)}</dd></div>
        </dl>
        {closing?.id ? (
          <Link className="secondary-button" href={`/api/daily-sales/closings/${closing.id}/export?format=pdf`}>
            تصدير PDF
          </Link>
        ) : null}
        {closing?.status === 'draft' ? (
          <button className="danger-button" disabled={isSaving} onClick={deleteDraft} type="button">
            حذف المسودة
          </button>
        ) : null}
      </aside>
    </div>
  );
}
