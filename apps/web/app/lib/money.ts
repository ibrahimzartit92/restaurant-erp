export function formatMoneyWithCurrency(value?: number | string | null, currencySymbol = 'ر.س', decimalPlaces = 2) {
  const numericValue = Number(value ?? 0);
  const safeDecimalPlaces = Math.min(Math.max(Math.trunc(decimalPlaces), 0), 4);
  const formattedValue = new Intl.NumberFormat('ar', {
    minimumFractionDigits: safeDecimalPlaces,
    maximumFractionDigits: safeDecimalPlaces,
  }).format(Number.isFinite(numericValue) ? numericValue : 0);

  return `${formattedValue} ${currencySymbol}`.trim();
}
