import Link from 'next/link';
import { AutoApplyFilterForm } from '../../components/auto-apply-filter-form';
import { DataTable, type DataColumn } from '../../components/data-table';
import { DeleteFinancialRecordButton } from '../../components/delete-financial-record-button';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { buildQuery, fetchList, formatDate, getMoneyFormatter } from '../../lib/api';
import type { BranchOption, SupplierOption } from '../../lib/types';

type SupplierPaymentsPageProps = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

type SupplierPaymentRow = {
  id: string;
  paymentNumber: string;
  purchaseInvoice?: {
    id: string;
    invoiceNumber: string;
    supplier?: { name: string } | null;
  } | null;
  branch?: { name: string } | null;
  paymentDate: string;
  paymentMethod: string;
  amount: number;
  referenceNumber?: string | null;
};

const paymentMethodOptions = [
  { value: 'cash', label: 'نقدي' },
  { value: 'bank', label: 'بنكي' },
  { value: 'other', label: 'أخرى' },
];

function supplierPaymentQuery(params: Record<string, string | undefined>) {
  return buildQuery({
    supplier_id: params.supplier_id,
    branch_id: params.branch_id,
    payment_method: params.payment_method,
    date_from: params.date_from,
    date_to: params.date_to,
    search: params.search,
  });
}

function supplierPaymentExportQuery(params: Record<string, string | undefined>, format: 'excel' | 'pdf') {
  return buildQuery({
    supplier_id: params.supplier_id,
    branch_id: params.branch_id,
    payment_method: params.payment_method,
    date_from: params.date_from,
    date_to: params.date_to,
    search: params.search,
    format,
  });
}

export default async function SupplierPaymentsPage({ searchParams }: SupplierPaymentsPageProps) {
  const currentParams = (await searchParams) ?? {};
  const query = supplierPaymentQuery(currentParams);
  const [result, branchesResult, suppliersResult, formatMoney] = await Promise.all([
    fetchList<SupplierPaymentRow>(`/supplier-payments${query}`),
    fetchList<BranchOption>('/branches'),
    fetchList<SupplierOption>('/suppliers'),
    getMoneyFormatter(),
  ]);

  const columns: DataColumn<SupplierPaymentRow>[] = [
    { key: 'paymentNumber', label: 'رقم الدفعة', render: (row) => row.paymentNumber },
    {
      key: 'supplier',
      label: 'المورد',
      render: (row) => row.purchaseInvoice?.supplier?.name ?? 'متفرقة',
    },
    {
      key: 'purchaseInvoice',
      label: 'الفاتورة',
      render: (row) =>
        row.purchaseInvoice ? (
          <Link className="text-link" href={`/purchase-invoices/${row.purchaseInvoice.id}`}>
            {row.purchaseInvoice.invoiceNumber}
          </Link>
        ) : (
          'غير محدد'
        ),
    },
    { key: 'branch', label: 'الفرع', render: (row) => row.branch?.name ?? 'غير محدد' },
    { key: 'paymentDate', label: 'تاريخ الدفع', render: (row) => formatDate(row.paymentDate) },
    { key: 'paymentMethod', label: 'طريقة الدفع', render: (row) => <StatusBadge value={row.paymentMethod} /> },
    { key: 'amount', label: 'المبلغ', render: (row) => formatMoney(row.amount) },
    { key: 'referenceNumber', label: 'رقم المرجع', render: (row) => row.referenceNumber ?? 'غير محدد' },
    {
      key: 'actions',
      label: 'إجراء',
      render: (row) => (
        <div className="inline-actions">
          <DeleteFinancialRecordButton path={`/supplier-payments/${row.id}`} reverse={false} label="حذف فقط" />
          <DeleteFinancialRecordButton path={`/supplier-payments/${row.id}`} reverse label="حذف وعكس" />
        </div>
      ),
    },
  ];

  const exportBase = '/api/reports/supplier-payments/export';

  return (
    <>
      <PageHeader
        title="دفعات الموردين"
        description="سجل الدفعات النقدية والبنكية مع فلاتر المورد والفرع وطريقة الدفع والتصدير."
        actionLabel="دفعات جديدة"
        actionHref="/supplier-payments/new"
      />

      <section className="report-toolbar">
        <AutoApplyFilterForm className="filters report-filters">
          <label>
            المورد
            <select name="supplier_id" defaultValue={currentParams.supplier_id ?? ''}>
              <option value="">كل الموردين</option>
              {suppliersResult.data.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            الفرع
            <select name="branch_id" defaultValue={currentParams.branch_id ?? ''}>
              <option value="">كل الفروع</option>
              {branchesResult.data.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            طريقة الدفع
            <select name="payment_method" defaultValue={currentParams.payment_method ?? ''}>
              <option value="">كل الطرق</option>
              {paymentMethodOptions.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            من تاريخ
            <input name="date_from" type="date" defaultValue={currentParams.date_from ?? ''} />
          </label>
          <label>
            إلى تاريخ
            <input name="date_to" type="date" defaultValue={currentParams.date_to ?? ''} />
          </label>
          <label>
            بحث
            <input
              name="search"
              placeholder="رقم الدفعة أو المرجع أو الفاتورة"
              defaultValue={currentParams.search ?? ''}
            />
          </label>
          <Link className="secondary-button" href="/supplier-payments">
            مسح
          </Link>
        </AutoApplyFilterForm>

        <div className="report-export-actions">
          <a className="secondary-button" href={`${exportBase}${supplierPaymentExportQuery(currentParams, 'excel')}`}>
            Excel
          </a>
          <a className="secondary-button" href={`${exportBase}${supplierPaymentExportQuery(currentParams, 'pdf')}`}>
            PDF
          </a>
        </div>
      </section>

      {result.error ? <p className="notice">{result.error}</p> : null}
      <DataTable
        columns={columns}
        rows={result.data}
        emptyTitle="لا توجد دفعات موردين"
        emptyText="غيّر الفلاتر أو سجّل دفعة جديدة لتظهر هنا."
      />
    </>
  );
}
