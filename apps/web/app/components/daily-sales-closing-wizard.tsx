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
  total: number;
  rows: DailySalesClosingSummaryLine[];
} | null;

type SummaryCardItem = {
  id: string;
  title: string;
  subtitle?: string;
  amount: number;
  tone?: 'default' | 'success' | 'warning' | 'muted';
  rows?: DailySalesClosingSummaryLine[];
};

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

function buildSimpleRow(id: string, description: string, amount: number, secondary?: string | null): DailySalesClosingSummaryLine {
  return { id, description, amount, secondary: secondary ?? null };
}

function SummaryCard({
  item,
  onOpen,
}: Readonly<{
  item: SummaryCardItem;
  onOpen: (title: string, rows: DailySalesClosingSummaryLine[] | undefined, total: number) => void;
}>) {
  return (
    <article className={`closing-summary-card ${item.tone ?? 'default'}`}>
      <div className="closing-summary-card-copy">
        <small>{item.subtitle}</small>
        <strong>{item.title}</strong>
      </div>
      <button className="closing-summary-amount" onClick={() => onOpen(item.title, item.rows, item.amount)} type="button">
        {money(item.amount)}
      </button>
    </article>
  );
}

function SummarySection({
  title,
  subtitle,
  items,
  onOpen,
}: Readonly<{
  title: string;
  subtitle?: string;
  items: SummaryCardItem[];
  onOpen: (title: string, rows: DailySalesClosingSummaryLine[] | undefined, total: number) => void;
}>) {
  return (
    <section className="closing-section">
      <div className="closing-section-head">
        <h4>{title}</h4>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <div className="closing-card-grid">
        {items.map((item) => (
          <SummaryCard item={item} key={item.id} onOpen={onOpen} />
        ))}
      </div>
    </section>
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

  const handedCashRows = useMemo(
    () => [
      buildSimpleRow(
        'handed-cash',
        'المبلغ المستلم من المحاسب',
        Number(summary?.handedCashAmount ?? 0),
        'القيمة الفعلية التي تم إدخالها في خطوة تسوية النقد',
      ),
    ],
    [summary?.handedCashAmount],
  );

  const normalBankSalesRows = useMemo(
    () =>
      [
        buildSimpleRow('in-store-bank', 'مبيعات داخل الفرع البنكية', Number(summary?.inStoreCardSalesAmount ?? 0)),
        buildSimpleRow('delivery-bank', 'مبيعات التوصيل', Number(summary?.deliverySalesAmount ?? 0)),
        buildSimpleRow('website-bank', 'مبيعات الموقع بنكيًا', Number(summary?.websiteBankSalesAmount ?? 0)),
      ].filter((row) => row.amount > 0),
    [summary?.deliverySalesAmount, summary?.inStoreCardSalesAmount, summary?.websiteBankSalesAmount],
  );

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

  const operationalCashRows = useMemo(
    () => [
      buildSimpleRow('cash-start', 'المبلغ المستلم من المحاسب', Number(summary?.handedCashAmount ?? 0)),
      buildSimpleRow('cash-wholesale', 'تحصيلات الجملة النقدية', Number(summary?.wholesaleCashCollections ?? 0)),
      buildSimpleRow('cash-expenses', 'مصروفات الدرج', Number(summary?.drawerPaidExpensesAmount ?? 0)),
      buildSimpleRow('cash-purchases', 'مشتريات الدرج', Number(summary?.cashPurchasesFromDrawer ?? 0)),
    ],
    [summary],
  );

  const operationalBankRows = useMemo(
    () => [
      buildSimpleRow('bank-total', 'إجمالي الحركة البنكية', totalBankMovement),
      buildSimpleRow('bank-wholesale', 'تحصيلات الجملة البنكية', Number(summary?.wholesaleBankCollections ?? 0)),
      buildSimpleRow('bank-expenses', 'مصروفات البنك', Number(summary?.bankPaidExpensesAmount ?? 0)),
      buildSimpleRow('bank-purchases', 'مشتريات البنك', Number(summary?.bankPaidPurchasesAmount ?? 0)),
    ],
    [summary, totalBankMovement],
  );

  const finalTotalsRows = useMemo(
    () => [
      buildSimpleRow('final-cash', 'صافي المبيعات النقدية التشغيلية', netOperationalCashSales),
      buildSimpleRow('final-bank', 'صافي المبيعات البنكية التشغيلية', netOperationalBankSales),
      buildSimpleRow('final-operational', 'إجمالي المبيعات التشغيلية اليومية', Number(summary?.normalDailySalesAmount ?? 0)),
      buildSimpleRow('final-wholesale', 'إجمالي تحصيلات الجملة', Number(summary?.wholesaleCollectionsTotal ?? 0)),
      buildSimpleRow('final-activity', 'إجمالي الحركة اليومية', Number(summary?.totalDailyActivityAmount ?? 0)),
      buildSimpleRow('final-vault', 'تحويل الخزنة', Number(summary?.vaultTransferAmount ?? 0)),
    ],
    [netOperationalBankSales, netOperationalCashSales, summary],
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

  function openDetails(title: string, rows: DailySalesClosingSummaryLine[] | undefined, total: number) {
    setDetailState({ title, rows: rows ?? [], total });
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

  const expenseCards: SummaryCardItem[] = [
    {
      id: 'drawer-expenses',
      title: 'مصروفات الدرج',
      subtitle: 'مدفوعات تشغيلية نقدية',
      amount: Number(summary?.drawerPaidExpensesAmount ?? 0),
      rows: summary?.drawerPaidExpenses,
    },
    {
      id: 'bank-expenses',
      title: 'مصروفات البنك',
      subtitle: 'مدفوعات تشغيلية بنكية',
      amount: Number(summary?.bankPaidExpensesAmount ?? 0),
      rows: summary?.bankPaidExpenses,
    },
    {
      id: 'drawer-purchases',
      title: 'مشتريات الدرج',
      subtitle: 'مشتريات مسددة نقدًا',
      amount: Number(summary?.cashPurchasesFromDrawer ?? 0),
      rows: summary?.drawerPaidPurchases,
    },
    {
      id: 'bank-purchases',
      title: 'مشتريات البنك',
      subtitle: 'مشتريات مسددة بنكيًا',
      amount: Number(summary?.bankPaidPurchasesAmount ?? 0),
      rows: summary?.bankPaidPurchases,
    },
  ];

  const cashCards: SummaryCardItem[] = [
    {
      id: 'handed-cash',
      title: 'المبلغ المستلم من المحاسب',
      subtitle: 'النقد الفعلي المستلم',
      amount: Number(summary?.handedCashAmount ?? 0),
      rows: handedCashRows,
    },
    {
      id: 'wholesale-cash',
      title: 'تحصيلات الجملة النقدية',
      subtitle: 'مشمولة داخل النقد المستلم',
      amount: Number(summary?.wholesaleCashCollections ?? 0),
      rows: summary?.wholesaleCashCollectionLines,
      tone: 'warning',
    },
    {
      id: 'operational-cash',
      title: 'صافي المبيعات النقدية التشغيلية',
      subtitle: 'بعد فصل الجملة وإضافة المصروفات والمشتريات',
      amount: netOperationalCashSales,
      rows: operationalCashRows,
      tone: 'success',
    },
  ];

  const bankCards: SummaryCardItem[] = [
    {
      id: 'normal-bank',
      title: 'المبيعات البنكية التشغيلية',
      subtitle: 'داخل الفرع + التوصيل + الموقع',
      amount: Number(summary?.normalBankSalesAmount ?? 0),
      rows: normalBankSalesRows,
    },
    {
      id: 'wholesale-bank',
      title: 'تحصيلات الجملة البنكية',
      subtitle: 'منفصلة عن مبيعات اليوم',
      amount: Number(summary?.wholesaleBankCollections ?? 0),
      rows: summary?.wholesaleBankCollectionLines,
      tone: 'warning',
    },
    {
      id: 'bank-movement',
      title: 'صافي المبيعات البنكية التشغيلية',
      subtitle: 'بعد فصل الجملة وإضافة المصروفات والمشتريات',
      amount: netOperationalBankSales,
      rows: operationalBankRows,
      tone: 'success',
    },
  ];

  const totalCards: SummaryCardItem[] = [
    {
      id: 'total-operational',
      title: 'إجمالي المبيعات التشغيلية اليومية',
      subtitle: 'نقد تشغيلي + بنك تشغيلي',
      amount: Number(summary?.normalDailySalesAmount ?? 0),
      rows: finalTotalsRows.slice(0, 3),
      tone: 'success',
    },
    {
      id: 'total-wholesale',
      title: 'إجمالي تحصيلات الجملة',
      subtitle: 'نقدي + بنكي',
      amount: Number(summary?.wholesaleCollectionsTotal ?? 0),
      rows: [
        buildSimpleRow('wholesale-cash-total', 'تحصيلات الجملة النقدية', Number(summary?.wholesaleCashCollections ?? 0)),
        buildSimpleRow('wholesale-bank-total', 'تحصيلات الجملة البنكية', Number(summary?.wholesaleBankCollections ?? 0)),
      ],
      tone: 'warning',
    },
    {
      id: 'total-activity',
      title: 'إجمالي الحركة اليومية',
      subtitle: 'تشغيلي + تحصيلات الجملة',
      amount: Number(summary?.totalDailyActivityAmount ?? 0),
      rows: finalTotalsRows,
      tone: 'default',
    },
    {
      id: 'vault-transfer',
      title: 'تحويل الخزنة',
      subtitle: 'المبلغ المحول من الدرج',
      amount: Number(summary?.vaultTransferAmount ?? 0),
      rows: [
        buildSimpleRow('vault-transfer-row', 'تحويل الخزنة', Number(summary?.vaultTransferAmount ?? 0), vaultTransfer.enabled ? 'مفعّل ضمن الإقفال' : 'غير مفعّل'),
      ],
      tone: 'muted',
    },
  ];

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
                <label>الفرع<select disabled={readOnly} value={branchId} onChange={(event) => setBranchId(event.target.value)} required><option value="">اختر الفرع</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
                <label>تاريخ الإقفال<input disabled={readOnly} type="date" value={closingDate} onChange={(event) => setClosingDate(event.target.value)} /></label>
                <label>الدرج الافتراضي<select disabled={readOnly} value={drawerId} onChange={(event) => setDrawerId(event.target.value)}><option value="">بدون</option>{drawers.map((drawer) => <option key={drawer.id} value={drawer.id}>{drawer.name}</option>)}</select></label>
                <label>الحساب البنكي<select disabled={readOnly} value={bankAccountId} onChange={(event) => setBankAccountId(event.target.value)}><option value="">بدون</option>{bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <h3>المصروفات والمشتريات</h3>
              <p className="field-hint">اعرض المجاميع سريعًا، حرّك المؤشر على أي مبلغ للمعاينة المختصرة، واضغط عليه لفتح كل التفاصيل.</p>
              <SummarySection title="ملخص المصروفات" items={expenseCards} onOpen={openDetails} />
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
                <label>مبلغ مبيعات داخل الفرع البنكية<input disabled={readOnly} type="number" min="0" step="0.01" value={inStoreCardSales.amount ?? 0} onChange={(event) => updateDraft('inStoreCardSales', { amount: Number(event.target.value) })} /></label>
                <label>الحساب البنكي<select disabled={readOnly} value={inStoreCardSales.bankAccountId ?? bankAccountId} onChange={(event) => updateDraft('inStoreCardSales', { bankAccountId: event.target.value })}><option value="">اختر الحساب البنكي</option>{bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
              </div>
              <SummarySection title="ملخص البنك" subtitle="تفصيل خفيف لقنوات البنك التشغيلية وتحصيلات الجملة البنكية." items={bankCards} onOpen={openDetails} />
              <label className="checkbox-field"><input disabled={readOnly} checked={Boolean(deliverySales.enabled)} onChange={(event) => updateDraft('deliverySales', { enabled: event.target.checked })} type="checkbox" />تفعيل مبيعات التوصيل</label>
              {deliverySales.enabled ? <div className="form-grid"><label>من تاريخ<input disabled={readOnly} type="date" value={deliverySales.fromDate ?? closingDate} onChange={(event) => updateDraft('deliverySales', { fromDate: event.target.value })} /></label><label>إلى تاريخ<input disabled={readOnly} type="date" value={deliverySales.toDate ?? closingDate} onChange={(event) => updateDraft('deliverySales', { toDate: event.target.value })} /></label><label>المبلغ<input disabled={readOnly} type="number" min="0" step="0.01" value={deliverySales.amount ?? 0} onChange={(event) => updateDraft('deliverySales', { amount: Number(event.target.value) })} /></label><label>الحساب البنكي<select disabled={readOnly} value={deliverySales.bankAccountId ?? bankAccountId} onChange={(event) => updateDraft('deliverySales', { bankAccountId: event.target.value })}>{bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label></div> : null}
              <label className="checkbox-field"><input disabled={readOnly} checked={Boolean(websiteSales.enabled)} onChange={(event) => updateDraft('websiteSales', { enabled: event.target.checked })} type="checkbox" />تفعيل مبيعات الموقع</label>
              {websiteSales.enabled ? <div className="form-grid"><label>من تاريخ<input disabled={readOnly} type="date" value={websiteSales.fromDate ?? closingDate} onChange={(event) => updateDraft('websiteSales', { fromDate: event.target.value })} /></label><label>إلى تاريخ<input disabled={readOnly} type="date" value={websiteSales.toDate ?? closingDate} onChange={(event) => updateDraft('websiteSales', { toDate: event.target.value })} /></label><label>نقدي<input disabled={readOnly} type="number" min="0" step="0.01" value={websiteSales.cashAmount ?? 0} onChange={(event) => updateDraft('websiteSales', { cashAmount: Number(event.target.value) })} /></label><label>بنكي<input disabled={readOnly} type="number" min="0" step="0.01" value={websiteSales.bankAmount ?? 0} onChange={(event) => updateDraft('websiteSales', { bankAmount: Number(event.target.value) })} /></label><label>الدرج<select disabled={readOnly} value={websiteSales.drawerId ?? drawerId} onChange={(event) => updateDraft('websiteSales', { drawerId: event.target.value })}>{drawers.map((drawer) => <option key={drawer.id} value={drawer.id}>{drawer.name}</option>)}</select></label><label>الحساب البنكي<select disabled={readOnly} value={websiteSales.bankAccountId ?? bankAccountId} onChange={(event) => updateDraft('websiteSales', { bankAccountId: event.target.value })}>{bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label></div> : null}
            </>
          ) : null}

          {step === 4 ? (
            <>
              <h3>تسوية النقد</h3>
              <div className="form-grid">
                <label>المبلغ المستلم من المحاسب<input disabled={readOnly} type="number" min="0" step="0.01" value={cashReconciliation.handedCashAmount ?? 0} onChange={(event) => updateDraft('cashReconciliation', { handedCashAmount: Number(event.target.value) })} /></label>
              </div>
              <div className="closing-kpi-row">
                <SummaryCard item={cashCards[0]} onOpen={openDetails} />
                <SummaryCard item={cashCards[1]} onOpen={openDetails} />
                <SummaryCard item={cashCards[2]} onOpen={openDetails} />
                <SummaryCard item={bankCards[2]} onOpen={openDetails} />
                <SummaryCard item={totalCards[0]} onOpen={openDetails} />
              </div>
            </>
          ) : null}

          {step === 5 ? (
            <>
              <h3>تحويل الخزنة</h3>
              <label className="checkbox-field"><input disabled={readOnly} checked={Boolean(vaultTransfer.enabled)} onChange={(event) => updateDraft('vaultTransfer', { enabled: event.target.checked, amount: cashReconciliation.handedCashAmount ?? 0 })} type="checkbox" />تحويل النقد إلى خزنة</label>
              {vaultTransfer.enabled ? <div className="form-grid"><label>مبلغ التحويل<input disabled={readOnly} type="number" min="0" step="0.01" value={vaultTransfer.amount ?? 0} onChange={(event) => updateDraft('vaultTransfer', { amount: Number(event.target.value) })} /></label><label>الخزنة<select disabled={readOnly} value={vaultTransfer.vaultId ?? ''} onChange={(event) => updateDraft('vaultTransfer', { vaultId: event.target.value })}><option value="">اختر الخزنة</option>{vaults.map((vault) => <option key={vault.id} value={vault.id}>{vault.name}</option>)}</select></label></div> : null}
            </>
          ) : null}

          {step === 6 ? (
            <>
              <h3>الملخص النهائي</h3>
              <div className="closing-summary-stack">
                <SummarySection title="النقد" items={cashCards} onOpen={openDetails} />
                <SummarySection title="البنك" items={bankCards} onOpen={openDetails} />
                <SummarySection title="الإجماليات النهائية" subtitle="بطاقات خفيفة لقراءة النتيجة النهائية بسرعة." items={totalCards} onOpen={openDetails} />
              </div>
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
          <div><dt>تشغيل يومي</dt><dd>{money(summary?.normalDailySalesAmount)}</dd></div>
          <div><dt>تحصيلات الجملة</dt><dd>{money(summary?.wholesaleCollectionsTotal)}</dd></div>
          <div><dt>إجمالي الحركة</dt><dd>{money(summary?.totalDailyActivityAmount)}</dd></div>
          <div><dt>تحويل الخزنة</dt><dd>{money(summary?.vaultTransferAmount)}</dd></div>
        </dl>
        {closing?.id ? <Link className="secondary-button" href={`/api/daily-sales/closings/${closing.id}/export?format=pdf`}>تصدير PDF</Link> : null}
        {closing?.status === 'draft' ? <button className="danger-button" disabled={isSaving} onClick={deleteDraft} type="button">حذف المسودة</button> : null}
      </aside>

      <ModalDialog onClose={() => setDetailState(null)} open={Boolean(detailState)} title={detailState?.title ?? 'التفاصيل'} width="1040px">
        <table className="closing-detail-table">
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
      </ModalDialog>

      <style jsx>{`
        .closing-summary-stack,
        .closing-dual-grid {
          display: grid;
          gap: 14px;
        }
        .closing-kpi-row {
          display: grid;
          gap: 10px;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          margin-bottom: 14px;
        }
        .closing-dual-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .closing-section {
          display: grid;
          gap: 10px;
        }
        .closing-section-head {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .closing-section-head h4 {
          margin: 0;
          font-size: 15px;
        }
        .closing-section-head p {
          margin: 0;
          color: var(--muted);
          font-size: 12px;
        }
        .closing-card-grid {
          display: grid;
          gap: 10px;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
        }
        .closing-summary-card {
          border: 1px solid var(--border);
          border-radius: 10px;
          background: #fff;
          padding: 12px;
          display: grid;
          gap: 10px;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
        }
        .closing-summary-card.success {
          border-color: rgba(22, 163, 74, 0.18);
          background: linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%);
        }
        .closing-summary-card.warning {
          border-color: rgba(245, 158, 11, 0.22);
          background: linear-gradient(180deg, #ffffff 0%, #fffbeb 100%);
        }
        .closing-summary-card.muted {
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        }
        .closing-summary-card-copy {
          display: grid;
          gap: 4px;
        }
        .closing-summary-card-copy small {
          color: var(--muted);
          font-size: 11px;
          font-weight: 800;
        }
        .closing-summary-card-copy strong {
          font-size: 13px;
        }
        .closing-summary-amount {
          position: relative;
          border: none;
          background: transparent;
          padding: 0;
          text-align: right;
          cursor: pointer;
          color: inherit;
          font-size: 22px;
          font-weight: 900;
          line-height: 1.1;
        }
        .closing-detail-table {
          width: 100%;
          border-collapse: collapse;
        }
        .closing-detail-table th,
        .closing-detail-table td {
          border-bottom: 1px solid #e5e7eb;
          padding: 10px 12px;
          text-align: right;
          vertical-align: top;
        }
        .closing-detail-table thead th,
        .closing-detail-table tfoot th {
          background: #f8fafc;
        }
        @media (max-width: 900px) {
          .closing-kpi-row,
          .closing-dual-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}


