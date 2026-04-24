import { ListFilters } from '../../components/list-filters';
import { PageHeader } from '../../components/page-header';
import { PermissionsCatalogManager } from '../../components/permissions-catalog-manager';
import { buildQuery, fetchList } from '../../lib/api';
import type { PermissionSummary } from '../../lib/types';

export default async function PermissionsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const result = await fetchList<PermissionSummary>(`/permissions${buildQuery({ search: params.search })}`);

  return (
    <>
      <PageHeader title="قائمة الصلاحيات" description="كتالوج الصلاحيات قابل للتعديل من الواجهة ويستوعب الوحدات الحالية والمستقبلية بدون فوضى." />
      <ListFilters searchPlaceholder="ابحث باسم الصلاحية أو كودها أو الوحدة" />
      {result.error ? <p className="notice">{result.error}</p> : null}
      <PermissionsCatalogManager permissions={result.data} />
    </>
  );
}
