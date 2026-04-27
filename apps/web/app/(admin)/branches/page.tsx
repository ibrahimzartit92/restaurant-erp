import Link from 'next/link';
import { DataTable, type DataColumn } from '../../components/data-table';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { fetchList } from '../../lib/api';

type BranchRow = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

const columns: DataColumn<BranchRow>[] = [
  { key: 'code', label: 'الكود', render: (row) => row.code },
  { key: 'name', label: 'اسم الفرع', render: (row) => row.name },
  { key: 'isActive', label: 'الحالة', render: (row) => <StatusBadge value={row.isActive} /> },
];

export default async function BranchesPage() {
  const result = await fetchList<BranchRow>('/branches');

  return (
    <>
      <PageHeader title="الفروع" description="إدارة فروع المطعم وحالة كل فرع." />
      <div className="page-toolbar">
        <span />
        <Link className="primary-button" href="/branches/new">فرع جديد</Link>
      </div>
      {result.error ? <p className="notice">{result.error}</p> : null}
      <DataTable columns={columns} rows={result.data} emptyTitle="لا توجد فروع" emptyText="أضف أول فرع حتى تظهر بيانات التشغيل المرتبطة به." />
    </>
  );
}
