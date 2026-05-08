import Link from 'next/link';
import { PageHeader } from '../../../components/page-header';
import {
  TransferWholesaleCashForm,
  WholesaleInvoiceStatusActions,
  WholesalePaymentBatchForm,
} from '../../../components/wholesale-sales-actions';
import { fetchList, fetchOne, formatDate, formatMoney } from '../../../lib/api';
import type { BankAccountOption, DrawerOption, VaultOption, WholesaleSalesInvoiceSummary } from '../../../lib/types';

const documentLabels: Record<WholesaleSalesInvoiceSummary['documentStatus'], string> = {
  draft: 'مسودة',
  approved: 'معتمدة',
  cancelled: 'ملغاة',
};

const collectionLabels: Record<WholesaleSalesInvoiceSummary['paymentStatus'], string> = {
  unpaid: 'غير محصلة',
  partially_paid: 'محصلة جزئيًا',
  paid: 'محصلة بالكامل',
};

function collectionDestination(payment: NonNullable<WholesaleSalesInvoiceSummary['payments']>[number]) {
  if (payment.paymentMethod === 'cash') return payment.drawer?.name ? `درج: ${payment.drawer.name}` : 'درج';
  if (payment.paymentMethod === 'vault') return payment.vault?.name ? `خزنة: ${payment.vault.name}` : 'خزنة';
  return payment.bankAccount?.name ? `حساب بنكي: ${payment.bankAccount.name}` : 'حساب بنكي';
}

export default async function WholesaleSalesInvoiceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [invoiceResult, drawersResult, vaultsResult, bankAccountsResult] = await Promise.all([
    fetchOne<WholesaleSalesInvoiceSummary>(`/wholesale-sales-invoices/${id}`),
    fetchList<DrawerOption>('/drawers'),
    fetchList<VaultOption>('/vaults'),
    fetchList<BankAccountOption>('/bank-accounts'),
  ]);
  const invoice = invoiceResult.data;
  const cashCollected = (invoice?.payments ?? [])
    .filter((payment) => payment.paymentMethod === 'cash')
    .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
  const transferableCash = Math.max(cashCollected - Number(invoice?.cashTransferredAmount ?? 0), 0);

  return (
    <>
      <PageHeader title="تفاصيل فاتورة بيع الجملة" description="عرض الفاتورة، التحصيلات، تحذيرات المخزون، وخيارات التصدير والتحويل اليدوي للخزنة." />
      {invoiceResult.error ? <p className="notice danger">{invoiceResult.error}</p> : null}
      {invoice ? (
        <>
          <section className="payroll-card">
            <div className="payroll-card-header">
              <div>
                <span>مطعم الجود</span>
                <h3>{invoice.invoiceNumber}</h3>
                <p>
                  {formatDate(invoice.invoiceDate)} - {invoice.customer?.name}
                </p>
              </div>
              <div className="inline-actions">
                <a className="secondary-button" href={`/api/wholesale-sales-invoices/${invoice.id}/export?format=pdf`}>
                  PDF
                </a>
                <a className="secondary-button" href={`/api/wholesale-sales-invoices/${invoice.id}/export?format=excel`}>
                  Excel
                </a>
              </div>
            </div>
            <div className="payroll-amount-grid">
              <span className="payroll-amount"><small>حالة الفاتورة</small><strong>{documentLabels[invoice.documentStatus]}</strong></span>
              <span className="payroll-amount"><small>حالة التحصيل</small><strong>{collectionLabels[invoice.paymentStatus]}</strong></span>
              <span className="payroll-amount"><small>المخزن</small><strong>{invoice.warehouse?.name}</strong></span>
              <span className="payroll-amount"><small>الإجمالي</small><strong>{formatMoney(invoice.totalAmount)}</strong></span>
              <span className="payroll-amount"><small>المحصل</small><strong>{formatMoney(invoice.paidAmount)}</strong></span>
              <span className="payroll-amount"><small>المتبقي للتحصيل</small><strong>{formatMoney(invoice.remainingAmount)}</strong></span>
            </div>
            <WholesaleInvoiceStatusActions invoiceId={invoice.id} canApprove={invoice.documentStatus === 'draft'} />
          </section>

          {invoice.stockWarnings?.length ? (
            <section className="payroll-card">
              <h3>تحذيرات المخزون</h3>
              {invoice.stockWarnings.map((warning) => (
                <p className="notice warning" key={warning.itemId}>
                  {warning.itemName}: المتاح {warning.availableQuantity} والكمية المطلوبة {warning.requestedQuantity}. التحذير لا يمنع البيع.
                </p>
              ))}
            </section>
          ) : null}

          <section className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>المادة</th>
                  <th>الكمية</th>
                  <th>سعر الوحدة</th>
                  <th>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((line) => (
                  <tr key={line.id}>
                    <td>{line.item?.name}</td>
                    <td>{line.quantity}</td>
                    <td>{formatMoney(line.unitPrice)}</td>
                    <td>{formatMoney(line.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="payroll-card">
            <div className="payroll-card-header">
              <div>
                <span>تحصيلات الفاتورة</span>
                <h3>تسجيل تحصيل جديد</h3>
                <p>يدعم التحصيل الجزئي أو الكامل إلى الدرج أو الخزنة أو الحساب البنكي.</p>
              </div>
            </div>
            <WholesalePaymentBatchForm
              invoiceId={invoice.id}
              branchId={invoice.branchId}
              remainingAmount={Number(invoice.remainingAmount ?? 0)}
              drawers={drawersResult.data}
              vaults={vaultsResult.data}
              bankAccounts={bankAccountsResult.data}
            />
          </section>

          <section className="payroll-card">
            <div className="payroll-card-header">
              <div>
                <span>التحصيل النقدي في الدرج</span>
                <h3>{formatMoney(transferableCash)}</h3>
                <p>النقد المحصل في الدرج يبقى كتجميع نقدي حتى يتم تحويله يدويًا لخزنة مختارة.</p>
              </div>
              <Link className="text-link" href="/vaults">
                الخزن
              </Link>
            </div>
            <TransferWholesaleCashForm
              invoiceId={invoice.id}
              drawers={drawersResult.data}
              vaults={vaultsResult.data}
              availableAmount={transferableCash}
            />
          </section>

          {invoice.payments?.length ? (
            <section className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>رقم التحصيل</th>
                    <th>التاريخ</th>
                    <th>الجهة المستلمة</th>
                    <th>المرجع</th>
                    <th>المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{payment.paymentNumber}</td>
                      <td>{formatDate(payment.paymentDate)}</td>
                      <td>{collectionDestination(payment)}</td>
                      <td>{payment.referenceNumber ?? '-'}</td>
                      <td>{formatMoney(payment.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
        </>
      ) : null}
    </>
  );
}
