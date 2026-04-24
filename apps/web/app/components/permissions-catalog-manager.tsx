'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';
import type { PermissionSummary } from '../lib/types';

type PermissionDraft = {
  code: string;
  name: string;
  module: string;
  notes: string;
};

const emptyDraft: PermissionDraft = {
  code: '',
  name: '',
  module: '',
  notes: '',
};

export function PermissionsCatalogManager({
  permissions,
}: Readonly<{
  permissions: PermissionSummary[];
}>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<PermissionDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      await submitJson('/permissions', 'POST', {
        code: draft.code,
        name: draft.name,
        module: draft.module,
        notes: draft.notes || null,
      });
      setDraft(emptyDraft);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ الصلاحية.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEdit(event: React.FormEvent<HTMLFormElement>, permissionId: string) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);

    try {
      await submitJson(`/permissions/${permissionId}`, 'PATCH', {
        code: String(formData.get('code') ?? ''),
        name: String(formData.get('name') ?? ''),
        module: String(formData.get('module') ?? ''),
        notes: String(formData.get('notes') ?? '') || null,
      });
      setEditingId(null);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر تحديث الصلاحية.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="stacked-sections">
      <form className="form-panel" onSubmit={handleCreate}>
        {message ? <p className="notice danger">{message}</p> : null}
        <div className="panel-heading">
          <div>
            <h3>إضافة صلاحية جديدة</h3>
            <span>أضف صلاحية جديدة للوحدات الحالية أو للوحدات المستقبلية بدون تعديل كود الواجهة.</span>
          </div>
        </div>
        <div className="form-grid">
          <label>
            كود الصلاحية
            <input
              name="code"
              value={draft.code}
              onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))}
              required
            />
          </label>
          <label>
            اسم الصلاحية
            <input
              name="name"
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              required
            />
          </label>
          <label>
            الوحدة
            <input
              name="module"
              value={draft.module}
              onChange={(event) => setDraft((current) => ({ ...current, module: event.target.value }))}
              required
            />
          </label>
        </div>
        <label>
          ملاحظات
          <textarea
            name="notes"
            rows={3}
            value={draft.notes}
            onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
          />
        </label>
        <div className="form-actions">
          <button type="submit" disabled={isSaving}>
            {isSaving ? 'جار الحفظ...' : 'إضافة الصلاحية'}
          </button>
        </div>
      </form>

      <div className="stacked-sections">
        {permissions.map((permission) => (
          <form className="form-panel compact-form" key={permission.id} onSubmit={(event) => handleEdit(event, permission.id)}>
            <div className="permission-card-header">
              <div>
                <strong>{permission.name}</strong>
                <span>{permission.code}</span>
              </div>
              <button
                className="secondary-button"
                onClick={(event) => {
                  event.preventDefault();
                  setEditingId((current) => (current === permission.id ? null : permission.id));
                }}
                type="button"
              >
                {editingId === permission.id ? 'إخفاء' : 'تعديل'}
              </button>
            </div>

            {editingId === permission.id ? (
              <>
                <div className="form-grid">
                  <label>
                    كود الصلاحية
                    <input defaultValue={permission.code} name="code" required />
                  </label>
                  <label>
                    اسم الصلاحية
                    <input defaultValue={permission.name} name="name" required />
                  </label>
                  <label>
                    الوحدة
                    <input defaultValue={permission.module} name="module" required />
                  </label>
                </div>
                <label>
                  ملاحظات
                  <textarea defaultValue={permission.notes ?? ''} name="notes" rows={3} />
                </label>
                <div className="form-actions">
                  <button type="submit" disabled={isSaving}>
                    {isSaving ? 'جار الحفظ...' : 'حفظ التعديل'}
                  </button>
                </div>
              </>
            ) : (
              <div className="permission-card-meta">
                <span>الوحدة: {permission.module}</span>
                <span>{permission.notes || 'بدون ملاحظات'}</span>
              </div>
            )}
          </form>
        ))}
      </div>
    </div>
  );
}
