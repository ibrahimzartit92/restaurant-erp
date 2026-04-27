export default function ReportDetailsLoading() {
  return (
    <div className="empty-state">
      <div className="loading-spinner" />
      <h3>جاري تجهيز التقرير</h3>
      <p>يتم تحميل النتائج وحساب الملخصات حسب الفلاتر الحالية.</p>
    </div>
  );
}
