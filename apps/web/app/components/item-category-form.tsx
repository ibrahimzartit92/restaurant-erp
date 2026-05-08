'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';
import type { ItemCategoryOption } from '../lib/types';

export function ItemCategoryForm({ initialCategory }: Readonly<{ initialCategory?: ItemCategoryOption | null }>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      code: String(formData.get('code') ?? '').trim(),
      name: String(formData.get('name') ?? '').trim(),
      color: String(formData.get('color') ?? '#14746f'),
      isActive: formData.get('isActive') === 'on',
    };

    try {
      await submitJson(
        initialCategory ? `/item-categories/${initialCategory.id}` : '/item-categories',
        initialCategory ? 'PATCH' : 'POST',
        payload,
      );
      router.refresh();
      if (!initialCategory) event.currentTarget.reset();
      setMessage('تم حفظ تصنيف المادة بنجاح.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ تصنيف المادة.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      {message ? <p className={message.startsWith('تم') ? 'notice success' : 'notice danger'}>{message}</p> : null}
      <div className="form-grid">
        <label>
          كود التصنيف
          <input defaultValue={initialCategory?.code ?? ''} maxLength={50} name="code" required />
        </label>
        <label>
          اسم التصنيف
          <input defaultValue={initialCategory?.name ?? ''} maxLength={160} name="name" required />
        </label>
        <label>
          اللون
          <input defaultValue={initialCategory?.color ?? '#14746f'} name="color" type="color" />
        </label>
        <label className="checkbox-field">
          <input defaultChecked={initialCategory?.isActive ?? true} name="isActive" type="checkbox" />
          التصنيف نشط
        </label>
      </div>
      <div className="form-actions">
        <button disabled={isSaving} type="submit">
          {isSaving ? 'جاري الحفظ...' : initialCategory ? 'حفظ التعديل' : 'إضافة التصنيف'}
        </button>
      </div>
    </form>
  );
}
