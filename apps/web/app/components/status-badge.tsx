const labels: Record<string, string> = {
  draft: 'مسودة',
  open: 'مفتوحة',
  partially_paid: 'مدفوعة جزئياً',
  paid: 'مدفوعة',
  cancelled: 'ملغاة',
  closed: 'مغلقة',
  cash: 'نقداً',
  bank: 'بنكي',
  other: 'أخرى',
  all_branches: 'جميع الفروع',
  single_branch: 'فرع واحد',
  daily_cash_sales: 'مبيعات نقدية',
  supplier_payment_cash: 'دفعة مورد نقدية',
  expense_cash: 'مصروف نقدي',
  sales_return_cash: 'مرتجع نقدي',
  deposit: 'إيداع',
  withdrawal: 'سحب',
  settlement: 'تسوية',
  transfer: 'تحويل',
};

export function StatusBadge({ value }: Readonly<{ value?: string | boolean | null }>) {
  if (typeof value === 'boolean') {
    return <span className={`status-badge ${value ? 'success' : 'muted'}`}>{value ? 'نشط' : 'متوقف'}</span>;
  }

  const normalized = value ?? 'غير محدد';

  return <span className="status-badge">{labels[normalized] ?? normalized}</span>;
}
