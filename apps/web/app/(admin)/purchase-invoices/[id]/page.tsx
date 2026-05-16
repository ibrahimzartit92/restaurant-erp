import { notFound } from 'next/navigation';
import { AttachmentsPanel } from '../../../components/attachments-panel';
import { DataTable, type DataColumn } from '../../../components/data-table';
import { PageHeader } from '../../../components/page-header';
import { PurchaseInvoiceActions } from '../../../components/purchase-invoice-actions';
import { PurchaseInvoicePaymentPanel } from '../../../components/purchase-invoice-payment-panel';
import { StatusBadge } from '../../../components/status-badge';
import { fetchList, fetchOne, formatDate, getMoneyFormatter, getCurrencySettings } from '../../../lib/api';
import type { AttachmentSummary, BankAccountOption, DrawerOption, VaultOption } from '../../../lib/types';

type PurchaseInvoiceDetails = {
  id: string;
  invoiceNumber: string;
  invoiceLabel?: string | null;
  invoiceDate: string;
  branchId: string;
  dueDate?: string | null;
  status: string;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  modifiedAfterApproval?: boolean;
  approvalModificationLog?: {
    id: string;
    actionType: 'reopened' | 'reapproved';
    recordedAt: string;
    reference: string;
    changes: {
      field: string;
      label: string;
      oldValue: string | number | null;
      newValue: string | number | null;
    }[];
  }[] | null;
  notes?: string | null;
  branch?: { name: string } | null;
  warehouse?: { name: string } | null;
  supplier?: { name: string } | null;
  items: {
    id: string;
    item?: { code: string; name: string } | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    notes?: string | null;
  }[];
  payments: {
    id: string;
    paymentNumber: string;
    paymentDate: string;
    amount: number;
    paymentMethod: string;
    drawer?: { name: string } | null;
    bankAccount?: { name: string } | null;
    vault?: { name: string } | null;
    referenceNumber?: string | null;
  }[];
};

