const labels: Record<string, string> = {
  completed: 'مكتمل',
  draft: 'مسودة',
  open: 'مفتوحة',
  partially_paid: 'مدفوعة جزئيًا',
  paid: 'مدفوعة',
  cancelled: 'ملغاة',
  closed: 'مغلقة',
  cash: 'نقدًا',
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
  supplier_payment_bank: 'دفعة مورد بنكية',
  expense_bank: 'مصروف بنكي',
  sales_receipt_bank: 'قبض مبيعات بنكي',
  refund_bank: 'مرتجع بنكي',
  incoming: 'داخل',
  outgoing: 'خارج',
};

export function StatusBadge({
  value,
  className = '',
}: Readonly<{
  value?: string | boolean | null;
  className?: string;
}>) {
  if (typeof value === 'boolean') {
    return <span className={`status-badge ${value ? 'success' : 'muted'} ${className}`.trim()}>{value ? 'نشط' : 'متوقف'}</span>;
  }

  const normalized = value ?? 'غير محدد';

  return <span className={`status-badge ${className}`.trim()}>{labels[normalized] ?? normalized}</span>;
}
