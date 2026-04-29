import { notFound } from 'next/navigation';
import { AttachmentsPanel } from '../../../components/attachments-panel';
import { DataTable, type DataColumn } from '../../../components/data-table';
import { PageHeader } from '../../../components/page-header';
import { PurchaseInvoiceActions } from '../../../components/purchase-invoice-actions';
import { PurchaseInvoicePaymentForm } from '../../../components/purchase-invoice-payment-form';
import { StatusBadge } from '../../../components/status-badge';
import { fetchList, fetchOne, formatDate, formatMoney } from '../../../lib/api';
import type { AttachmentSummary, BankAccountOption, DrawerOption } from '../../../lib/types';

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
    referenceNumber?: string | null;
  }[];
};

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
  { key: 'referenceNumber', label: 'المرجع', render: (row) => row.referenceNumber ?? 'غير محدد' },
];

export default async function PurchaseInvoiceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [invoiceResult, attachmentsResult, drawersResult, bankAccountsResult] = await Promise.all([
    fetchOne<PurchaseInvoiceDetails>(`/purchase-invoices/${id}`),
    fetchList<AttachmentSummary>(`/attachments?entity_type=purchase_invoice&entity_id=${id}`),
    fetchList<DrawerOption>('/drawers'),
    fetchList<BankAccountOption>('/bank-accounts'),
  ]);

  if (!invoiceResult.data) {
    notFound();
  }

  const invoice = invoiceResult.data;

  return (
    <>
      <PageHeader title="تفاصيل فاتورة الشراء" description="مراجعة الفاتورة، المدفوعات، وتسديد المتبقي عند الحاجة." />

      <section className="summary-grid">
        <article className="summary-card">
          <p>رقم الفاتورة</p>
          <strong>{invoice.invoiceNumber}</strong>
          <span>{invoice.invoiceLabel ?? 'بدون وصف'}</span>
        </article>
        <article className="summary-card">
          <p>الإجمالي</p>
          <strong>{formatMoney(invoice.totalAmount)}</strong>
          <span>بعد خصم {formatMoney(invoice.discountAmount)}</span>
        </article>
        <article className="summary-card">
          <p>المدفوع</p>
          <strong>{formatMoney(invoice.paidAmount)}</strong>
          <span>{invoice.payments.length} دفعة مسجلة</span>
        </article>
        <article className="summary-card">
          <p>المتبقي</p>
          <strong>{formatMoney(invoice.remainingAmount)}</strong>
          <StatusBadge value={invoice.status} />
        </article>
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-heading">
            <h3>بيانات الفاتورة</h3>
            <StatusBadge value={invoice.status} />
          </div>
          <ul className="timeline-list">
            <li>التاريخ: {formatDate(invoice.invoiceDate)}</li>
            <li>{invoice.dueDate ? `الاستحقاق: ${formatDate(invoice.dueDate)}` : 'بدون تاريخ استحقاق'}</li>
            <li>الفرع: {invoice.branch?.name ?? 'غير محدد'}</li>
            <li>المخزن: {invoice.warehouse?.name ?? 'غير محدد'}</li>
            <li>المورد: {invoice.supplier?.name ?? 'متفرقة'}</li>
            <li>ملاحظات: {invoice.notes ?? 'بدون ملاحظات'}</li>
          </ul>
        </div>
      </section>

      {invoiceResult.error ? <p className="notice">{invoiceResult.error}</p> : null}
      <DataTable columns={itemColumns} rows={invoice.items} emptyTitle="لا توجد مواد" emptyText="لا توجد مواد مرتبطة بهذه الفاتورة." />
      <DataTable columns={paymentColumns} rows={invoice.payments} emptyTitle="لا توجد دفعات" emptyText="لا توجد دفعات مسجلة على هذه الفاتورة." />

      {invoice.remainingAmount > 0 && invoice.status !== 'cancelled' ? (
        <>
          {drawersResult.error ? <p className="notice">{drawersResult.error}</p> : null}
          {bankAccountsResult.error ? <p className="notice">{bankAccountsResult.error}</p> : null}
          <PurchaseInvoicePaymentForm
            invoiceId={invoice.id}
            branchId={invoice.branchId}
            remainingAmount={invoice.remainingAmount}
            drawers={drawersResult.data}
            bankAccounts={bankAccountsResult.data}
          />
        </>
      ) : null}

      <PurchaseInvoiceActions
        invoiceId={invoice.id}
        hasPayments={invoice.payments.length > 0 || Number(invoice.paidAmount) > 0}
        isCancelled={invoice.status === 'cancelled'}
      />

      {attachmentsResult.error ? <p className="notice">{attachmentsResult.error}</p> : null}
      <AttachmentsPanel entityType="purchase_invoice" entityId={invoice.id} initialAttachments={attachmentsResult.data} />
    </>
  );
}
