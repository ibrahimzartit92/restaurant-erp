export default function HomePage() {
  return (
    <main>
      <section
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '32px',
        }}
      >
        <div
          style={{
            width: 'min(720px, 100%)',
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '32px',
            boxShadow: '0 20px 60px rgba(32, 33, 36, 0.08)',
          }}
        >
          <p style={{ margin: '0 0 12px', color: 'var(--accent)', fontWeight: 700 }}>
            نظام إدارة المطاعم
          </p>
          <h1 style={{ margin: 0, fontSize: 'clamp(32px, 6vw, 56px)', lineHeight: 1.1 }}>
            منصة جاهزة للبناء
          </h1>
          <p style={{ margin: '20px 0 0', color: 'var(--muted)', fontSize: '18px', lineHeight: 1.8 }}>
            تم تجهيز الهيكل الأساسي للتطبيق. الخطوة التالية هي بناء الوحدات حسب أولوية العمل.
          </p>
        </div>
      </section>
    </main>
  );
}
