export function PageHeader({
  title,
  description,
  actionLabel,
}: Readonly<{
  title: string;
  description: string;
  actionLabel?: string;
}>) {
  return (
    <section className="page-header">
      <div>
        <p className="eyebrow">إدارة البيانات</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {actionLabel ? <button className="primary-button">{actionLabel}</button> : null}
    </section>
  );
}