export default async function PurchaseInvoiceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [invoiceResult, attachmentsResult, drawersResult, bankAccountsResult, vaultsResult, currencySettings, formatMoney] =
    await Promise.all([
      fetchOne<PurchaseInvoiceDetails>(`/purchase-invoices/${id}`),
      fetchList<AttachmentSummary>(`/attachments?entity_type=purchase_invoice&entity_id=${id}`),
      fetchList<DrawerOption>('/drawers'),
      fetchList<BankAccountOption>('/bank-accounts'),
      fetchList<VaultOption>('/vaults'),
      getCurrencySettings(),
      getMoneyFormatter(),
    ]);

  if (!invoiceResult.data) {
    notFound();
  }

  const invoice = invoiceResult.data;
  const isCancelled = invoice.status === 'cancelled';
  const isReopened = invoice.status === 'reopened';
  const itemColumns: DataColumn<PurchaseInvoiceDetails['items'][number]>[] = [
    { key: 'code', label: 'كود المادة', render: (row) => row.item?.code ?? 'غير محدد' },
    { key: 'name', label: 'المادة', render: (row) => row.item?.name ?? 'غير محدد' },
    { key: 'quantity', label: 'الكمية', render: (row) => row.quantity },
    { key: 'unitPrice', label: 'سعر الوحدة', render: (row) => formatMoney(row.unitPrice) },
    { key: 'lineTotal', label: 'الإجمالي', render: (row) => formatMoney(row.lineTotal) },
    { key: 'notes', label: 'ملاحظات', render: (row) => row.notes ?? 'بدون ملاحظات' },
  ];
  const paymentColumns: DataColumn<PurchaseInvoiceDetails['payments'][number]>[] = [
    { key: 'paymentNumber', label: 'رقم الدفعة', render: (row) => row.paymentNumber },
    { key: 'paymentDate', label: 'التاريخ', render: (row) => formatDate(row.paymentDate) },
    { key: 'amount', label: 'المبلغ', render: (row) => formatMoney(row.amount) },
    { key: 'paymentMethod', label: 'الطريقة', render: (row) => <StatusBadge value={row.paymentMethod} /> },
    { key: 'source', label: 'المصدر', render: (row) => row.drawer?.name ?? row.bankAccount?.name ?? row.vault?.name ?? 'غير محدد' },
    { key: 'referenceNumber', label: 'المرجع', render: (row) => row.referenceNumber ?? 'غير محدد' },
  ];

  return (
    <>
      <PageHeader title="تفاصيل فاتورة الشراء" description="صفحة واضحة لمراجعة الفاتورة، الدفعات، وتسديد المتبقي." />

      <section className="summary-grid">
        <article className="summary-card">
          <p>إجمالي الفاتورة</p>
          <strong>{formatMoney(invoice.totalAmount)}</strong>
          <span>قبل الخصم {formatMoney(invoice.subtotalAmount)} - الخصم {formatMoney(invoice.discountAmount)}</span>
        </article>
        <article className="summary-card">
          <p>إجمالي المدفوع</p>
          <strong>{formatMoney(invoice.paidAmount)}</strong>
          <span>{invoice.payments.length} دفعة مسجلة</span>
        </article>
        <article className="summary-card">
          <p>المتبقي</p>
          <strong>{formatMoney(invoice.remainingAmount)}</strong>
          <span>{invoice.remainingAmount > 0 ? 'يمكن إضافة دفعة' : 'مسددة بالكامل'}</span>
        </article>
        <article className="summary-card">
          <p>حالة الفاتورة</p>
          <strong><StatusBadge value={invoice.status} /></strong>
          <span>{invoice.modifiedAfterApproval ? 'معدّلة بعد الاعتماد' : invoice.invoiceNumber}</span>
        </article>
      </section>

      {invoice.modifiedAfterApproval ? (
        <details className="panel">
          <summary className="secondary-button compact">معدّلة بعد الاعتماد</summary>
          <div className="timeline-list">
            {(invoice.approvalModificationLog ?? []).map((entry) => (
              <article key={entry.id}>
                <strong>{entry.actionType === 'reapproved' ? 'إعادة اعتماد' : 'إعادة فتح للتعديل'}</strong>
                <span>{formatDate(entry.recordedAt)} - {entry.reference}</span>
                <ul>
                  {entry.changes.slice(0, 8).map((change) => (
                    <li key={`${entry.id}-${change.field}`}>
                      {change.label}: {change.oldValue ?? 'غير محدد'} ← {change.newValue ?? 'غير محدد'}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </details>
      ) : null}

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <h3>بيانات الفاتورة</h3>
              <span>{invoice.invoiceLabel ?? 'بدون وصف'}</span>
            </div>
            <StatusBadge value={invoice.status} />
          </div>
          <ul className="timeline-list">
            <li>تاريخ الفاتورة: {formatDate(invoice.invoiceDate)}</li>
            <li>{invoice.dueDate ? `تاريخ الاستحقاق: ${formatDate(invoice.dueDate)}` : 'بدون تاريخ استحقاق'}</li>
            <li>الفرع: {invoice.branch?.name ?? 'غير محدد'}</li>
            <li>المخزن: {invoice.warehouse?.name ?? 'غير محدد'}</li>
            <li>المورد: {invoice.supplier?.name ?? 'متفرقة'}</li>
            <li>ملاحظات: {invoice.notes ?? 'بدون ملاحظات'}</li>
          </ul>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <h3>الإجراءات</h3>
              <span>إجراءات الفاتورة منفصلة عن إجراءات الدفع.</span>
            </div>
          </div>
          <PurchaseInvoiceActions invoiceId={invoice.id} hasPayments={invoice.payments.length > 0 || Number(invoice.paidAmount) > 0} isCancelled={isCancelled} status={invoice.status} />
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h3>مواد الفاتورة</h3>
          <span>{invoice.items.length} مادة</span>
        </div>
        <DataTable columns={itemColumns} rows={invoice.items} emptyTitle="لا توجد مواد" emptyText="لا توجد مواد مرتبطة بهذه الفاتورة." />
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h3>دفعات الفاتورة</h3>
          <span>كل دفعة هنا مرتبطة بهذه الفاتورة فقط.</span>
        </div>
        <DataTable columns={paymentColumns} rows={invoice.payments} emptyTitle="لا توجد دفعات" emptyText="لا توجد دفعات مسجلة على هذه الفاتورة." />
      </section>

      {!isCancelled && !isReopened ? (
        <>
          {drawersResult.error ? <p className="notice">{drawersResult.error}</p> : null}
          {bankAccountsResult.error ? <p className="notice">{bankAccountsResult.error}</p> : null}
          {vaultsResult.error ? <p className="notice">{vaultsResult.error}</p> : null}
          <PurchaseInvoicePaymentPanel
            invoiceId={invoice.id}
            branchId={invoice.branchId}
            remainingAmount={invoice.remainingAmount}
            drawers={drawersResult.data}
            bankAccounts={bankAccountsResult.data}
            vaults={vaultsResult.data}
            currencySymbol={currencySettings.currencySymbol}
            decimalPlaces={currencySettings.decimalPlaces}
          />
        </>
      ) : isReopened ? <p className="notice">الفاتورة مفتوحة للتعديل. أعد اعتمادها قبل تسجيل دفعات جديدة.</p> : null}

      {attachmentsResult.error ? <p className="notice">{attachmentsResult.error}</p> : null}
      <AttachmentsPanel entityType="purchase_invoice" entityId={invoice.id} initialAttachments={attachmentsResult.data} />
    </>
  );
}
