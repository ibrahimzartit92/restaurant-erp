'use client';

import { useState } from 'react';
import { submitJson } from '../lib/client-api';
import type { BackupSummary } from './settings-center-form';

function formatDate(value?: string | null) {
  if (!value) {
    return 'غير محدد';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function formatSize(value?: number | string | null) {
  const size = Number(value ?? 0);

  if (!Number.isFinite(size) || size <= 0) {
    return 'غير محدد';
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} ك.ب`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} م.ب`;
}

export function MaintenanceBackupsPanel({ backups }: Readonly<{ backups: BackupSummary[] }>) {
  const [rows, setRows] = useState(backups);
  const [message, setMessage] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  async function restoreBackup(backup: BackupSummary) {
    if (
      !window.confirm(
        `سيتم استعادة الإعدادات والبيانات الأساسية من النسخة "${backup.fileName}". لن يتم تنفيذ مسح كامل للبيانات. هل تريد المتابعة؟`,
      )
    ) {
      return;
    }

    setRestoringId(backup.id);
    setMessage(null);

    try {
      await submitJson(`/settings/backups/${backup.id}/restore`, 'POST', {});
      setRows((currentRows) =>
        currentRows.map((row) =>
          row.id === backup.id ? { ...row, restoreStatus: 'restored', restoredAt: new Date().toISOString() } : row,
        ),
      );
      setMessage('تمت استعادة النسخة الاحتياطية بنجاح.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر استعادة النسخة الاحتياطية.');
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <section className="form-panel">
      <div className="panel-heading">
        <div>
          <h3>سجل النسخ الاحتياطية</h3>
          <span>الاستعادة آمنة ومحدودة على الإعدادات والبيانات الأساسية، ولا تقوم بمسح كامل للنظام.</span>
        </div>
      </div>
      {message ? <p className={message.includes('تعذر') ? 'notice danger' : 'notice'}>{message}</p> : null}
      {rows.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">+</div>
          <h3>لا توجد نسخ احتياطية بعد</h3>
          <p>استخدم زر النسخ الاحتياطي اليدوي من قسم الصيانة في الإعدادات.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>اسم الملف</th>
                <th>التاريخ</th>
                <th>الحجم</th>
                <th>الحالة</th>
                <th>آخر استعادة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((backup) => (
                <tr key={backup.id}>
                  <td>{backup.fileName}</td>
                  <td>{formatDate(backup.createdAt)}</td>
                  <td>{formatSize(backup.fileSize)}</td>
                  <td>{backup.status === 'success' ? 'ناجحة' : backup.status}</td>
                  <td>{backup.restoreStatus ? formatDate(backup.restoredAt) : 'لم تستعد بعد'}</td>
                  <td>
                    <button className="secondary-button" disabled={restoringId === backup.id} type="button" onClick={() => restoreBackup(backup)}>
                      {restoringId === backup.id ? 'جار الاستعادة...' : 'استعادة'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
