import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DataTable, type DataColumn } from '../../../components/data-table';
import { PageHeader } from '../../../components/page-header';
import { StatusBadge } from '../../../components/status-badge';
import { fetchOne, formatDate, formatMoney } from '../../../lib/api';
import type { StockCountItemSummary, StockCountSummary } from '../../../lib/types';

const itemColumns: DataColumn<StockCountItemSummary>[] = [
  { key: 'code', label: 'كود المادة', render: (row) => row.item.code },
  { key: 'name', label: 'المادة', render: (row) => row.item.name },
  { key: 'systemQuantity', label: 'الكمية بالنظام', render: (row) => row.systemQuantity.toFixed(3) },
  { key: 'countedQuantity', label: 'الكمية المعدودة', render: (row) => row.countedQuantity.toFixed(3) },
  { key: 'differenceQuantity', label: 'الفرق', render: (row) => row.differenceQuantity.toFixed(3) },
  { key: 'estimatedCostDifference', label: 'فرق التكلفة', render: (row) => formatMoney(row.estimatedCostDifference) },
  { key: 'notes', label: 'ملاحظات', render: (row) => row.notes ?? 'بدون ملاحظات' },
];

export default async function StockCountDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchOne<StockCountSummary>(`/stock-counts/${id}`);

  if (!result.data) {
    notFound();
  }

  const stockCount = result.data;
  const totalDifferenceQuantity = stockCount.items.reduce((sum, item) => sum + Number(item.differenceQuantity ?? 0), 0);
  const totalCostDifference = stockCount.items.reduce(
    (sum, item) => sum + Number(item.estimatedCostDifference ?? 0),
    0,
  );

  return (
    <>
      <PageHeader
        title="صفحة تفاصيل الجرد"
        description="عرض عملية الجرد اليدوي مع سطور المواد وفروقات الكميات وفرق التكلفة بشكل واضح وسهل المراجعة."
      />
      <section className="summary-grid">
        <article className="summary-card">
          <p>رقم الجرد</p>
          <strong>{stockCount.countNumber}</strong>
          <span>مرجع عملية الجرد</span>
        </article>
        <article className="summary-card">
          <p>التاريخ</p>
          <strong>{formatDate(stockCount.countDate)}</strong>
          <span>تاريخ تنفيذ الجرد</span>
        </article>
        <article className="summary-card">
          <p>إجمالي فرق الكميات</p>
          <strong>{totalDifferenceQuantity.toFixed(3)}</strong>
          <span>مجموع الفروقات بين النظام والعد</span>
        </article>
        <article className="summary-card">
          <p>إجمالي فرق التكلفة</p>
          <strong>{formatMoney(totalCostDifference)}</strong>
          <span>فرق التكلفة التقديري</span>
        </article>
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-heading">
            <h3>بيانات الجرد</h3>
            <StatusBadge value={stockCount.status} />
          </div>
          <ul className="timeline-list">
            <li>الفرع: {stockCount.branch.name}</li>
            <li>المخزن: {stockCount.warehouse.name}</li>
            <li>الحالة: {stockCount.status}</li>
            <li>ملاحظات: {stockCount.notes ?? 'بدون ملاحظات'}</li>
          </ul>
          <div className="form-actions">
            <Link className="primary-button" href={`/stock-counts/${stockCount.id}/edit`}>
              تعديل الجرد
            </Link>
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <h3>إجراء سريع</h3>
            <span>الجرد</span>
          </div>
          <div className="quick-actions">
            <Link className="quick-link-button" href="/stock-counts">
              قائمة الجرد
            </Link>
            <Link className="quick-link-button" href="/stock-counts/new">
              إضافة جرد جديد
            </Link>
          </div>
        </div>
      </section>

      {result.error ? <p className="notice">{result.error}</p> : null}
      <DataTable
        columns={itemColumns}
        rows={stockCount.items}
        emptyTitle="لا توجد مواد داخل الجرد"
        emptyText="أضف مواد الجرد حتى تظهر هنا مع الكمية بالنظام والكمية المعدودة والفرق."
      />
    </>
  );
}
