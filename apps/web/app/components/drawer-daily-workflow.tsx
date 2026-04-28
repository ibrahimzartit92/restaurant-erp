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
  theoreticalBalance?: number;
  requiredClosingFloat?: number;
  closingBalance?: number | null;
  differenceAmount: number;
  reconciliationDifference?: number | null;
  amountToWithdraw?: number;
  expectedWithdrawalAmount?: number;
  actualWithdrawalAmount?: number | null;
  movementTotals?: {
    inflows: number;
    outflows: number;
  };
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
  const theoreticalBalance = session?.theoreticalBalance ?? session?.calculatedBalance ?? 0;
  const expectedWithdraw = session?.expectedWithdrawalAmount ?? Math.max(theoreticalBalance - requiredFloat, 0);
  const actualWithdraw = session?.actualWithdrawalAmount ?? session?.amountToWithdraw ?? null;
  const difference = session?.reconciliationDifference ?? session?.differenceAmount ?? 0;

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
      setMessage(error instanceof Error ? error.message : 'تعذر إتمام تسوية الدرج.');
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
        <span>{session ? (session.status === 'open' ? 'قيد التسوية' : 'تمت التسوية') : 'لا توجد تسوية اليوم'}</span>
      </div>

      {message ? <p className="notice danger">{message}</p> : null}

      {!session ? (
        <form className="form-panel" onSubmit={openSession}>
          <p className="field-hint">ابدأ تسوية اليوم بالمبلغ الثابت الموجود عادة في الدرج للفكة.</p>
          <div className="form-grid">
            <label>
              الرصيد الافتتاحي / الفكة
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
              المبلغ الذي يجب أن يبقى
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
              {isSaving ? 'جار البدء...' : 'بدء تسوية اليوم'}
            </button>
          </div>
        </form>
      ) : (
        <>
          <section className="summary-grid">
            <article className="summary-card">
              <p>الفكة الثابتة</p>
              <strong>{formatMoney(requiredFloat)}</strong>
              <span>المبلغ الذي يبقى في الدرج</span>
            </article>
            <article className="summary-card">
              <p>إجمالي الداخل</p>
              <strong>{formatMoney(session.movementTotals?.inflows ?? 0)}</strong>
              <span>مبيعات نقدية وحركات داخلة</span>
            </article>
            <article className="summary-card">
              <p>إجمالي الخارج</p>
              <strong>{formatMoney(session.movementTotals?.outflows ?? 0)}</strong>
              <span>مصروفات ودفعات وسلف</span>
            </article>
            <article className="summary-card">
              <p>الرصيد النظري</p>
              <strong>{formatMoney(theoreticalBalance)}</strong>
              <span>الافتتاحي + الداخل - الخارج</span>
            </article>
            <article className="summary-card">
              <p>المبلغ المطلوب سحبه</p>
              <strong>{formatMoney(actualWithdraw ?? expectedWithdraw)}</strong>
              <span>ما يزيد عن الفكة الثابتة</span>
            </article>
            <article className="summary-card">
              <p>الفرق</p>
              <strong>{session.closingBalance === null ? 'لم يدخل بعد' : formatMoney(difference)}</strong>
              <span>النقد الفعلي - الرصيد النظري</span>
            </article>
          </section>

          {session.status === 'open' ? (
            <form className="form-panel" onSubmit={closeSession}>
              <div className="form-grid">
                <label>
                  النقد الفعلي الموجود في الدرج
                  <input name="closingBalance" type="number" min="0" step="0.01" required />
                </label>
                <label>
                  المبلغ الذي يجب أن يبقى
                  <input name="requiredClosingFloat" type="number" min="0" step="0.01" defaultValue={requiredFloat} />
                </label>
              </div>
              <label>
                ملاحظات التسوية
                <textarea name="notes" rows={3} />
              </label>
              <div className="form-actions">
                <button disabled={isSaving} type="submit">
                  {isSaving ? 'جار التسوية...' : 'إتمام تسوية اليوم'}
                </button>
              </div>
            </form>
          ) : (
            <p className="notice">
              تم إدخال نقد فعلي {formatMoney(session.closingBalance)}، والمبلغ المحسوب للسحب {formatMoney(actualWithdraw)}، والفرق {formatMoney(difference)}.
            </p>
          )}
        </>
      )}
    </article>
  );
}
