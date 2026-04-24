'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { submitJson } from '../lib/client-api';
import type { PermissionSummary, RoleSummary } from '../lib/types';

type PermissionGroup = {
  module: string;
  items: PermissionSummary[];
};

export function RolePermissionsForm({
  role,
  permissions,
}: Readonly<{
  role: RoleSummary;
  permissions: PermissionSummary[];
}>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const groupedPermissions = useMemo<PermissionGroup[]>(() => {
    const groups = new Map<string, PermissionSummary[]>();

    permissions.forEach((permission) => {
      const group = groups.get(permission.module) ?? [];
      group.push(permission);
      groups.set(permission.module, group);
    });

    return [...groups.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([module, items]) => ({
        module,
        items: items.sort((left, right) => left.name.localeCompare(right.name)),
      }));
  }, [permissions]);

  const selectedPermissionIds = new Set(role.permissions?.map((permission) => permission.id) ?? []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const permissionIds = formData.getAll('permissionIds').map(String);

    try {
      await submitJson(`/roles/${role.id}/permissions`, 'PATCH', { permissionIds });
      router.push('/roles');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر تحديث صلاحيات الدور.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      {message ? <p className="notice danger">{message}</p> : null}

      <div className="permission-summary">
        <strong>{role.name}</strong>
        <span>اختر الصلاحيات المناسبة لهذا الدور. الصلاحيات مجمعة حسب الوحدة لتسهيل الإدارة.</span>
      </div>

      <div className="permission-groups">
        {groupedPermissions.map((group) => (
          <section className="permission-group" key={group.module}>
            <div className="permission-group-header">
              <h3>{group.module}</h3>
              <span>{group.items.length} صلاحية</span>
            </div>
            <div className="permission-grid">
              {group.items.map((permission) => (
                <label className="permission-option" key={permission.id}>
                  <input
                    defaultChecked={selectedPermissionIds.has(permission.id)}
                    name="permissionIds"
                    type="checkbox"
                    value={permission.id}
                  />
                  <span>
                    <strong>{permission.name}</strong>
                    <small>{permission.code}</small>
                    {permission.notes ? <em>{permission.notes}</em> : null}
                  </span>
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="form-actions">
        <button type="submit" disabled={isSaving}>
          {isSaving ? 'جار الحفظ...' : 'حفظ ربط الصلاحيات'}
        </button>
      </div>
    </form>
  );
}
