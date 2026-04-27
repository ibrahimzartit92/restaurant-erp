'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitFormData } from '../lib/client-api';
import type { BranchOption, EmployeeSummary } from '../lib/types';

export function AttendanceFileUploadForm({
  employees,
  branches,
}: Readonly<{
  employees: EmployeeSummary[];
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

    try {
      await submitFormData('/attendance-files/upload', formData);
      router.push('/attendance-files');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر رفع ملف البصمة.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      {message ? <p className="notice danger">{message}</p> : null}
      <div className="form-grid">
        <label>
          الموظف
          <select defaultValue="" name="employeeId">
            <option value="">بدون موظف محدد</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.fullName}
              </option>
            ))}
          </select>
        </label>
        <label>
          الفرع
          <select defaultValue="" name="branchId">
            <option value="">بدون فرع محدد</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          الشهر
          <input max="12" min="1" name="month" required type="number" />
        </label>
        <label>
          السنة
          <input max="2100" min="2000" name="year" required type="number" />
        </label>
        <label>
          الملف
          <input accept=".pdf,.xls,.xlsx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" name="file" required type="file" />
        </label>
      </div>
      <label>
        ملاحظات
        <textarea name="notes" rows={4} />
      </label>
      <div className="form-actions">
        <button disabled={isSaving} type="submit">{isSaving ? 'جار الرفع...' : 'رفع الملف'}</button>
      </div>
    </form>
  );
}
