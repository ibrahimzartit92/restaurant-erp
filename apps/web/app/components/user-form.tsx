'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';
import type { BranchOption, RoleSummary, UserSummary } from '../lib/types';

export function UserForm({
  mode,
  initialUser,
  roles,
  branches,
}: Readonly<{
  mode: 'create' | 'edit';
  initialUser?: UserSummary | null;
  roles: RoleSummary[];
  branches: BranchOption[];
}>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get('password') ?? '');
    const payload = {
      fullName: String(formData.get('fullName') ?? ''),
      username: String(formData.get('username') ?? ''),
      email: String(formData.get('email') ?? '') || null,
      ...(password ? { password } : {}),
      roleId: String(formData.get('roleId') ?? ''),
      branchId: String(formData.get('branchId') ?? '') || null,
      isActive: formData.get('isActive') === 'on',
      notes: String(formData.get('notes') ?? '') || null,
    };

    try {
      await submitJson(
        mode === 'create' ? '/users' : `/users/${initialUser?.id}`,
        mode === 'create' ? 'POST' : 'PATCH',
        payload,
      );
      router.push('/users');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ المستخدم.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      {message ? <p className="notice danger">{message}</p> : null}

      <div className="form-grid">
        <label>
          الاسم الكامل
          <input name="fullName" defaultValue={initialUser?.fullName ?? ''} maxLength={160} required />
        </label>
        <label>
          اسم المستخدم
          <input name="username" defaultValue={initialUser?.username ?? ''} maxLength={80} required />
        </label>
        <label>
          البريد الإلكتروني
          <input name="email" type="email" defaultValue={initialUser?.email ?? ''} maxLength={180} />
        </label>
        <label>
          كلمة المرور
          <input
            name="password"
            type="password"
            minLength={8}
            placeholder={mode === 'edit' ? 'اتركه فارغاً للإبقاء على كلمة المرور الحالية' : '8 أحرف على الأقل'}
            required={mode === 'create'}
          />
        </label>
        <label>
          الدور
          <select name="roleId" defaultValue={initialUser?.role.id ?? ''} required>
            <option value="">اختر الدور</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          الفرع
          <select name="branchId" defaultValue={initialUser?.branchId ?? ''}>
            <option value="">بدون تقييد فرع</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox-field">
          <input name="isActive" type="checkbox" defaultChecked={initialUser?.isActive ?? true} />
          المستخدم نشط
        </label>
      </div>

      <p className="field-hint">إذا تم تحديد فرع للمستخدم فسيتم اعتباره مقيداً بهذا الفرع ما لم يكن دوره `admin`.</p>

      <label>
        ملاحظات
        <textarea name="notes" defaultValue={initialUser?.notes ?? ''} rows={4} maxLength={2000} />
      </label>

      <div className="form-actions">
        <button type="submit" disabled={isSaving}>
          {isSaving ? 'جار الحفظ...' : mode === 'create' ? 'حفظ المستخدم' : 'حفظ التعديلات'}
        </button>
      </div>
    </form>
  );
}
