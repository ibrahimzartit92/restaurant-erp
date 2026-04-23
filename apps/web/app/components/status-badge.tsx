const labels: Record<string, string> = {
  draft: 'مسودة',
  open: 'مفتوحة',
  partially_paid: 'مدفوعة جزئياً',
  paid: 'مدفوعة',
  cancelled: 'ملغاة',
  cash: 'نقداً',
  bank: 'بنكي',
  other: 'أخرى',
};

export function StatusBadge({ value }: Readonly<{ value?: string | boolean | null }>) {
  if (typeof value === 'boolean') {
    return <span className={`status-badge ${value ? 'success' : 'muted'}`}>{value ? 'نشط' : 'متوقف'}</span>;
  }

  const normalized = value ?? 'غير محدد';

  return <span className="status-badge">{labels[normalized] ?? normalized}</span>;
}
