import Link from 'next/link';
import { DataTable, type DataColumn } from '../../components/data-table';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { fetchList } from '../../lib/api';

type WarehouseRow = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

const columns: DataColumn<WarehouseRow>[] = [
  { key: 'code', label: 'الكود', render: (row) => row.code },
  { key: 'name', label: 'اسم المخزن', render: (row) => row.name },
  { key: 'isActive', label: 'الحالة', render: (row) => <StatusBadge value={row.isActive} /> },
];

export default async function WarehousesPage() {
  const result = await fetchList<WarehouseRow>('/warehouses');

  return (
    <>
      <PageHeader title="المخازن" description="متابعة مخازن الفروع ومراكز التخزين." />
      <div className="page-toolbar">
        <span />
        <Link className="primary-button" href="/warehouses/new">مخزن جديد</Link>
      </div>
      {result.error ? <p className="notice">{result.error}</p> : null}
      <DataTable columns={columns} rows={result.data} emptyTitle="لا توجد مخازن" emptyText="أضف مخزنا حتى يمكن استخدامه في فواتير الشراء والتحويلات والجرد." />
    </>
  );
}
