import { redirect } from 'next/navigation';
import { ChangePasswordForm } from '../components/change-password-form';
import { getCurrentUser } from '../lib/server-auth';

export default async function ChangePasswordPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  if (!currentUser.mustChangePassword) {
    redirect('/');
  }

  return (
    <main className="login-page" dir="rtl">
      <section className="login-card">
        <span className="login-eyebrow">إعداد الحساب</span>
        <h1>تغيير كلمة المرور الافتراضية</h1>
        <p>لأمان النظام، لا يمكن متابعة العمل بكلمة المرور الافتراضية admin.</p>
        <ChangePasswordForm />
      </section>
    </main>
  );
}
