import Link from 'next/link';
import { DataTable, type DataColumn } from '../../components/data-table';
import { PageHeader } from '../../components/page-header';
import { buildQuery, fetchList, formatDate, formatMoney } from '../../lib/api';
import type { BranchOption, CustomerOption, WarehouseOption, WholesaleSalesInvoiceSummary } from '../../lib/types';

const documentLabels: Record<WholesaleSalesInvoiceSummary['documentStatus'], string> = {
  draft: 'مسودة',
  approved: 'معتمدة',
  cancelled: 'ملغاة',
};

const paymentLabels: Record<WholesaleSalesInvoiceSummary['paymentStatus'], string> = {
  unpaid: 'غير مدفوعة',
  partially_paid: 'مدفوعة جزئيًا',
  paid: 'مدفوعة بالكامل',
};

function StatusPill({ label, tone }: Readonly<{ label: string; tone: 'muted' | 'success' | 'danger' | 'info' }>) {
  return <span className={`payroll-status ${tone}`}>{label}</span>;
}

const columns: DataColumn<WholesaleSalesInvoiceSummary>[] = [
  {
    key: 'invoiceNumber',
    label: 'رقم الفاتورة',
    render: (row) => (
      <Link className="text-link" href={`/wholesale-sales-invoices/${row.id}`}>
        {row.invoiceNumber}
      </Link>
    ),
  },
  { key: 'customer', label: 'العميل', render: (row) => row.customer?.name ?? 'غير محدد' },
  { key: 'date', label: 'التاريخ', render: (row) => formatDate(row.invoiceDate) },
  { key: 'warehouse', label: 'المخزن', render: (row) => row.warehouse?.name ?? 'غير محدد' },
  {
    key: 'documentStatus',
    label: 'حالة الفاتورة',
    render: (row) => (
      <StatusPill
        label={documentLabels[row.documentStatus]}
        tone={row.documentStatus === 'approved' ? 'success' : row.documentStatus === 'cancelled' ? 'danger' : 'muted'}
      />
    ),
  },
  {
    key: 'paymentStatus',
    label: 'حالة الدفع',
    render: (row) => (
      <StatusPill
        label={paymentLabels[row.paymentStatus]}
        tone={row.paymentStatus === 'paid' ? 'success' : row.paymentStatus === 'partially_paid' ? 'info' : 'danger'}
      />
    ),
  },
  { key: 'total', label: 'الإجمالي', render: (row) => formatMoney(row.totalAmount) },
  { key: 'remaining', label: 'المتبقي', render: (row) => formatMoney(row.remainingAmount) },
];

function exportQuery(params: Record<string, string | undefined>, format: 'excel' | 'pdf') {
  return buildQuery({ ...params, format });
}

export default async function WholesaleSalesInvoicesPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const params = (await searchParams) ?? {};
  const [invoices, customers, warehouses, branches] = await Promise.all([
    fetchList<WholesaleSalesInvoiceSummary>(
      `/wholesale-sales-invoices${buildQuery({
        search: params.search,
        customer_id: params.customer_id,
        warehouse_id: params.warehouse_id,
        branch_id: params.branch_id,
        document_status: params.document_status,
        payment_status: params.payment_status,
        invoice_date_from: params.invoice_date_from,
        invoice_date_to: params.invoice_date_to,
      })}`,
    ),
    fetchList<CustomerOption>('/customers'),
    fetchList<WarehouseOption>('/warehouses'),
    fetchList<BranchOption>('/branches'),
  ]);

  return (
    <>
      <PageHeader title="فواتير بيع الجملة" description="إدارة فواتير البيع، التحصيل، وحالة الخصم من المخزون." />
      <div className="page-toolbar">
        <form className="filters report-filters" action="">
          <label>
            بحث
            <input defaultValue={params.search ?? ''} name="search" placeholder="رقم الفاتورة أو العميل" />
          </label>
          <label>
            العميل
            <select defaultValue={params.customer_id ?? ''} name="customer_id">
              <option value="">كل العملاء</option>
              {customers.data.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            المخزن
            <select defaultValue={params.warehouse_id ?? ''} name="warehouse_id">
              <option value="">كل المخازن</option>
              {warehouses.data.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            الفرع
            <select defaultValue={params.branch_id ?? ''} name="branch_id">
              <option value="">كل الفروع</option>
              {branches.data.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            حالة الفاتورة
            <select defaultValue={params.document_status ?? ''} name="document_status">
              <option value="">كل الحالات</option>
              <option value="draft">مسودة</option>
              <option value="approved">معتمدة</option>
              <option value="cancelled">ملغاة</option>
            </select>
          </label>
          <label>
            حالة الدفع
            <select defaultValue={params.payment_status ?? ''} name="payment_status">
              <option value="">كل الحالات</option>
              <option value="unpaid">غير مدفوعة</option>
              <option value="partially_paid">مدفوعة جزئيًا</option>
              <option value="paid">مدفوعة بالكامل</option>
            </select>
          </label>
          <label>
            من تاريخ
            <input defaultValue={params.invoice_date_from ?? ''} name="invoice_date_from" type="date" />
          </label>
          <label>
            إلى تاريخ
            <input defaultValue={params.invoice_date_to ?? ''} name="invoice_date_to" type="date" />
          </label>
          <button type="submit">تطبيق</button>
        </form>
        <div className="report-export-actions">
          <Link className="primary-button" href="/wholesale-sales-invoices/new">
            فاتورة جديدة
          </Link>
          <a className="secondary-button" href={`/api/wholesale-sales-invoices/export${exportQuery(params, 'excel')}`}>
            Excel
          </a>
          <a className="secondary-button" href={`/api/wholesale-sales-invoices/export${exportQuery(params, 'pdf')}`}>
            PDF
          </a>
        </div>
      </div>
      {invoices.error ? <p className="notice danger">{invoices.error}</p> : null}
      <DataTable columns={columns} rows={invoices.data} emptyTitle="لا توجد فواتير بيع جملة" emptyText="أنشئ فاتورة جديدة وسيتم عرضها هنا." />
    </>
  );
}
