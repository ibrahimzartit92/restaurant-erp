import { LoginForm } from '../components/login-form';

export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-panel" aria-label="تسجيل الدخول">
        <div className="login-copy">
          <p className="eyebrow">إدارة المطعم</p>
          <h1>تسجيل الدخول</h1>
          <p>ادخل إلى لوحة الإدارة لمتابعة البيانات التشغيلية وإدارة المستخدمين والأدوار والصلاحيات من نفس الواجهة.</p>
        </div>

        <LoginForm />
      </section>
    </main>
  );
}
