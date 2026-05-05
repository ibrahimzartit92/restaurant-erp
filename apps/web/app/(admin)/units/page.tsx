import Link from 'next/link';
import { DataTable, type DataColumn } from '../../components/data-table';
import { DeleteUnitButton } from '../../components/delete-unit-button';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { fetchList } from '../../lib/api';

type UnitRow = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  notes?: string | null;
};

const columns: DataColumn<UnitRow>[] = [
  { key: 'code', label: 'الكود', render: (row) => row.code },
  { key: 'name', label: 'اسم الوحدة', render: (row) => row.name },
  { key: 'isActive', label: 'الحالة', render: (row) => <StatusBadge value={row.isActive} /> },
  { key: 'notes', label: 'ملاحظات', render: (row) => row.notes ?? 'لا توجد' },
  {
    key: 'actions',
    label: 'إجراءات',
    render: (row) => (
      <div className="inline-actions">
        <Link href={`/units/${row.id}/edit`}>تعديل</Link>
        <DeleteUnitButton unitId={row.id} />
      </div>
    ),
  },
];

export default async function UnitsPage() {
  const result = await fetchList<UnitRow>('/units');

  return (
    <>
      <PageHeader
        title="وحدات القياس"
        description="إدارة وحدات المواد مثل كيلوغرام، قطعة، علبة، ووحدة. تستخدم الوحدة في شاشة المواد والفواتير والتحويلات."
        actionLabel="وحدة جديدة"
        actionHref="/units/new"
      />
      {result.error ? <p className="notice">{result.error}</p> : null}
      <DataTable columns={columns} rows={result.data} emptyTitle="لا توجد وحدات بعد" emptyText="أضف وحدات القياس الأساسية لتظهر في نموذج المادة." />
    </>
  );
}
