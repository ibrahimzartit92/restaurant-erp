import Link from 'next/link';
import { DataTable, type DataColumn } from '../../components/data-table';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { fetchList, formatMoney } from '../../lib/api';

type ItemRow = {
  id: string;
  code: string;
  name: string;
  category?: { name: string } | null;
  unit?: { name: string } | null;
  purchasePrice?: number;
  initialPrice?: number;
  costPrice: number;
  salePrice: number;
  isActive: boolean;
};

const columns: DataColumn<ItemRow>[] = [
  { key: 'code', label: 'الكود', render: (row) => row.code },
  { key: 'name', label: 'اسم المادة', render: (row) => row.name },
  { key: 'category', label: 'التصنيف', render: (row) => row.category?.name ?? 'غير محدد' },
  { key: 'unit', label: 'الوحدة', render: (row) => row.unit?.name ?? 'غير محدد' },
  { key: 'purchasePrice', label: 'سعر الشراء', render: (row) => formatMoney(row.purchasePrice ?? row.initialPrice ?? 0) },
  { key: 'costPrice', label: 'سعر التكلفة', render: (row) => formatMoney(row.costPrice) },
  { key: 'salePrice', label: 'سعر البيع', render: (row) => formatMoney(row.salePrice) },
  { key: 'isActive', label: 'الحالة', render: (row) => <StatusBadge value={row.isActive} /> },
  { key: 'actions', label: 'إجراءات', render: (row) => <Link href={`/items/${row.id}/edit`}>تعديل</Link> },
];

export default async function ItemsPage() {
  const result = await fetchList<ItemRow>('/items');

  return (
    <>
      <PageHeader
        title="المواد"
        description="قائمة المواد المستخدمة في المشتريات والمخزون والبيع مع أسعار الشراء والتكلفة والبيع."
        actionLabel="مادة جديدة"
        actionHref="/items/new"
      />
      {result.error ? <p className="notice">{result.error}</p> : null}
      <DataTable
        columns={columns}
        rows={result.data}
        emptyTitle="لا توجد مواد بعد"
        emptyText="أضف المواد الأساسية حتى تظهر في فواتير الشراء والتحويلات والجرد."
      />
    </>
  );
}
