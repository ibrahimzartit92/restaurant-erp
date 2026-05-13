'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { fetchClientJson, submitJson } from '../lib/client-api';
import type {
  BankAccountOption,
  BranchOption,
  DailySalesClosingSummary,
  DailySalesClosingSummaryLine,
  DrawerOption,
  VaultOption,
} from '../lib/types';
import { ModalDialog } from './modal-dialog';

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
  deliverySales?: { enabled?: boolean; fromDate?: string; toDate?: string; amount?: number; bankAccountId?: string };
  websiteSales?: { enabled?: boolean; fromDate?: string; toDate?: string; cashAmount?: number; bankAmount?: number; drawerId?: string; bankAccountId?: string };
  inStoreCardSales?: { enabled?: boolean; amount?: number; bankAccountId?: string };
  cashReconciliation?: { handedCashAmount?: number };
  vaultTransfer?: { enabled?: boolean; amount?: number; vaultId?: string };
  notes?: string | null;
};

type DetailState = {
  title: string;
  rows: DailySalesClosingSummaryLine[];
  total: number;
} | null;

function EquationRow({
  label,
  amount,
  sign = '+',
  onInspect,
  rows,
}: Readonly<{
  label: string;
  amount: number;
  sign?: '+' | '-' | '=';
  onInspect?: () => void;
  rows?: DailySalesClosingSummaryLine[];
}>) {
  const previewRows = (rows ?? []).slice(0, 3);
  const clickable = Boolean(onInspect);
  return (
    <div className={`closing-equation-row ${sign === '=' ? 'result' : ''}`}>
      <span className={`closing-equation-sign ${sign === '=' ? 'result' : ''}`}>{sign}</span>
      <div className="closing-equation-copy">
        <span>{label}</span>
        {clickable ? (
          <button className="closing-amount-button" onClick={onInspect} type="button">
            {money(amount)}
            <span className="closing-hover-card">
              <strong>{label}</strong>
              <small>{(rows ?? []).length} سجل</small>
              <ul>
                {previewRows.map((row) => (
                  <li key={row.id}>
                    <span>{row.description}</span>
                    <b>{money(row.amount)}</b>
                  </li>
                ))}
              </ul>
              <small>الإجمالي: {money(amount)}</small>
            </span>
          </button>
        ) : (
          <strong>{money(amount)}</strong>
        )}
      </div>
    </div>
  );
}

