const maxYear = 2035;
const minYear = Math.min(new Date().getFullYear() - 6, maxYear);

export const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1);
export const yearOptions = Array.from({ length: maxYear - minYear + 1 }, (_, index) => maxYear - index);

export function MonthSelect({
  name,
  defaultValue,
  required = false,
  emptyLabel = 'كل الشهور',
}: Readonly<{
  name: string;
  defaultValue?: string | number | null;
  required?: boolean;
  emptyLabel?: string;
}>) {
  return (
    <select defaultValue={defaultValue ?? ''} name={name} required={required}>
      {!required ? <option value="">{emptyLabel}</option> : null}
      {monthOptions.map((month) => (
        <option key={month} value={month}>
          {month}
        </option>
      ))}
    </select>
  );
}

export function YearSelect({
  name,
  defaultValue,
  required = false,
  emptyLabel = 'كل السنوات',
}: Readonly<{
  name: string;
  defaultValue?: string | number | null;
  required?: boolean;
  emptyLabel?: string;
}>) {
  return (
    <select defaultValue={defaultValue ?? ''} name={name} required={required}>
      {!required ? <option value="">{emptyLabel}</option> : null}
      {yearOptions.map((year) => (
        <option key={year} value={year}>
          {year}
        </option>
      ))}
    </select>
  );
}
