'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';

type DrawerWorkflowDrawer = {
  id: string;
  branchId: string;
  code: string;
  name: string;
  branch?: { name: string } | null;
  defaultOpeningBalance?: number;
  defaultCashFloat?: number;
};

type DrawerReconciliationSummary = {
  id: string | null;
  drawerId: string;
  branchId: string;
  sessionDate: string;
  openingBalance: number;
  calculatedBalance: number;
  theoreticalBalance?: number;
  requiredClosingFloat?: number;
  closingBalance?: number | null;
  differenceAmount: number;
  reconciliationDifference?: number | null;
  movementTotals?: {
    inflows: number;
    outflows: number;
  };
  status: string;
  notes?: string | null;
  isReconciled?: boolean;
};

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat('ar', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

export function DrawerDailyWorkflow({
  drawers,
  summaries,
  today,
}: Readonly<{
  drawers: DrawerWorkflowDrawer[];
  summaries: DrawerReconciliationSummary[];
  today: string;
}>) {
  return (
    <section className="content-grid">
      {drawers.map((drawer) => {
        const summary = summaries.find((item) => item.drawerId === drawer.id);
        return <DrawerWorkflowCard drawer={drawer} key={drawer.id} summary={summary} today={today} />;
      })}
    </section>
  );
}

function DrawerWorkflowCard({
  drawer,
  summary,
  today,
}: Readonly<{
  drawer: DrawerWorkflowDrawer;
  summary?: DrawerReconciliationSummary;
  today: string;
}>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const cashFloat = summary?.requiredClosingFloat ?? drawer.defaultCashFloat ?? drawer.defaultOpeningBalance ?? 0;
  const inflows = summary?.movementTotals?.inflows ?? 0;
  const outflows = summary?.movementTotals?.outflows ?? 0;
  const theoreticalBalance = summary?.theoreticalBalance ?? summary?.calculatedBalance ?? cashFloat + inflows - outflows;
  const difference = summary?.reconciliationDifference ?? summary?.differenceAmount ?? 0;

  async function saveReconciliation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);

    try {
      await submitJson('/drawer-daily-sessions/reconcile', 'POST', {
        drawerId: drawer.id,
        branchId: drawer.branchId,
        sessionDate: today,
        cashFloat: Number(formData.get('cashFloat') || cashFloat),
        actualCashAmount: Number(formData.get('actualCashAmount') || 0),
        notes: String(formData.get('notes') ?? '') || null,
      });
      router.refresh();
      setMessage('تم حفظ تسوية الدرج بنجاح.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ تسوية الدرج.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <article className="panel">
      <div className="panel-heading">
        <div>
          <h3>{drawer.name}</h3>
          <span>{drawer.branch?.name ?? drawer.code}</span>
        </div>
        <span>{summary?.isReconciled ? 'تمت تسوية اليوم' : 'بانتظار إغلاق اليوم'}</span>
      </div>

      {message ? <p className={message.includes('تم ') ? 'notice success' : 'notice danger'}>{message}</p> : null}

      <section className="summary-grid">
        <article className="summary-card">
          <p>العهدة الثابتة</p>
          <strong>{formatMoney(cashFloat)}</strong>
          <span>المبلغ الطبيعي الموجود في بداية اليوم</span>
        </article>
        <article className="summary-card">
          <p>إجمالي الداخل</p>
          <strong>{formatMoney(inflows)}</strong>
          <span>مبيعات نقدية وحركات نقد داخلة</span>
        </article>
        <article className="summary-card">
          <p>إجمالي الخارج</p>
          <strong>{formatMoney(outflows)}</strong>
          <span>مصروفات ودفعات وسلف نقدية</span>
        </article>
        <article className="summary-card">
          <p>الرصيد النظري</p>
          <strong>{formatMoney(theoreticalBalance)}</strong>
          <span>العهدة + الداخل - الخارج</span>
        </article>
        <article className="summary-card">
          <p>النقد الفعلي</p>
          <strong>{summary?.closingBalance === null || summary?.closingBalance === undefined ? 'لم يدخل بعد' : formatMoney(summary.closingBalance)}</strong>
          <span>ما وجده المستخدم عند الإغلاق</span>
        </article>
        <article className="summary-card">
          <p>الفرق</p>
          <strong>{summary?.isReconciled ? formatMoney(difference) : 'لم يحسب بعد'}</strong>
          <span>النقد الفعلي - الرصيد النظري</span>
        </article>
      </section>

      <form className="form-panel" onSubmit={saveReconciliation}>
        <div className="form-grid">
          <label>
            العهدة الثابتة لليوم
            <input name="cashFloat" type="number" min="0" step="0.01" defaultValue={cashFloat} />
          </label>
          <label>
            النقد الفعلي الموجود في الدرج
            <input
              name="actualCashAmount"
              type="number"
              min="0"
              step="0.01"
              defaultValue={summary?.closingBalance ?? ''}
              required
            />
          </label>
        </div>
        <label>
          ملاحظات التسوية
          <textarea name="notes" rows={3} defaultValue={summary?.notes ?? ''} />
        </label>
        <div className="form-actions">
          <button disabled={isSaving} type="submit">
            {isSaving ? 'جاري الحفظ...' : 'حفظ تسوية نهاية اليوم'}
          </button>
        </div>
      </form>
    </article>
  );
}
