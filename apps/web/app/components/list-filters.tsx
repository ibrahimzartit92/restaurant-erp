export function ListFilters({
  searchPlaceholder = 'بحث',
  showBranch = false,
  showDateRange = false,
}: Readonly<{
  searchPlaceholder?: string;
  showBranch?: boolean;
  showDateRange?: boolean;
}>) {
  return (
    <form className="filters" action="">
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
      <button type="submit">تطبيق</button>
    </form>
  );
}
