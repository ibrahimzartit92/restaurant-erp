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
  costPrice: number;
  salePrice: number;
  isActive: boolean;
};

const columns: DataColumn<ItemRow>[] = [
  { key: 'code', label: 'الكود', render: (row) => row.code },
  { key: 'name', label: 'اسم المادة', render: (row) => row.name },
  { key: 'category', label: 'التصنيف', render: (row) => row.category?.name ?? 'غير محدد' },
  { key: 'unit', label: 'الوحدة', render: (row) => row.unit?.name ?? 'غير محدد' },
  { key: 'costPrice', label: 'سعر التكلفة', render: (row) => formatMoney(row.costPrice) },
  { key: 'salePrice', label: 'سعر البيع', render: (row) => formatMoney(row.salePrice) },
  { key: 'isActive', label: 'الحالة', render: (row) => <StatusBadge value={row.isActive} /> },
];

export default async function ItemsPage() {
  const result = await fetchList<ItemRow>('/items');

  return (
    <>
      <PageHeader
        title="المواد"
        description="قائمة المواد المستخدمة في المشتريات والمخزون والبيع."
        actionLabel="مادة جديدة"
      />
      {result.error ? <p className="notice">{result.error}</p> : null}
      <DataTable
        columns={columns}
        rows={result.data}
        emptyTitle="لا توجد مواد بعد"
        emptyText="عند إضافة المواد من الواجهة الخلفية ستظهر هنا مباشرة."
      />
    </>
  );
}
