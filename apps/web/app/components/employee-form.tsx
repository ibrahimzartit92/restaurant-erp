'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';
import type { BranchOption, EmployeeSummary } from '../lib/types';

export function EmployeeForm({
  mode,
  initialEmployee,
  branches,
}: Readonly<{
  mode: 'create' | 'edit';
  initialEmployee?: EmployeeSummary | null;
  branches: BranchOption[];
}>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      employeeNumber: String(formData.get('employeeNumber') ?? ''),
      fullName: String(formData.get('fullName') ?? ''),
      phone: String(formData.get('phone') ?? '') || null,
      jobTitle: String(formData.get('jobTitle') ?? '') || null,
      defaultBranchId: String(formData.get('defaultBranchId') ?? '') || null,
      hireDate: String(formData.get('hireDate') ?? '') || null,
      payrollMode: String(formData.get('payrollMode') ?? 'fixed_monthly'),
      baseMonthlySalary: Number(formData.get('baseMonthlySalary') ?? 0),
      hourlyRate: Number(formData.get('hourlyRate') ?? 0),
      isActive: formData.get('isActive') === 'on',
      notes: String(formData.get('notes') ?? '') || null,
    };

    try {
      await submitJson(
        mode === 'create' ? '/employees' : `/employees/${initialEmployee?.id}`,
        mode === 'create' ? 'POST' : 'PATCH',
        payload,
      );
      router.push('/employees');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ الموظف.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!initialEmployee?.id) {
      return;
    }

    const confirmed = window.confirm(
      'هل تريد حذف هذا الموظف؟ إذا كان لديه سجلات مرتبطة سيتم إيقافه بدلا من الحذف للحفاظ على التاريخ المالي.',
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setMessage(null);

    try {
      const result = (await submitJson(`/employees/${initialEmployee.id}/delete`, 'POST', {})) as {
        deleted?: boolean;
        deactivated?: boolean;
        linkedRecords?: number;
      } | null;
      if (result?.deactivated) {
        window.alert(`تم إيقاف الموظف بدلا من حذفه لوجود ${result.linkedRecords ?? 0} سجلات مرتبطة.`);
      }
      router.push('/employees');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حذف أو إيقاف الموظف.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      {message ? <p className="notice danger">{message}</p> : null}

      <div className="form-grid">
        <label>
          رقم الموظف
          <input defaultValue={initialEmployee?.employeeNumber ?? ''} maxLength={50} name="employeeNumber" required />
        </label>
        <label>
          الاسم الكامل
          <input defaultValue={initialEmployee?.fullName ?? ''} maxLength={180} name="fullName" required />
        </label>
        <label>
          الهاتف
          <input defaultValue={initialEmployee?.phone ?? ''} maxLength={50} name="phone" />
        </label>
        <label>
          المسمى الوظيفي
          <input defaultValue={initialEmployee?.jobTitle ?? ''} maxLength={120} name="jobTitle" />
        </label>
        <label>
          الفرع الافتراضي
          <select defaultValue={initialEmployee?.defaultBranchId ?? ''} name="defaultBranchId">
            <option value="">بدون فرع افتراضي</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          تاريخ التعيين
          <input defaultValue={initialEmployee?.hireDate?.slice(0, 10) ?? ''} name="hireDate" type="date" />
        </label>
        <label>
          نظام الراتب
          <select defaultValue={initialEmployee?.payrollMode ?? 'fixed_monthly'} name="payrollMode">
            <option value="fixed_monthly">راتب شهري ثابت</option>
            <option value="hourly">بالساعة</option>
          </select>
        </label>
        <label>
          الراتب الشهري الأساسي
          <input defaultValue={initialEmployee?.baseMonthlySalary ?? 0} min="0" name="baseMonthlySalary" step="0.01" type="number" />
        </label>
        <label>
          أجر الساعة
          <input defaultValue={initialEmployee?.hourlyRate ?? 0} min="0" name="hourlyRate" step="0.01" type="number" />
        </label>
        <label className="checkbox-field">
          <input defaultChecked={initialEmployee?.isActive ?? true} name="isActive" type="checkbox" />
          الموظف نشط
        </label>
      </div>

      <label>
        ملاحظات
        <textarea defaultValue={initialEmployee?.notes ?? ''} name="notes" rows={4} />
      </label>

      <div className="form-actions">
        <button disabled={isSaving || isDeleting} type="submit">
          {isSaving ? 'جاري الحفظ...' : mode === 'create' ? 'حفظ الموظف' : 'حفظ التعديلات'}
        </button>
        {mode === 'edit' ? (
          <button disabled={isSaving || isDeleting} onClick={handleDelete} type="button">
            {isDeleting ? 'جاري المعالجة...' : 'حذف / إيقاف الموظف'}
          </button>
        ) : null}
      </div>
    </form>
  );
}
