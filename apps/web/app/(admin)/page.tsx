const summaryCards = [
  { label: 'فواتير شراء مفتوحة', value: '0', detail: 'بانتظار بيانات التشغيل' },
  { label: 'مدفوعات اليوم', value: '0.00', detail: 'سيتم ربطها بالتقارير لاحقاً' },
  { label: 'مواد نشطة', value: '0', detail: 'من سجل المواد' },
  { label: 'موردون نشطون', value: '0', detail: 'من سجل الموردين' },
];

const quickLinks = [
  'إضافة فاتورة شراء',
  'تسجيل دفعة مورد',
  'مراجعة المواد',
  'متابعة الموردين',
];

export default function DashboardPage() {
  return (
    <>
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">صباح العمل الهادئ</p>
          <h2>نظرة سريعة على تشغيل المطعم</h2>
          <p>
            هذه الصفحة ستكون مركز المتابعة اليومي للفروع والمخزون والمشتريات والمدفوعات.
          </p>
        </div>
        <div className="hero-note">
          <span>اليوم</span>
          <strong>جاهز للربط مع البيانات</strong>
        </div>
      </section>

      <section className="summary-grid" aria-label="ملخصات سريعة">
        {summaryCards.map((card) => (
          <article className="summary-card" key={card.label}>
            <p>{card.label}</p>
            <strong>{card.value}</strong>
            <span>{card.detail}</span>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-heading">
            <h3>مهام سريعة</h3>
            <span>قريباً</span>
          </div>
          <div className="quick-actions">
            {quickLinks.map((link) => (
              <button key={link}>{link}</button>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <h3>حالة النظام</h3>
            <span>تجريبي</span>
          </div>
          <ul className="timeline-list">
            <li>تم تجهيز واجهة الإدارة الأساسية.</li>
            <li>صفحات القوائم متصلة بنقاط النهاية المتاحة.</li>
            <li>النماذج والصلاحيات ستضاف في المراحل التالية.</li>
          </ul>
        </div>
      </section>
    </>
  );
}