function SourceList({ title, items }: Readonly<{ title: string; items: Array<{ label: string; amount: number }> }>) {
  const visible = items.filter((item) => Number(item.amount ?? 0) > 0);
  if (!visible.length) return null;
  return (
    <div className="closing-source-list">
      <strong>{title}</strong>
      <ul>
        {visible.map((item) => (
          <li key={item.label}>
            <span>{item.label}</span>
            <b>{money(item.amount)}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

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
  const [detailState, setDetailState] = useState<DetailState>(null);
  const readOnly = closing?.status === 'finalized' || closing?.status === 'cancelled';
  const summary = closing?.summaryValues;
  const selectedBranch = branches.find((branch) => branch.id === branchId);
  const deliverySales = draftData.deliverySales ?? {};
  const websiteSales = draftData.websiteSales ?? {};
  const inStoreCardSales = draftData.inStoreCardSales ?? {};
  const cashReconciliation = draftData.cashReconciliation ?? {};
  const vaultTransfer = draftData.vaultTransfer ?? {};

  const netOperationalCashSales = useMemo(
    () =>
      Number(summary?.handedCashAmount ?? 0) -
      Number(summary?.wholesaleCashCollections ?? 0) +
      Number(summary?.drawerPaidExpensesAmount ?? 0) +
      Number(summary?.cashPurchasesFromDrawer ?? 0),
    [summary],
  );

  const totalBankMovement = Number(summary?.totalBankInflowsAmount ?? 0);
  const netOperationalBankSales = useMemo(
    () =>
      totalBankMovement -
      Number(summary?.wholesaleBankCollections ?? 0) +
      Number(summary?.bankPaidExpensesAmount ?? 0) +
      Number(summary?.bankPaidPurchasesAmount ?? 0),
    [summary, totalBankMovement],
  );

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

  function openDetails(title: string, rows: DailySalesClosingSummaryLine[] | undefined, total: number | undefined) {
    setDetailState({ title, rows: rows ?? [], total: Number(total ?? 0) });
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
                    {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
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
                    {drawers.map((drawer) => <option key={drawer.id} value={drawer.id}>{drawer.name}</option>)}
                  </select>
                </label>
                <label>
                  الحساب البنكي
                  <select disabled={readOnly} value={bankAccountId} onChange={(event) => setBankAccountId(event.target.value)}>
                    <option value="">بدون</option>
                    {bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                  </select>
                </label>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <h3>المصروفات والمشتريات</h3>
              <p className="field-hint">اعرض المجاميع سريعًا، حرّك المؤشر لمعاينة أول السجلات، واضغط على أي رقم لفتح التفاصيل الكاملة.</p>
              <div className="closing-mini-grid">
                <EquationRow label="مصروفات الدرج" amount={Number(summary?.drawerPaidExpensesAmount ?? 0)} sign="+" rows={summary?.drawerPaidExpenses} onInspect={() => openDetails('تفاصيل مصروفات الدرج', summary?.drawerPaidExpenses, summary?.drawerPaidExpensesAmount)} />
                <EquationRow label="مصروفات البنك" amount={Number(summary?.bankPaidExpensesAmount ?? 0)} sign="+" rows={summary?.bankPaidExpenses} onInspect={() => openDetails('تفاصيل مصروفات البنك', summary?.bankPaidExpenses, summary?.bankPaidExpensesAmount)} />
                <EquationRow label="مشتريات الدرج" amount={Number(summary?.cashPurchasesFromDrawer ?? 0)} sign="+" rows={summary?.drawerPaidPurchases} onInspect={() => openDetails('تفاصيل مشتريات الدرج', summary?.drawerPaidPurchases, summary?.cashPurchasesFromDrawer)} />
                <EquationRow label="مشتريات البنك" amount={Number(summary?.bankPaidPurchasesAmount ?? 0)} sign="+" rows={summary?.bankPaidPurchases} onInspect={() => openDetails('تفاصيل مشتريات البنك', summary?.bankPaidPurchases, summary?.bankPaidPurchasesAmount)} />
              </div>
              <div className="form-actions">
                <Link className="primary-button" href={`/expenses/new?branch_id=${branchId}&expense_date=${closingDate}`} target="_blank">إضافة مصروف سريع</Link>
                <Link className="secondary-button" href={`/expenses?branch_id=${branchId}&date_from=${closingDate}&date_to=${closingDate}`}>عرض مصروفات اليوم</Link>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <h3>مبيعات البنك</h3>
              <div className="form-grid">
                <label>
                  مبلغ مبيعات داخل الفرع البنكية
                  <input disabled={readOnly} type="number" min="0" step="0.01" value={inStoreCardSales.amount ?? 0} onChange={(event) => updateDraft('inStoreCardSales', { amount: Number(event.target.value) })} />
                </label>
                <label>
                  الحساب البنكي
                  <select disabled={readOnly} value={inStoreCardSales.bankAccountId ?? bankAccountId} onChange={(event) => updateDraft('inStoreCardSales', { bankAccountId: event.target.value })}>
                    <option value="">اختر الحساب البنكي</option>
                    {bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                  </select>
                </label>
              </div>

              <div className="closing-summary-block">
                <h4>تفسير مصادر البنك</h4>
                <SourceList
                  title="قنوات المبيعات البنكية التشغيلية"
                  items={[
                    { label: 'مبيعات داخل الفرع البنكية', amount: Number(summary?.inStoreCardSalesAmount ?? 0) },
                    { label: 'مبيعات التوصيل', amount: Number(summary?.deliverySalesAmount ?? 0) },
                    { label: 'مبيعات الموقع بنكيًا', amount: Number(summary?.websiteBankSalesAmount ?? 0) },
                  ]}
                />
                <EquationRow label="إجمالي الحركة البنكية" amount={totalBankMovement} sign="+" />
                <EquationRow
                  label="تحصيلات الجملة البنكية"
                  amount={Number(summary?.wholesaleBankCollections ?? 0)}
                  sign="-"
                  rows={summary?.wholesaleBankCollectionLines}
                  onInspect={() => openDetails('تفاصيل تحصيلات الجملة البنكية', summary?.wholesaleBankCollectionLines, summary?.wholesaleBankCollections)}
                />
                <EquationRow label="مصروفات البنك" amount={Number(summary?.bankPaidExpensesAmount ?? 0)} sign="+" rows={summary?.bankPaidExpenses} onInspect={() => openDetails('تفاصيل مصروفات البنك', summary?.bankPaidExpenses, summary?.bankPaidExpensesAmount)} />
                <EquationRow label="مشتريات البنك" amount={Number(summary?.bankPaidPurchasesAmount ?? 0)} sign="+" rows={summary?.bankPaidPurchases} onInspect={() => openDetails('تفاصيل مشتريات البنك', summary?.bankPaidPurchases, summary?.bankPaidPurchasesAmount)} />
                <EquationRow label="صافي المبيعات البنكية التشغيلية" amount={netOperationalBankSales} sign="=" />
              </div>

              <label className="checkbox-field"><input disabled={readOnly} checked={Boolean(deliverySales.enabled)} onChange={(event) => updateDraft('deliverySales', { enabled: event.target.checked })} type="checkbox" />تفعيل مبيعات التوصيل</label>
              {deliverySales.enabled ? (
                <div className="form-grid">
                  <label>من تاريخ<input disabled={readOnly} type="date" value={deliverySales.fromDate ?? closingDate} onChange={(event) => updateDraft('deliverySales', { fromDate: event.target.value })} /></label>
                  <label>إلى تاريخ<input disabled={readOnly} type="date" value={deliverySales.toDate ?? closingDate} onChange={(event) => updateDraft('deliverySales', { toDate: event.target.value })} /></label>
                  <label>المبلغ<input disabled={readOnly} type="number" min="0" step="0.01" value={deliverySales.amount ?? 0} onChange={(event) => updateDraft('deliverySales', { amount: Number(event.target.value) })} /></label>
                  <label>الحساب البنكي<select disabled={readOnly} value={deliverySales.bankAccountId ?? bankAccountId} onChange={(event) => updateDraft('deliverySales', { bankAccountId: event.target.value })}>{bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
                </div>
              ) : null}

              <label className="checkbox-field"><input disabled={readOnly} checked={Boolean(websiteSales.enabled)} onChange={(event) => updateDraft('websiteSales', { enabled: event.target.checked })} type="checkbox" />تفعيل مبيعات الموقع</label>
              {websiteSales.enabled ? (
                <div className="form-grid">
                  <label>من تاريخ<input disabled={readOnly} type="date" value={websiteSales.fromDate ?? closingDate} onChange={(event) => updateDraft('websiteSales', { fromDate: event.target.value })} /></label>
                  <label>إلى تاريخ<input disabled={readOnly} type="date" value={websiteSales.toDate ?? closingDate} onChange={(event) => updateDraft('websiteSales', { toDate: event.target.value })} /></label>
                  <label>نقدي<input disabled={readOnly} type="number" min="0" step="0.01" value={websiteSales.cashAmount ?? 0} onChange={(event) => updateDraft('websiteSales', { cashAmount: Number(event.target.value) })} /></label>
                  <label>بنكي<input disabled={readOnly} type="number" min="0" step="0.01" value={websiteSales.bankAmount ?? 0} onChange={(event) => updateDraft('websiteSales', { bankAmount: Number(event.target.value) })} /></label>
                  <label>الدرج<select disabled={readOnly} value={websiteSales.drawerId ?? drawerId} onChange={(event) => updateDraft('websiteSales', { drawerId: event.target.value })}>{drawers.map((drawer) => <option key={drawer.id} value={drawer.id}>{drawer.name}</option>)}</select></label>
                  <label>الحساب البنكي<select disabled={readOnly} value={websiteSales.bankAccountId ?? bankAccountId} onChange={(event) => updateDraft('websiteSales', { bankAccountId: event.target.value })}>{bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
                </div>
              ) : null}
            </>
          ) : null}

          {step === 4 ? (
            <>
              <h3>تسوية النقد</h3>
              <p className="notice">تحصيلات الجملة النقدية داخلة بالفعل ضمن المبلغ المستلم من المحاسب، لكنها تُفصل هنا بوضوح حتى يظهر صافي المبيعات النقدية التشغيلية بعيدًا عن تحصيل الذمم.</p>
              <div className="form-grid">
                <label>المبلغ المستلم من المحاسب<input disabled={readOnly} type="number" min="0" step="0.01" value={cashReconciliation.handedCashAmount ?? 0} onChange={(event) => updateDraft('cashReconciliation', { handedCashAmount: Number(event.target.value) })} /></label>
              </div>

              <div className="closing-formula-grid">
                <section className="closing-summary-block">
                  <h4>القسم النقدي</h4>
                  <EquationRow label="المبلغ المستلم من المحاسب" amount={Number(summary?.handedCashAmount ?? 0)} sign="+" />
                  <EquationRow label="تحصيلات الجملة النقدية" amount={Number(summary?.wholesaleCashCollections ?? 0)} sign="-" rows={summary?.wholesaleCashCollectionLines} onInspect={() => openDetails('تفاصيل تحصيلات الجملة النقدية', summary?.wholesaleCashCollectionLines, summary?.wholesaleCashCollections)} />
                  <EquationRow label="مصروفات الدرج" amount={Number(summary?.drawerPaidExpensesAmount ?? 0)} sign="+" rows={summary?.drawerPaidExpenses} onInspect={() => openDetails('تفاصيل مصروفات الدرج', summary?.drawerPaidExpenses, summary?.drawerPaidExpensesAmount)} />
                  <EquationRow label="مشتريات الدرج" amount={Number(summary?.cashPurchasesFromDrawer ?? 0)} sign="+" rows={summary?.drawerPaidPurchases} onInspect={() => openDetails('تفاصيل مشتريات الدرج', summary?.drawerPaidPurchases, summary?.cashPurchasesFromDrawer)} />
                  <EquationRow label="صافي المبيعات النقدية التشغيلية" amount={netOperationalCashSales} sign="=" />
                  <div className="closing-note-box">
                    <span>تحصيلات الجملة النقدية مضمنة داخل النقد المستلم فعليًا من المحاسب.</span>
                    <strong>إجمالي النقد المستلم فعليًا: {money(summary?.handedCashAmount)}</strong>
                  </div>
                  <SourceList
                    title="مصادر النقد التشغيلية"
                    items={[
                      { label: 'نقد المبيعات المباشرة', amount: Number(summary?.cashRetailSales ?? 0) },
                      { label: 'مبيعات الموقع نقدًا', amount: Number(summary?.websiteCashSales ?? 0) },
                    ]}
                  />
                </section>

                <section className="closing-summary-block">
                  <h4>القسم البنكي</h4>
                  <EquationRow label="إجمالي الحركة البنكية" amount={totalBankMovement} sign="+" />
                  <EquationRow label="تحصيلات الجملة البنكية" amount={Number(summary?.wholesaleBankCollections ?? 0)} sign="-" rows={summary?.wholesaleBankCollectionLines} onInspect={() => openDetails('تفاصيل تحصيلات الجملة البنكية', summary?.wholesaleBankCollectionLines, summary?.wholesaleBankCollections)} />
                  <EquationRow label="مصروفات البنك" amount={Number(summary?.bankPaidExpensesAmount ?? 0)} sign="+" rows={summary?.bankPaidExpenses} onInspect={() => openDetails('تفاصيل مصروفات البنك', summary?.bankPaidExpenses, summary?.bankPaidExpensesAmount)} />
                  <EquationRow label="مشتريات البنك" amount={Number(summary?.bankPaidPurchasesAmount ?? 0)} sign="+" rows={summary?.bankPaidPurchases} onInspect={() => openDetails('تفاصيل مشتريات البنك', summary?.bankPaidPurchases, summary?.bankPaidPurchasesAmount)} />
                  <EquationRow label="صافي المبيعات البنكية التشغيلية" amount={netOperationalBankSales} sign="=" />
                  <div className="closing-note-box">
                    <span>تحصيلات الجملة البنكية منفصلة عن المبيعات البنكية التشغيلية حتى لا تضخم نتائج اليوم.</span>
                    <strong>إجمالي الحركة البنكية: {money(summary?.totalBankInflowsAmount)}</strong>
                  </div>
                  <SourceList
                    title="قنوات البنك التشغيلية"
                    items={[
                      { label: 'مبيعات داخل الفرع البنكية', amount: Number(summary?.inStoreCardSalesAmount ?? 0) },
                      { label: 'مبيعات التوصيل', amount: Number(summary?.deliverySalesAmount ?? 0) },
                      { label: 'مبيعات الموقع بنكيًا', amount: Number(summary?.websiteBankSalesAmount ?? 0) },
                    ]}
                  />
                </section>
              </div>
            </>
          ) : null}

          {step === 5 ? (
            <>
              <h3>تحويل الخزنة</h3>
              <label className="checkbox-field"><input disabled={readOnly} checked={Boolean(vaultTransfer.enabled)} onChange={(event) => updateDraft('vaultTransfer', { enabled: event.target.checked, amount: cashReconciliation.handedCashAmount ?? 0 })} type="checkbox" />تحويل النقد إلى خزنة</label>
              {vaultTransfer.enabled ? (
                <div className="form-grid">
                  <label>مبلغ التحويل<input disabled={readOnly} type="number" min="0" step="0.01" value={vaultTransfer.amount ?? 0} onChange={(event) => updateDraft('vaultTransfer', { amount: Number(event.target.value) })} /></label>
                  <label>الخزنة<select disabled={readOnly} value={vaultTransfer.vaultId ?? ''} onChange={(event) => updateDraft('vaultTransfer', { vaultId: event.target.value })}><option value="">اختر الخزنة</option>{vaults.map((vault) => <option key={vault.id} value={vault.id}>{vault.name}</option>)}</select></label>
                </div>
              ) : null}
            </>
          ) : null}

          {step === 6 ? (
            <>
              <h3>الملخص النهائي</h3>
              <div className="closing-formula-grid">
                <section className="closing-summary-block">
                  <h4>القسم النقدي</h4>
                  <EquationRow label="المبلغ المستلم من المحاسب" amount={Number(summary?.handedCashAmount ?? 0)} sign="+" />
                  <EquationRow label="تحصيلات الجملة النقدية" amount={Number(summary?.wholesaleCashCollections ?? 0)} sign="-" rows={summary?.wholesaleCashCollectionLines} onInspect={() => openDetails('تفاصيل تحصيلات الجملة النقدية', summary?.wholesaleCashCollectionLines, summary?.wholesaleCashCollections)} />
                  <EquationRow label="مصروفات الدرج" amount={Number(summary?.drawerPaidExpensesAmount ?? 0)} sign="+" rows={summary?.drawerPaidExpenses} onInspect={() => openDetails('تفاصيل مصروفات الدرج', summary?.drawerPaidExpenses, summary?.drawerPaidExpensesAmount)} />
                  <EquationRow label="مشتريات الدرج" amount={Number(summary?.cashPurchasesFromDrawer ?? 0)} sign="+" rows={summary?.drawerPaidPurchases} onInspect={() => openDetails('تفاصيل مشتريات الدرج', summary?.drawerPaidPurchases, summary?.cashPurchasesFromDrawer)} />
                  <EquationRow label="صافي المبيعات النقدية التشغيلية" amount={netOperationalCashSales} sign="=" />
                </section>

                <section className="closing-summary-block">
                  <h4>القسم البنكي</h4>
                  <EquationRow label="إجمالي الحركة البنكية" amount={totalBankMovement} sign="+" />
                  <EquationRow label="تحصيلات الجملة البنكية" amount={Number(summary?.wholesaleBankCollections ?? 0)} sign="-" rows={summary?.wholesaleBankCollectionLines} onInspect={() => openDetails('تفاصيل تحصيلات الجملة البنكية', summary?.wholesaleBankCollectionLines, summary?.wholesaleBankCollections)} />
                  <EquationRow label="مصروفات البنك" amount={Number(summary?.bankPaidExpensesAmount ?? 0)} sign="+" rows={summary?.bankPaidExpenses} onInspect={() => openDetails('تفاصيل مصروفات البنك', summary?.bankPaidExpenses, summary?.bankPaidExpensesAmount)} />
                  <EquationRow label="مشتريات البنك" amount={Number(summary?.bankPaidPurchasesAmount ?? 0)} sign="+" rows={summary?.bankPaidPurchases} onInspect={() => openDetails('تفاصيل مشتريات البنك', summary?.bankPaidPurchases, summary?.bankPaidPurchasesAmount)} />
                  <EquationRow label="صافي المبيعات البنكية التشغيلية" amount={netOperationalBankSales} sign="=" />
                </section>
              </div>

              <section className="closing-summary-block closing-totals-block">
                <h4>الإجماليات النهائية</h4>
                <div className="closing-total-grid">
                  <div><span>صافي المبيعات النقدية التشغيلية</span><strong>{money(netOperationalCashSales)}</strong></div>
                  <div><span>صافي المبيعات البنكية التشغيلية</span><strong>{money(netOperationalBankSales)}</strong></div>
                  <div><span>إجمالي المبيعات التشغيلية اليومية</span><strong>{money(summary?.normalDailySalesAmount)}</strong></div>
                  <div><span>إجمالي تحصيلات الجملة</span><strong>{money(summary?.wholesaleCollectionsTotal)}</strong></div>
                  <div><span>إجمالي الحركة اليومية</span><strong>{money(summary?.totalDailyActivityAmount)}</strong></div>
                  <div><span>تحويل الخزنة</span><strong>{money(summary?.vaultTransferAmount)}</strong></div>
                </div>
              </section>

              {!readOnly ? <button disabled={isSaving || !closing?.id} onClick={finish} type="button">{isSaving ? 'جارِ الإنهاء...' : 'إنهاء الإقفال'}</button> : null}
              {closing?.status === 'finalized' ? <button className="danger-button" onClick={cancelWithReversal} type="button">إلغاء مع عكس الأثر المالي</button> : null}
              {closing?.status === 'draft' ? <button className="danger-button" disabled={isSaving} onClick={deleteDraft} type="button">حذف المسودة</button> : null}
            </>
          ) : null}
        </section>

        <div className="form-actions">
          <button disabled={step <= 1} onClick={() => setStep((current) => Math.max(1, current - 1))} type="button">السابق</button>
          <button disabled={step >= 6} onClick={() => setStep((current) => Math.min(6, current + 1))} type="button">التالي</button>
        </div>
      </main>

      <aside className="closing-sticky-summary">
        <strong>ملخص الإقفال</strong>
        <span>{selectedBranch?.name ?? 'اختر الفرع'} - {closingDate}</span>
        <dl>
          <div><dt>الحالة</dt><dd>{statusLabel(closing?.status)}</dd></div>
          <div><dt>نقد تشغيلي</dt><dd>{money(netOperationalCashSales)}</dd></div>
          <div><dt>بنك تشغيلي</dt><dd>{money(netOperationalBankSales)}</dd></div>
          <div><dt>إجمالي تشغيل يومي</dt><dd>{money(summary?.normalDailySalesAmount)}</dd></div>
          <div><dt>تحصيلات الجملة</dt><dd>{money(summary?.wholesaleCollectionsTotal)}</dd></div>
          <div><dt>إجمالي الحركة</dt><dd>{money(summary?.totalDailyActivityAmount)}</dd></div>
          <div><dt>تحويل الخزنة</dt><dd>{money(summary?.vaultTransferAmount)}</dd></div>
        </dl>
        {closing?.id ? <Link className="secondary-button" href={`/api/daily-sales/closings/${closing.id}/export?format=pdf`}>تصدير PDF</Link> : null}
        {closing?.status === 'draft' ? <button className="danger-button" disabled={isSaving} onClick={deleteDraft} type="button">حذف المسودة</button> : null}
      </aside>

      <ModalDialog onClose={() => setDetailState(null)} open={Boolean(detailState)} title={detailState?.title ?? 'تفاصيل'}>
        <div className="table-wrap compact-table">
          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>البيان</th>
                <th>مرجع</th>
                <th>ملاحظات</th>
                <th>المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {detailState?.rows.length ? (
                detailState.rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.date ?? '-'}</td>
                    <td>{row.description}</td>
                    <td>{row.reference ?? '-'}</td>
                    <td>{row.secondary ?? '-'}</td>
                    <td>{money(row.amount)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>لا توجد سجلات مرتبطة بهذا الرقم.</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={4}>الإجمالي</th>
                <th>{money(detailState?.total)}</th>
              </tr>
            </tfoot>
          </table>
        </div>
      </ModalDialog>

      <style jsx>{`
        .closing-formula-grid,
        .closing-mini-grid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .closing-mini-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .closing-summary-block {
          border: 1px solid var(--border);
          border-radius: 8px;
          background: #fff;
          padding: 12px;
          display: grid;
          gap: 10px;
        }
        .closing-summary-block h4 {
          margin: 0;
          font-size: 14px;
        }
        .closing-equation-row {
          display: grid;
          grid-template-columns: 24px minmax(0, 1fr);
          gap: 10px;
          align-items: center;
        }
        .closing-equation-sign {
          width: 24px;
          height: 24px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: #f3f4f6;
          color: #475569;
          font-weight: 900;
        }
        .closing-equation-sign.result {
          background: #dcfce7;
          color: #166534;
        }
        .closing-equation-copy {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid #eef2f6;
          padding-bottom: 8px;
          font-size: 13px;
          font-weight: 800;
        }
        .closing-equation-row.result .closing-equation-copy {
          color: #166534;
          font-size: 14px;
        }
        .closing-amount-button {
          position: relative;
          border: none;
          background: transparent;
          color: inherit;
          font: inherit;
          font-weight: 900;
          cursor: pointer;
          padding: 0;
        }
        .closing-hover-card {
          position: absolute;
          inset-inline-end: 0;
          top: calc(100% + 8px);
          width: 260px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: #fff;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.14);
          padding: 10px;
          display: none;
          z-index: 20;
          text-align: right;
          color: #0f172a;
        }
        .closing-amount-button:hover .closing-hover-card,
        .closing-amount-button:focus-visible .closing-hover-card {
          display: grid;
          gap: 6px;
        }
        .closing-hover-card ul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 6px;
        }
        .closing-hover-card li,
        .closing-source-list li,
        .closing-total-grid div {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          font-size: 12px;
        }
        .closing-source-list {
          display: grid;
          gap: 6px;
          padding: 10px;
          border-radius: 8px;
          background: #f8fafc;
        }
        .closing-source-list ul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 6px;
        }
        .closing-note-box {
          border-radius: 8px;
          background: #eff6ff;
          padding: 10px;
          display: grid;
          gap: 4px;
          font-size: 12px;
          color: #1e3a8a;
        }
        .closing-totals-block {
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        }
        .closing-total-grid {
          display: grid;
          gap: 8px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .closing-total-grid div {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 10px;
          background: #fff;
        }
        @media (max-width: 900px) {
          .closing-formula-grid,
          .closing-mini-grid,
          .closing-total-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
