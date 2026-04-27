import Link from 'next/link';

export function PageHeader({
  title,
  description,
  actionLabel,
  actionHref,
}: Readonly<{
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}>) {
  return (
    <section className="page-header">
      <div>
        <p className="eyebrow">إدارة البيانات</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {actionLabel && actionHref ? (
        <Link className="primary-button" href={actionHref}>
          {actionLabel}
        </Link>
      ) : null}
    </section>
  );
}
