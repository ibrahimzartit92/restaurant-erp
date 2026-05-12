import { PageHeader } from '../../../components/page-header';
import { WholesaleInvoiceStatusActions } from '../../../components/wholesale-sales-actions';
import { WholesaleInvoiceCollectionsPanel } from '../../../components/wholesale-invoice-collections-panel';
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

export default async function WholesaleSalesInvoiceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [invoiceResult, drawersResult, vaultsResult, bankAccountsResult] = await Promise.all([
    fetchOne<WholesaleSalesInvoiceSummary>(`/wholesale-sales-invoices/${id}`),
    fetchList<DrawerOption>('/drawers'),
    fetchList<VaultOption>('/vaults'),
    fetchList<BankAccountOption>('/bank-accounts'),
  ]);
  const invoice = invoiceResult.data;

  return (
    <>
      <PageHeader title="تفاصيل فاتورة بيع الجملة" description="عرض الفاتورة، التحصيلات، وتحويل النقد إلى الخزنة مع تحديث فوري للبيانات." />
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
            <WholesaleInvoiceStatusActions canApprove={invoice.documentStatus === 'draft'} invoiceId={invoice.id} />
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

          <section className="table-wrap compact-table-rows">
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

          <WholesaleInvoiceCollectionsPanel
            bankAccounts={bankAccountsResult.data}
            drawers={drawersResult.data}
            initialInvoice={invoice}
            vaults={vaultsResult.data}
          />
        </>
      ) : null}
    </>
  );
}
