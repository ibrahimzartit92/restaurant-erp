'use client';

import { useMemo, useState } from 'react';
import { submitJson } from '../lib/client-api';

type SettingValue = string | number | boolean | null;

export type SettingField = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'email' | 'url' | 'color' | 'number' | 'boolean' | 'select';
  value: SettingValue;
  defaultValue: SettingValue;
  note: string | null;
  options: { label: string; value: string }[] | null;
  min: number | null;
  max: number | null;
};

export type SettingGroup = {
  key: string;
  title: string;
  description: string;
  fields: SettingField[];
};

type SettingsValues = Record<string, Record<string, SettingValue>>;

function buildInitialValues(groups: SettingGroup[]) {
  return groups.reduce<SettingsValues>((groupValues, group) => {
    groupValues[group.key] = group.fields.reduce<Record<string, SettingValue>>((fieldValues, field) => {
      fieldValues[field.key] = field.value ?? field.defaultValue;
      return fieldValues;
    }, {});

    return groupValues;
  }, {});
}

function formatBackupDate(value: SettingValue) {
  if (!value || typeof value !== 'string' || value === 'غير محدد') {
    return 'غير محدد';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ar', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function SettingsCenterForm({ groups }: Readonly<{ groups: SettingGroup[] }>) {
  const [settingGroups, setSettingGroups] = useState(groups);
  const [activeGroupKey, setActiveGroupKey] = useState(groups[0]?.key ?? '');
  const [values, setValues] = useState<SettingsValues>(() => buildInitialValues(groups));
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  const activeGroup = useMemo(
    () => settingGroups.find((group) => group.key === activeGroupKey) ?? settingGroups[0],
    [activeGroupKey, settingGroups],
  );

  const maintenanceValues = values.maintenance ?? {};
  const completedSettingsCount = Object.values(values).reduce(
    (total, groupValues) =>
      total +
      Object.values(groupValues).filter((value) => value !== null && value !== '' && value !== false).length,
    0,
  );
  const totalSettingsCount = settingGroups.reduce((total, group) => total + group.fields.length, 0);

  function updateValue(groupKey: string, fieldKey: string, value: SettingValue) {
    setValues((currentValues) => ({
      ...currentValues,
      [groupKey]: {
        ...currentValues[groupKey],
        [fieldKey]: value,
      },
    }));
  }

  async function saveSettings(scope: 'all' | 'group') {
    const payloadValues =
      scope === 'all' || !activeGroup ? values : { [activeGroup.key]: values[activeGroup.key] ?? {} };

    setIsSaving(true);
    setMessage(null);

    try {
      const response = (await submitJson('/settings', 'PATCH', { values: payloadValues })) as { groups: SettingGroup[] };
      setSettingGroups(response.groups);
      setValues(buildInitialValues(response.groups));
      setMessage(scope === 'all' ? 'تم حفظ جميع الإعدادات بنجاح.' : `تم حفظ ${activeGroup?.title} بنجاح.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ الإعدادات.');
    } finally {
      setIsSaving(false);
    }
  }

  async function createBackup() {
    setIsBackingUp(true);
    setMessage(null);

    try {
      const backup = (await submitJson('/settings/backup/manual', 'POST', {})) as {
        backupType: string;
        lastBackupStatus: string;
        lastBackupAt: string;
      };

      setValues((currentValues) => ({
        ...currentValues,
        maintenance: {
          ...currentValues.maintenance,
          backupType: backup.backupType,
          lastBackupStatus: backup.lastBackupStatus,
          lastBackupAt: backup.lastBackupAt,
        },
      }));
      setMessage('تم إنشاء نسخة احتياطية يدوية وتحديث بيانات آخر نسخة.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر إنشاء النسخة الاحتياطية.');
    } finally {
      setIsBackingUp(false);
    }
  }

  function renderField(groupKey: string, field: SettingField) {
    const value = values[groupKey]?.[field.key] ?? field.defaultValue;

    if (field.type === 'boolean') {
      return (
        <label className="settings-switch" key={field.key}>
          <input
            checked={Boolean(value)}
            onChange={(event) => updateValue(groupKey, field.key, event.target.checked)}
            type="checkbox"
          />
          <span>
            <strong>{field.label}</strong>
            {field.note ? <small>{field.note}</small> : null}
          </span>
        </label>
      );
    }

    if (field.type === 'textarea') {
      return (
        <label className="settings-field" key={field.key}>
          <span>{field.label}</span>
          <textarea
            onChange={(event) => updateValue(groupKey, field.key, event.target.value)}
            rows={4}
            value={String(value ?? '')}
          />
          {field.note ? <small>{field.note}</small> : null}
        </label>
      );
    }

    if (field.type === 'select') {
      return (
        <label className="settings-field" key={field.key}>
          <span>{field.label}</span>
          <select onChange={(event) => updateValue(groupKey, field.key, event.target.value)} value={String(value ?? '')}>
            {(field.options ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {field.note ? <small>{field.note}</small> : null}
        </label>
      );
    }

    return (
      <label className="settings-field" key={field.key}>
        <span>{field.label}</span>
        <input
          max={field.max ?? undefined}
          min={field.min ?? undefined}
          onChange={(event) =>
            updateValue(groupKey, field.key, field.type === 'number' ? Number(event.target.value) : event.target.value)
          }
          type={field.type}
          value={String(value ?? '')}
        />
        {field.note ? <small>{field.note}</small> : null}
      </label>
    );
  }

  if (settingGroups.length === 0) {
    return (
      <section className="empty-state">
        <div className="empty-state-icon">⚙</div>
        <h3>تعذر تحميل مركز الإعدادات</h3>
        <p>شغل الواجهة الخلفية أو تحقق من الاتصال ثم أعد فتح الصفحة.</p>
      </section>
    );
  }

  return (
    <div className="settings-center">
      <section className="settings-summary">
        <div>
          <p className="eyebrow">مركز التحكم</p>
          <h3>إعدادات قابلة للتوسع حسب كل قسم</h3>
          <p>كل خيار محفوظ في بنية مرنة مع وصف ونوع وقيمة افتراضية، لذلك يمكن إضافة إعدادات جديدة بدون إعادة بناء الصفحة.</p>
        </div>
        <div className="settings-summary-grid">
          <div>
            <span>الأقسام</span>
            <strong>{settingGroups.length}</strong>
          </div>
          <div>
            <span>الإعدادات</span>
            <strong>{totalSettingsCount}</strong>
          </div>
          <div>
            <span>المكتمل</span>
            <strong>{completedSettingsCount}</strong>
          </div>
        </div>
      </section>

      {message ? <p className={message.includes('تعذر') ? 'notice danger' : 'notice'}>{message}</p> : null}

      <div className="settings-layout">
        <aside className="settings-tabs" aria-label="أقسام الإعدادات">
          {settingGroups.map((group) => (
            <button
              className={group.key === activeGroup?.key ? 'active' : ''}
              key={group.key}
              onClick={() => setActiveGroupKey(group.key)}
              type="button"
            >
              <strong>{group.title}</strong>
              <span>{group.fields.length} إعداد</span>
            </button>
          ))}
        </aside>

        <section className="settings-section">
          <div className="settings-section-heading">
            <div>
              <h3>{activeGroup?.title}</h3>
              <p>{activeGroup?.description}</p>
            </div>
            <button disabled={isSaving} onClick={() => saveSettings('group')} type="button">
              {isSaving ? 'جار الحفظ...' : 'حفظ القسم'}
            </button>
          </div>

          {activeGroup?.key === 'maintenance' ? (
            <div className="backup-panel">
              <div>
                <span>آخر نسخة احتياطية</span>
                <strong>{formatBackupDate(maintenanceValues.lastBackupAt)}</strong>
                <p>{String(maintenanceValues.lastBackupStatus ?? 'لا توجد نسخة بعد')}</p>
              </div>
              <button disabled={isBackingUp} onClick={createBackup} type="button">
                {isBackingUp ? 'جار إنشاء النسخة...' : 'نسخ احتياطي يدوي'}
              </button>
            </div>
          ) : null}

          <div className="settings-card-grid">{activeGroup?.fields.map((field) => renderField(activeGroup.key, field))}</div>
        </section>
      </div>

      <div className="settings-global-actions">
        <button className="secondary-button" disabled={isSaving} onClick={() => setValues(buildInitialValues(settingGroups))} type="button">
          استعادة آخر القيم المحملة
        </button>
        <button className="primary-button" disabled={isSaving} onClick={() => saveSettings('all')} type="button">
          {isSaving ? 'جار حفظ الإعدادات...' : 'حفظ جميع الإعدادات'}
        </button>
      </div>
    </div>
  );
}
