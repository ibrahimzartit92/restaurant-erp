import { redirect } from 'next/navigation';
import { LoginForm } from '../components/login-form';
import { getCurrentUser } from '../lib/server-auth';

export default async function LoginPage() {
  const currentUser = await getCurrentUser();

  if (currentUser?.mustChangePassword) {
    redirect('/change-password');
  }

  if (currentUser) {
    redirect('/');
  }

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
