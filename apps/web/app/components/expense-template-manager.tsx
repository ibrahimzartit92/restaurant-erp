'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitJson } from '../lib/client-api';
import type { BranchOption, ExpenseCategoryOption, ExpenseTemplateOption } from '../lib/types';

const paymentMethodLabels: Record<string, string> = {
  cash: 'نقدي',
  bank: 'بنكي',
  vault: 'الخزنة',
  other: 'أخرى',
};

type TemplateFormState = {
  id?: string;
  name: string;
  expenseCategoryId: string;
  branchId: string;
  defaultAmount: string;
  paymentMethod: 'cash' | 'bank' | 'vault' | 'other';
  notes: string;
  isRecurring: boolean;
  isActive: boolean;
};

function emptyState(): TemplateFormState {
  return {
    name: '',
    expenseCategoryId: '',
    branchId: '',
    defaultAmount: '',
    paymentMethod: 'cash',
    notes: '',
    isRecurring: false,
    isActive: true,
  };
}

function fromTemplate(template: ExpenseTemplateOption): TemplateFormState {
  return {
    id: template.id,
    name: template.name,
    expenseCategoryId: template.expenseCategoryId ?? template.expenseCategory?.id ?? '',
    branchId: template.branchId ?? template.branch?.id ?? '',
    defaultAmount: template.defaultAmount ? String(template.defaultAmount) : '',
    paymentMethod: template.paymentMethod ?? 'cash',
    notes: template.notes ?? '',
    isRecurring: template.isRecurring ?? false,
    isActive: template.isActive ?? true,
  };
}

export function ExpenseTemplateManager({
  templates,
  branches,
  categories,
  formatMoney,
}: Readonly<{
  templates: ExpenseTemplateOption[];
  branches: BranchOption[];
  categories: ExpenseCategoryOption[];
  formatMoney: (value?: number | string | null) => string;
}>) {
  const router = useRouter();
  const [form, setForm] = useState<TemplateFormState>(emptyState);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const activeTemplates = useMemo(() => templates.filter((template) => template.isActive !== false), [templates]);

  function update<K extends keyof TemplateFormState>(key: K, value: TemplateFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsSaving(true);

    const payload = {
      name: form.name.trim(),
      expenseCategoryId: form.expenseCategoryId,
      branchId: form.branchId || null,
      defaultAmount: Number(form.defaultAmount || 0),
      paymentMethod: form.paymentMethod,
      notes: form.notes.trim() || null,
      isRecurring: form.isRecurring,
      isActive: form.isActive,
    };

    try {
      await submitJson(form.id ? `/expense-templates/${form.id}` : '/expense-templates', form.id ? 'PATCH' : 'POST', payload);
      setForm(emptyState());
      router.refresh();
      setMessage(form.id ? 'تم تحديث القالب بنجاح.' : 'تم إنشاء القالب بنجاح.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ قالب المصروف.');
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteTemplate(template: ExpenseTemplateOption) {
    if (!confirm(`سيتم حذف قالب "${template.name}". هل تريد المتابعة؟`)) return;
    setMessage(null);
    try {
      await submitJson(`/expense-templates/${template.id}`, 'DELETE', {});
      router.refresh();
      setMessage('تم حذف القالب.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حذف القالب.');
    }
  }

  return (
    <div className="template-workspace">
      {message ? <p className="notice">{message}</p> : null}

      <section className="template-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">قالب مصروف</span>
            <h2>{form.id ? 'تعديل قالب' : 'إنشاء قالب جديد'}</h2>
          </div>
          {form.id ? (
            <button className="secondary-button" type="button" onClick={() => setForm(emptyState())}>
              إلغاء التعديل
            </button>
          ) : null}
        </div>

        <form className="form-grid polished-form" onSubmit={saveTemplate}>
          <label>
            اسم القالب
            <input value={form.name} onChange={(event) => update('name', event.target.value)} required />
          </label>
          <label>
            نوع المصروف
            <select value={form.expenseCategoryId} onChange={(event) => update('expenseCategoryId', event.target.value)} required>
              <option value="">اختر نوع المصروف</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            الفرع
            <select value={form.branchId} onChange={(event) => update('branchId', event.target.value)}>
              <option value="">كل الفروع</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            المبلغ الافتراضي
            <input
              className="money-input"
              value={form.defaultAmount}
              type="number"
              min="0"
              step="0.01"
              onChange={(event) => update('defaultAmount', event.target.value)}
              placeholder="اختياري"
            />
          </label>
          <label>
            طريقة الدفع الافتراضية
            <select value={form.paymentMethod} onChange={(event) => update('paymentMethod', event.target.value as TemplateFormState['paymentMethod'])}>
              <option value="cash">نقدي</option>
              <option value="bank">بنكي</option>
              <option value="vault">الخزنة</option>
              <option value="other">أخرى</option>
            </select>
          </label>
          <label className="checkbox-field">
            <input type="checkbox" checked={form.isRecurring} onChange={(event) => update('isRecurring', event.target.checked)} />
            مصروف دوري
          </label>
          <label className="checkbox-field">
            <input type="checkbox" checked={form.isActive} onChange={(event) => update('isActive', event.target.checked)} />
            القالب نشط
          </label>
          <label className="full-span">
            ملاحظات
            <textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} rows={3} placeholder="اختياري" />
          </label>
          <div className="form-actions full-span">
            <button type="submit" disabled={isSaving}>
              {isSaving ? 'جار الحفظ...' : form.id ? 'حفظ التعديل' : 'إنشاء القالب'}
            </button>
          </div>
        </form>
      </section>

      <section className="template-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">القوالب الجاهزة</span>
            <h2>قوالب المصاريف</h2>
          </div>
          <span className="soft-count">{activeTemplates.length} قالب نشط</span>
        </div>

        {templates.length === 0 ? (
          <div className="empty-state polished-empty">
            <h3>لا توجد قوالب مصاريف بعد</h3>
            <p>أنشئ قالبا للمصاريف المتكررة مثل الإيجار أو الكهرباء لتسريع الإدخال اليومي.</p>
          </div>
        ) : (
          <div className="template-grid">
            {templates.map((template) => (
              <article className="template-card" key={template.id}>
                <div>
                  <span className="status-pill">{template.isActive === false ? 'غير نشط' : 'نشط'}</span>
                  {template.isRecurring ? <span className="status-pill muted">دوري</span> : null}
                </div>
                <h3>{template.name}</h3>
                <dl>
                  <div>
                    <dt>النوع</dt>
                    <dd>{template.expenseCategory?.name ?? 'غير محدد'}</dd>
                  </div>
                  <div>
                    <dt>الفرع</dt>
                    <dd>{template.branch?.name ?? 'كل الفروع'}</dd>
                  </div>
                  <div>
                    <dt>المبلغ</dt>
                    <dd>{formatMoney(template.defaultAmount ?? 0)}</dd>
                  </div>
                  <div>
                    <dt>طريقة الدفع</dt>
                    <dd>{paymentMethodLabels[template.paymentMethod ?? 'cash'] ?? template.paymentMethod}</dd>
                  </div>
                </dl>
                {template.notes ? <p>{template.notes}</p> : null}
                <div className="card-actions">
                  <Link className="button-link" href={`/expenses/new?templateId=${template.id}`}>
                    استخدام القالب
                  </Link>
                  <button className="secondary-button" type="button" onClick={() => setForm(fromTemplate(template))}>
                    تعديل
                  </button>
                  <button className="danger-button" type="button" onClick={() => deleteTemplate(template)}>
                    حذف
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
