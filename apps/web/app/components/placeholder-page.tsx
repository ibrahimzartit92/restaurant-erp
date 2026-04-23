import { PageHeader } from './page-header';

export function PlaceholderPage({
  title,
  description,
}: Readonly<{
  title: string;
  description: string;
}>) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="empty-state">
        <div className="empty-state-icon">+</div>
        <h3>صفحة قيد التحضير</h3>
        <p>سيتم عرض بيانات هذا القسم هنا عند تفعيل وحدته.</p>
      </div>
    </>
  );
}
