import Link from 'next/link';
import { ArchiveDeleteButton } from '../../components/archive-delete-button';
import { AutoApplyFilterForm } from '../../components/auto-apply-filter-form';
import { DataTable, type DataColumn } from '../../components/data-table';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { buildQuery, fetchList } from '../../lib/api';
import type { CustomerOption } from '../../lib/types';

const columns: DataColumn<CustomerOption>[] = [
  { key: 'name', label: 'اسم العميل', render: (row) => row.name },
  { key: 'phone', label: 'الهاتف', render: (row) => row.phone ?? 'غير محدد' },
  { key: 'address', label: 'العنوان', render: (row) => row.address ?? 'غير محدد' },
  { key: 'status', label: 'الحالة', render: (row) => <StatusBadge value={row.isActive ?? true} /> },
  {
    key: 'actions',
    label: 'إجراء',
    render: (row) => (
      <div className="table-actions">
        <Link className="text-link" href={`/customers/${row.id}/edit`}>
          تعديل
        </Link>
        <ArchiveDeleteButton entityLabel="العميل" path={`/customers/${row.id}`} />
      </div>
    ),
  },
];

export default async function CustomersPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const params = (await searchParams) ?? {};
  const result = await fetchList<CustomerOption>(`/customers${buildQuery({ search: params.search, active: params.active })}`);

  return (
    <>
      <PageHeader title="العملاء" description="إدارة عملاء بيع الجملة واستخدامهم في فواتير المبيعات." />
      <div className="page-toolbar">
        <AutoApplyFilterForm className="filters">
          <label>
            بحث
            <input defaultValue={params.search ?? ''} name="search" placeholder="اسم العميل أو الهاتف" />
          </label>
          <label>
            الحالة
            <select defaultValue={params.active ?? ''} name="active">
              <option value="">كل الحالات</option>
              <option value="true">نشط</option>
              <option value="false">مؤرشف</option>
            </select>
          </label>
        </AutoApplyFilterForm>
        <Link className="primary-button" href="/customers/new">
          عميل جديد
        </Link>
      </div>
      {result.error ? <p className="notice danger">{result.error}</p> : null}
      <DataTable columns={columns} rows={result.data} emptyTitle="لا يوجد عملاء" emptyText="أضف عميلًا جديدًا لاستخدامه في فواتير بيع الجملة." />
    </>
  );
}
