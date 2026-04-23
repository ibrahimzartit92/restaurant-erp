import Link from 'next/link';

export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-panel" aria-label="تسجيل الدخول">
        <div className="login-copy">
          <p className="eyebrow">إدارة المطعم</p>
          <h1>تسجيل الدخول</h1>
          <p>ادخل إلى لوحة الإدارة لمتابعة المواد والموردين والمشتريات والمدفوعات.</p>
        </div>

        <form className="login-form">
          <label>
            البريد الإلكتروني
            <input type="email" placeholder="admin@example.com" />
          </label>
          <label>
            كلمة المرور
            <input type="password" placeholder="••••••••" />
          </label>
          <button type="button">دخول</button>
          <Link href="/">الدخول إلى النسخة التجريبية بدون حساب</Link>
        </form>
      </section>
    </main>
  );
}
