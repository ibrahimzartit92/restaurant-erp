import { displayLabel } from '../lib/display-labels';

export function StatusBadge({
  value,
  className = '',
}: Readonly<{
  value?: string | boolean | null;
  className?: string;
}>) {
  const tone = typeof value === 'boolean' ? (value ? 'success' : 'muted') : '';

  return <span className={`status-badge ${tone} ${className}`.trim()}>{displayLabel(value)}</span>;
}
