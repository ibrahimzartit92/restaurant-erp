import Link from 'next/link';
import { AutoApplyFilterForm } from '../../components/auto-apply-filter-form';
import { DataTable, type DataColumn } from '../../components/data-table';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { buildQuery, fetchList, formatDate, getMoneyFormatter } from '../../lib/api';
import type { BranchOption, ItemCategoryOption, SupplierOption } from '../../lib/types';

type PurchaseInvoicesPageProps = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

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

const statusOptions = [
  { value: 'open', label: 'غير مدفوعة' },
  { value: 'partially_paid', label: 'مدفوعة جزئيا' },
  { value: 'paid', label: 'مدفوعة' },
  { value: 'cancelled', label: 'ملغاة' },
  { value: 'draft', label: 'مسودة' },
];

function purchaseInvoiceQuery(params: Record<string, string | undefined>) {
  return buildQuery({
    supplier_id: params.supplier_id,
    branch_id: params.branch_id,
    status: params.status,
    category_id: params.category_id,
    invoice_date_from: params.invoice_date_from,
    invoice_date_to: params.invoice_date_to,
    search: params.search,
  });
}

function purchaseInvoiceExportQuery(params: Record<string, string | undefined>, format: 'excel' | 'pdf') {
  return buildQuery({
    supplier_id: params.supplier_id,
    branch_id: params.branch_id,
    status: params.status,
    category_id: params.category_id,
    date_from: params.invoice_date_from,
    date_to: params.invoice_date_to,
    search: params.search,
    format,
  });
}

export default async function PurchaseInvoicesPage({ searchParams }: PurchaseInvoicesPageProps) {
  const currentParams = (await searchParams) ?? {};
  const query = purchaseInvoiceQuery(currentParams);
  const [result, branchesResult, suppliersResult, categoriesResult, formatMoney] = await Promise.all([
    fetchList<PurchaseInvoiceRow>(`/purchase-invoices${query}`),
    fetchList<BranchOption>('/branches'),
    fetchList<SupplierOption>('/suppliers'),
    fetchList<ItemCategoryOption>('/item-categories'),
    getMoneyFormatter(),
  ]);

  const columns: DataColumn<PurchaseInvoiceRow>[] = [
    {
      key: 'invoiceNumber',
      label: 'رقم الفاتورة',
      render: (row) => (
        <Link className="text-link" href={`/purchase-invoices/${row.id}`}>
          {row.invoiceNumber}
        </Link>
      ),
    },
    { key: 'supplier', label: 'المورد', render: (row) => row.supplier?.name ?? 'متفرقة' },
    { key: 'branch', label: 'الفرع', render: (row) => row.branch?.name ?? 'غير محدد' },
    { key: 'invoiceDate', label: 'تاريخ الفاتورة', render: (row) => formatDate(row.invoiceDate) },
    { key: 'totalAmount', label: 'الإجمالي', render: (row) => formatMoney(row.totalAmount) },
    { key: 'paidAmount', label: 'المدفوع', render: (row) => formatMoney(row.paidAmount) },
    { key: 'remainingAmount', label: 'المتبقي', render: (row) => formatMoney(row.remainingAmount) },
    { key: 'status', label: 'الحالة', render: (row) => <StatusBadge value={row.status} /> },
    {
      key: 'actions',
      label: 'إجراء',
      render: (row) => (
        <Link className="text-link" href={`/purchase-invoices/${row.id}`}>
          التفاصيل
        </Link>
      ),
    },
  ];

  const exportBase = '/api/reports/purchases/export';

  return (
    <>
      <PageHeader
        title="فواتير الشراء"
        description="متابعة فواتير الموردين والفواتير المتفرقة وحالة السداد مع فلاتر وتصدير للمحاسبة اليومية."
        actionLabel="فاتورة جديدة"
        actionHref="/purchase-invoices/new"
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
            تصنيف المادة
            <select name="category_id" defaultValue={currentParams.category_id ?? ''}>
              <option value="">كل التصنيفات</option>
              {categoriesResult.data.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            الحالة
            <select name="status" defaultValue={currentParams.status ?? ''}>
              <option value="">كل الحالات</option>
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            من تاريخ
            <input name="invoice_date_from" type="date" defaultValue={currentParams.invoice_date_from ?? ''} />
          </label>
          <label>
            إلى تاريخ
            <input name="invoice_date_to" type="date" defaultValue={currentParams.invoice_date_to ?? ''} />
          </label>
          <label>
            بحث
            <input
              name="search"
              placeholder="رقم الفاتورة أو الوصف"
              defaultValue={currentParams.search ?? ''}
            />
          </label>
          <Link className="secondary-button" href="/purchase-invoices">
            مسح
          </Link>
        </AutoApplyFilterForm>

        <div className="report-export-actions">
          <a className="secondary-button" href={`${exportBase}${purchaseInvoiceExportQuery(currentParams, 'excel')}`}>
            Excel
          </a>
          <a className="secondary-button" href={`${exportBase}${purchaseInvoiceExportQuery(currentParams, 'pdf')}`}>
            PDF
          </a>
        </div>
      </section>

      {result.error ? <p className="notice">{result.error}</p> : null}
      <DataTable
        columns={columns}
        rows={result.data}
        emptyTitle="لا توجد فواتير شراء"
        emptyText="غيّر الفلاتر أو أنشئ فاتورة شراء جديدة لتظهر هنا."
      />
    </>
  );
}
