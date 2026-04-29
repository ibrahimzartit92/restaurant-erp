'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';

export function PurchaseInvoiceActions({
  invoiceId,
  hasPayments,
  isCancelled,
}: Readonly<{
  invoiceId: string;
  hasPayments: boolean;
  isCancelled: boolean;
}>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function deleteInvoice() {
    if (!confirm('سيتم حذف الفاتورة غير المدفوعة نهائيا. هل تريد المتابعة؟')) return;
    setIsSaving(true);
    setMessage(null);
    try {
      await submitJson(`/purchase-invoices/${invoiceId}`, 'DELETE', {});
      router.push('/purchase-invoices');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حذف الفاتورة.');
    } finally {
      setIsSaving(false);
    }
  }

  async function cancelInvoice() {
    if (!confirm('سيتم إلغاء الفاتورة وتسجيل حركات عكسية لكل المدفوعات النقدية والبنكية. هل تريد المتابعة؟')) return;
    setIsSaving(true);
    setMessage(null);
    try {
      await submitJson(`/purchase-invoices/${invoiceId}/cancel`, 'POST', {});
      router.refresh();
      setMessage('تم إلغاء الفاتورة وعكس أثر المدفوعات.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر إلغاء الفاتورة.');
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
        {hasPayments ? (
          <button className="secondary-button" disabled={isSaving} onClick={cancelInvoice} type="button">
            إلغاء الفاتورة مع عكس المدفوعات
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
