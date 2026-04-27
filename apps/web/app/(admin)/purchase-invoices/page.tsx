import { DataTable, type DataColumn } from '../../components/data-table';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { fetchList, formatDate, formatMoney } from '../../lib/api';

type PurchaseInvoiceRow = {
  id: string;
  invoiceNumber: string;
  invoiceLabel?: string | null;
  branch?: { name: string } | null;
  supplier?: { name: string } | null;
  invoiceDate: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
};

const columns: DataColumn<PurchaseInvoiceRow>[] = [
  { key: 'invoiceNumber', label: 'رقم الفاتورة', render: (row) => row.invoiceNumber },
  { key: 'invoiceLabel', label: 'الوصف', render: (row) => row.invoiceLabel ?? 'بدون وصف' },
  { key: 'branch', label: 'الفرع', render: (row) => row.branch?.name ?? 'غير محدد' },
  { key: 'supplier', label: 'المورد', render: (row) => row.supplier?.name ?? 'متفرقة' },
  { key: 'invoiceDate', label: 'التاريخ', render: (row) => formatDate(row.invoiceDate) },
  { key: 'totalAmount', label: 'الإجمالي', render: (row) => formatMoney(row.totalAmount) },
  { key: 'remainingAmount', label: 'المتبقي', render: (row) => formatMoney(row.remainingAmount) },
  { key: 'status', label: 'الحالة', render: (row) => <StatusBadge value={row.status} /> },
];

export default async function PurchaseInvoicesPage() {
  const result = await fetchList<PurchaseInvoiceRow>('/purchase-invoices');

  return (
    <>
      <PageHeader
        title="فواتير الشراء"
        description="متابعة فواتير الموردين والفواتير المتفرقة وحالة السداد."
        actionLabel="فاتورة جديدة"
      />
      {result.error ? <p className="notice">{result.error}</p> : null}
      <DataTable
        columns={columns}
        rows={result.data}
        emptyTitle="لا توجد فواتير شراء"
        emptyText="أنشئ فاتورة شراء من الواجهة الخلفية أو من النموذج القادم لاحقاً."
      />
    </>
  );
}
