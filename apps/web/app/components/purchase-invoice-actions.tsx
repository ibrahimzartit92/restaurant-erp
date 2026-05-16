'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';

export function PurchaseInvoiceActions({
  invoiceId,
  hasPayments,
  isCancelled,
  status,
}: Readonly<{
  invoiceId: string;
  hasPayments: boolean;
  isCancelled: boolean;
  status: string;
}>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function deleteInvoice() {
    if (!confirm('سيتم حذف الفاتورة غير المدفوعة نهائيا. هل تريد المتابعة؟')) return;
    setIsSaving(true);
    setMessage(null);
    try {
      await submitJson(`/purchase-invoices/${invoiceId}/delete`, 'POST', {});
      router.push('/purchase-invoices');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حذف الفاتورة.');
    } finally {
      setIsSaving(false);
    }
  }

  async function cancelInvoice() {
    if (!confirm('سيتم إلغاء الفاتورة وإرجاع إجمالي المدفوعات إلى الخزنة كحركة واردة. هل تريد المتابعة؟')) return;
    setIsSaving(true);
    setMessage(null);
    try {
      await submitJson(`/purchase-invoices/${invoiceId}/cancel`, 'POST', {});
      router.refresh();
      setMessage('تم إلغاء الفاتورة وإرجاع المدفوعات إلى الخزنة.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر إلغاء الفاتورة.');
    } finally {
      setIsSaving(false);
    }
  }

  async function reopenInvoice() {
    if (!confirm('سيتم فتح الفاتورة للتعديل، ولن تعتبر التعديلات معتمدة حتى تضغط إعادة الاعتماد. متابعة؟')) return;
    setIsSaving(true);
    setMessage(null);
    try {
      await submitJson(`/purchase-invoices/${invoiceId}/reopen`, 'POST', {});
      router.push(`/purchase-invoices/${invoiceId}/edit`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر فتح الفاتورة للتعديل.');
    } finally {
      setIsSaving(false);
    }
  }

  async function reapproveInvoice() {
    if (!confirm('سيتم عكس الأثر المعتمد القديم وتطبيق التعديلات الجديدة وإعادة حساب الإقفالات المتأثرة. متابعة؟')) return;
    setIsSaving(true);
    setMessage(null);
    try {
      await submitJson(`/purchase-invoices/${invoiceId}/reapprove`, 'POST', {});
      router.refresh();
      setMessage('تمت إعادة اعتماد الفاتورة وتحديث آثارها المحاسبية.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر إعادة اعتماد الفاتورة.');
    } finally {
      setIsSaving(false);
    }
  }

  if (isCancelled) {
    return <p className="notice">هذه الفاتورة ملغاة ولا يمكن تسجيل دفعات جديدة عليها.</p>;
  }

  return (
    <div className="form-panel">
      {message ? <p className={message.includes('تم ') ? 'notice success' : 'notice danger'}>{message}</p> : null}
      <div className="form-actions">
        {status === 'draft' ? (
          <a className="secondary-button" href={`/purchase-invoices/${invoiceId}/edit`}>
            تعديل المسودة
          </a>
        ) : status === 'reopened' ? (
          <>
            <a className="secondary-button" href={`/purchase-invoices/${invoiceId}/edit`}>
              متابعة التعديل
            </a>
            <button disabled={isSaving} onClick={reapproveInvoice} type="button">
              إعادة الاعتماد
            </button>
          </>
        ) : (
          <button className="secondary-button" disabled={isSaving} onClick={reopenInvoice} type="button">
            إعادة فتح للتعديل
          </button>
        )}
        {hasPayments ? (
          <button className="secondary-button" disabled={isSaving} onClick={cancelInvoice} type="button">
            إلغاء الفاتورة وإرجاع المدفوعات للخزنة
          </button>
        ) : (
          <button className="secondary-button" disabled={isSaving} onClick={deleteInvoice} type="button">
            حذف الفاتورة
          </button>
        )}
      </div>
    </div>
  );
}
