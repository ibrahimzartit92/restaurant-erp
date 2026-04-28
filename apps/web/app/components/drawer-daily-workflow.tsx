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

type DrawerWorkflowSession = {
  id: string;
  drawerId: string;
  branchId: string;
  sessionDate: string;
  openingBalance: number;
  calculatedBalance: number;
  requiredClosingFloat?: number;
  closingBalance?: number | null;
  differenceAmount: number;
  status: string;
};

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat('ar', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

export function DrawerDailyWorkflow({
  drawers,
  todaySessions,
  today,
}: Readonly<{
  drawers: DrawerWorkflowDrawer[];
  todaySessions: DrawerWorkflowSession[];
  today: string;
}>) {
  return (
    <section className="content-grid">
      {drawers.map((drawer) => {
        const session = todaySessions.find((item) => item.drawerId === drawer.id);
        return <DrawerWorkflowCard drawer={drawer} key={drawer.id} session={session} today={today} />;
      })}
    </section>
  );
}

function DrawerWorkflowCard({
  drawer,
  session,
  today,
}: Readonly<{
  drawer: DrawerWorkflowDrawer;
  session?: DrawerWorkflowSession;
  today: string;
}>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const requiredFloat = session?.requiredClosingFloat ?? drawer.defaultCashFloat ?? drawer.defaultOpeningBalance ?? 0;
  const expectedWithdraw = Math.max((session?.calculatedBalance ?? 0) - requiredFloat, 0);

  async function openSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);

    try {
      await submitJson('/drawer-daily-sessions', 'POST', {
        drawerId: drawer.id,
        branchId: drawer.branchId,
        sessionDate: today,
        openingBalance: Number(formData.get('openingBalance') || drawer.defaultOpeningBalance || 0),
        requiredClosingFloat: Number(formData.get('requiredClosingFloat') || requiredFloat),
      });
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر فتح جلسة الدرج.');
    } finally {
      setIsSaving(false);
    }
  }

  async function closeSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      return;
    }

    setIsSaving(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);

    try {
      await submitJson(`/drawer-daily-sessions/${session.id}/close`, 'POST', {
        closingBalance: Number(formData.get('closingBalance') ?? 0),
        requiredClosingFloat: Number(formData.get('requiredClosingFloat') || requiredFloat),
        notes: String(formData.get('notes') ?? '') || null,
      });
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر إغلاق جلسة الدرج.');
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
        <span>{session ? (session.status === 'open' ? 'مفتوحة' : 'مغلقة') : 'لا توجد جلسة اليوم'}</span>
      </div>

      {message ? <p className="notice danger">{message}</p> : null}

      {!session ? (
        <form className="form-panel" onSubmit={openSession}>
          <div className="form-grid">
            <label>
              الرصيد الافتتاحي
              <input
                name="openingBalance"
                type="number"
                min="0"
                step="0.01"
                defaultValue={drawer.defaultOpeningBalance ?? 0}
                required
              />
            </label>
            <label>
              مبلغ الفكة الثابت
              <input
                name="requiredClosingFloat"
                type="number"
                min="0"
                step="0.01"
                defaultValue={drawer.defaultCashFloat ?? drawer.defaultOpeningBalance ?? 0}
              />
            </label>
          </div>
          <div className="form-actions">
            <button disabled={isSaving} type="submit">
              {isSaving ? 'جار الفتح...' : 'فتح جلسة اليوم'}
            </button>
          </div>
        </form>
      ) : (
        <>
          <section className="summary-grid">
            <article className="summary-card">
              <p>الافتتاحي</p>
              <strong>{formatMoney(session.openingBalance)}</strong>
              <span>بداية اليوم</span>
            </article>
            <article className="summary-card">
              <p>الفكة الثابتة</p>
              <strong>{formatMoney(requiredFloat)}</strong>
              <span>المبلغ المطلوب تركه</span>
            </article>
            <article className="summary-card">
              <p>المحسوب</p>
              <strong>{formatMoney(session.calculatedBalance)}</strong>
              <span>بعد حركات اليوم</span>
            </article>
            <article className="summary-card">
              <p>المبلغ المتوقع سحبه</p>
              <strong>{formatMoney(expectedWithdraw)}</strong>
              <span>إذا كانت الجلسة سليمة</span>
            </article>
          </section>

          {session.status === 'open' ? (
            <form className="form-panel" onSubmit={closeSession}>
              <div className="form-grid">
                <label>
                  الرصيد الفعلي عند الإغلاق
                  <input name="closingBalance" type="number" min="0" step="0.01" required />
                </label>
                <label>
                  مبلغ الفكة المطلوب
                  <input name="requiredClosingFloat" type="number" min="0" step="0.01" defaultValue={requiredFloat} />
                </label>
              </div>
              <label>
                ملاحظات الإغلاق
                <textarea name="notes" rows={3} />
              </label>
              <div className="form-actions">
                <button disabled={isSaving} type="submit">
                  {isSaving ? 'جار الإغلاق...' : 'إغلاق جلسة اليوم'}
                </button>
              </div>
            </form>
          ) : (
            <p className="notice">
              تم إغلاق الجلسة برصيد فعلي {formatMoney(session.closingBalance)} وفرق {formatMoney(session.differenceAmount)}.
            </p>
          )}
        </>
      )}
    </article>
  );
}
