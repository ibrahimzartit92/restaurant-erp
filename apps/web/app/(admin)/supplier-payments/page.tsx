import { DataTable, type DataColumn } from '../../components/data-table';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { fetchList, formatDate, formatMoney } from '../../lib/api';

type SupplierPaymentRow = {
  id: string;
  paymentNumber: string;
  purchaseInvoice?: { invoiceNumber: string } | null;
  branch?: { name: string } | null;
  paymentDate: string;
  paymentMethod: string;
  amount: number;
  referenceNumber?: string | null;
};

const columns: DataColumn<SupplierPaymentRow>[] = [
  { key: 'paymentNumber', label: 'رقم الدفعة', render: (row) => row.paymentNumber },
  {
    key: 'purchaseInvoice',
    label: 'الفاتورة',
    render: (row) => row.purchaseInvoice?.invoiceNumber ?? 'غير محدد',
  },
  { key: 'branch', label: 'الفرع', render: (row) => row.branch?.name ?? 'غير محدد' },
  { key: 'paymentDate', label: 'تاريخ الدفع', render: (row) => formatDate(row.paymentDate) },
  { key: 'paymentMethod', label: 'طريقة الدفع', render: (row) => <StatusBadge value={row.paymentMethod} /> },
  { key: 'amount', label: 'المبلغ', render: (row) => formatMoney(row.amount) },
  { key: 'referenceNumber', label: 'المرجع', render: (row) => row.referenceNumber ?? 'غير محدد' },
];

export default async function SupplierPaymentsPage() {
  const result = await fetchList<SupplierPaymentRow>('/supplier-payments');

  return (
    <>
      <PageHeader
        title="دفعات الموردين"
        description="سجل الدفعات المرتبطة بفواتير الشراء النقدية والبنكية."
        actionLabel="دفعة جديدة"
      />
      {result.error ? <p className="notice">{result.error}</p> : null}
      <DataTable
        columns={columns}
        rows={result.data}
        emptyTitle="لا توجد دفعات موردين"
        emptyText="بعد تسجيل دفعة على فاتورة شراء ستظهر في هذا السجل."
      />
    </>
  );
}
