import Link from 'next/link';
import { ArchiveDeleteButton } from '../../components/archive-delete-button';
import { DataTable, type DataColumn } from '../../components/data-table';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { fetchList } from '../../lib/api';

type SupplierRow = {
  id: string;
  code: string;
  name: string;
  phone?: string | null;
  defaultDueDays: number;
  isActive: boolean;
};

const columns: DataColumn<SupplierRow>[] = [
  { key: 'code', label: 'الكود', render: (row) => row.code },
  { key: 'name', label: 'اسم المورد', render: (row) => row.name },
  { key: 'phone', label: 'الهاتف', render: (row) => row.phone ?? 'غير محدد' },
  { key: 'defaultDueDays', label: 'مهلة الدفع', render: (row) => `${row.defaultDueDays} يوم` },
  { key: 'isActive', label: 'الحالة', render: (row) => <StatusBadge value={row.isActive} /> },
  {
    key: 'actions',
    label: 'إجراءات',
    render: (row) => (
      <div className="inline-actions">
        <Link className="text-link" href={`/suppliers/${row.id}/edit`}>تعديل</Link>
        <ArchiveDeleteButton path={`/suppliers/${row.id}`} entityLabel="المورد" />
      </div>
    ),
  },
];

export default async function SuppliersPage() {
  const result = await fetchList<SupplierRow>('/suppliers');

  return (
    <>
      <PageHeader
        title="الموردون"
        description="سجل الموردين الأساسي المستخدم في فواتير الشراء والمدفوعات."
        actionLabel="مورد جديد"
        actionHref="/suppliers/new"
      />
      {result.error ? <p className="notice">{result.error}</p> : null}
      <DataTable
        columns={columns}
        rows={result.data}
        emptyTitle="لا يوجد موردون بعد"
        emptyText="ابدأ بإضافة الموردين من نقاط النهاية المتاحة، وستظهر البيانات هنا."
      />
    </>
  );
}
