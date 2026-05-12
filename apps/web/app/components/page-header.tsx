import Link from 'next/link';
import type { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  actionLabel,
  actionHref,
  actions,
}: Readonly<{
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  actions?: ReactNode;
}>) {
  return (
    <section className="page-header">
      <div>
        <p className="eyebrow">إدارة البيانات</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="page-header-actions">
        {actions}
        {actionLabel && actionHref ? (
          <Link className="primary-button" href={actionHref}>
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
