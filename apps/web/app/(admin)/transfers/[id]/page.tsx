import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DataTable, type DataColumn } from '../../../components/data-table';
import { PageHeader } from '../../../components/page-header';
import { StatusBadge } from '../../../components/status-badge';
import { fetchOne, formatDate, formatMoney } from '../../../lib/api';
import type { BranchTransferItemSummary, BranchTransferSummary } from '../../../lib/types';

const itemColumns: DataColumn<BranchTransferItemSummary>[] = [
  { key: 'code', label: 'كود المادة', render: (row) => row.item.code },
  { key: 'name', label: 'المادة', render: (row) => row.item.name },
  { key: 'quantity', label: 'الكمية', render: (row) => row.quantity },
  { key: 'unit', label: 'الوحدة', render: (row) => row.item.unit?.name ?? 'غير محددة' },
  { key: 'unitCost', label: 'تكلفة الوحدة', render: (row) => formatMoney(row.unitCost) },
  { key: 'lineTotal', label: 'الإجمالي', render: (row) => formatMoney(row.lineTotal) },
  { key: 'notes', label: 'ملاحظات', render: (row) => row.notes ?? 'بدون ملاحظات' },
];

export default async function TransferDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchOne<BranchTransferSummary>(`/transfers/${id}`);

  if (!result.data) {
    notFound();
  }

  const transfer = result.data;

  return (
    <>
      <PageHeader
        title="صفحة تفاصيل التحويل"
        description="عرض بيانات التحويل بين الفروع مع المواد والكميات والتكلفة الإجمالية وجاهزية التوسعة للطباعة والتأثير المخزني لاحقًا."
      />

      <section className="summary-grid">
        <article className="summary-card">
          <p>رقم التحويل</p>
          <strong>{transfer.transferNumber}</strong>
          <span>مرجع التحويل الحالي</span>
        </article>
        <article className="summary-card">
          <p>التاريخ</p>
          <strong>{formatDate(transfer.transferDate)}</strong>
          <span>تاريخ تنفيذ التحويل</span>
        </article>
        <article className="summary-card">
          <p>عدد المواد</p>
          <strong>{transfer.items.length}</strong>
          <span>عدد البنود داخل التحويل</span>
        </article>
        <article className="summary-card">
          <p>إجمالي التكلفة</p>
          <strong>{formatMoney(transfer.totalCostAmount)}</strong>
          <span>القيمة الكلية للمواد</span>
        </article>
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-heading">
            <h3>بيانات التحويل</h3>
            <StatusBadge value={transfer.status} />
          </div>
          <ul className="timeline-list">
            <li>من فرع: {transfer.fromBranch.name}</li>
            <li>إلى فرع: {transfer.toBranch.name}</li>
            <li>من مخزن: {transfer.fromWarehouse.name}</li>
            <li>إلى مخزن: {transfer.toWarehouse.name}</li>
            <li>الحالة: {transfer.status}</li>
            <li>ملاحظات: {transfer.notes ?? 'بدون ملاحظات'}</li>
          </ul>
          <div className="form-actions">
            <Link className="primary-button" href={`/transfers/${transfer.id}/edit`}>
              تعديل التحويل
            </Link>
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <h3>إجراء سريع</h3>
            <span>التحويلات</span>
          </div>
          <div className="quick-actions">
            <Link className="quick-link-button" href="/transfers">
              قائمة التحويلات
            </Link>
            <Link className="quick-link-button" href="/transfers/new">
              إضافة تحويل جديد
            </Link>
          </div>
        </div>
      </section>

      {result.error ? <p className="notice">{result.error}</p> : null}
      <DataTable
        columns={itemColumns}
        rows={transfer.items}
        emptyTitle="لا توجد مواد داخل هذا التحويل"
        emptyText="أضف مواد للتحويل حتى تظهر هنا مع الكمية وتكلفة الوحدة والإجمالي."
      />
    </>
  );
}
