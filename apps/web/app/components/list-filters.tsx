import { AutoApplyFilterForm } from './auto-apply-filter-form';

export function ListFilters({
  searchPlaceholder = 'بحث',
  showBranch = false,
  showDrawer = false,
  showDate = false,
  showDateRange = false,
}: Readonly<{
  searchPlaceholder?: string;
  showBranch?: boolean;
  showDrawer?: boolean;
  showDate?: boolean;
  showDateRange?: boolean;
}>) {
  return (
    <AutoApplyFilterForm className="filters">
      <label>
        بحث
        <input name="search" placeholder={searchPlaceholder} />
      </label>
      {showBranch ? (
        <label>
          الفرع
          <input name="branch_id" placeholder="معرف الفرع" />
        </label>
      ) : null}
      {showDrawer ? (
        <label>
          الدرج
          <input name="drawer_id" placeholder="معرف الدرج" />
        </label>
      ) : null}
      {showDate ? (
        <label>
          التاريخ
          <input name="date" type="date" />
        </label>
      ) : null}
      {showDateRange ? (
        <>
          <label>
            من تاريخ
            <input name="date_from" type="date" />
          </label>
          <label>
            إلى تاريخ
            <input name="date_to" type="date" />
          </label>
        </>
      ) : null}
    </AutoApplyFilterForm>
  );
}
