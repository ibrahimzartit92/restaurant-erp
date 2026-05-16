import { LoginForm } from '../components/login-form';

export default async function LoginPage() {
  return (
    <main className="login-page" dir="rtl">
      <section className="login-panel" aria-label="تسجيل الدخول">
        <div className="login-copy">
          <p className="eyebrow">إدارة المطعم</p>
          <h1>تسجيل الدخول</h1>
          <p>ادخل إلى لوحة الإدارة لمتابعة المبيعات والمصاريف والمخزون والصلاحيات من واجهة واحدة آمنة.</p>
        </div>

        <LoginForm />
      </section>
    </main>
  );
}
