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
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState('');

  async function createBackup() {
    setIsBackingUp(true);
    setMessage(null);

    try {
      const backup = (await submitJson('/settings/backup/manual', 'POST', {})) as BackupSummary & {
        lastBackupAt?: string;
      };
      setRows((currentRows) => [
        {
          id: backup.id,
          fileName: backup.fileName,
          fileSize: backup.fileSize,
          status: backup.status,
          backupType: backup.backupType,
          createdAt: backup.lastBackupAt ?? new Date().toISOString(),
        },
        ...currentRows,
      ]);
      setMessage('تم إنشاء نسخة احتياطية يدوية بنجاح.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر إنشاء النسخة الاحتياطية.');
    } finally {
      setIsBackingUp(false);
    }
  }

  async function restoreBackup(backup: BackupSummary) {
    if (
      !window.confirm(
        `سيتم استعادة الإعدادات والبيانات الأساسية من النسخة "${backup.fileName}". لن يتم تنفيذ مسح كامل للنظام. هل تريد المتابعة؟`,
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

  async function resetOperationalData() {
    if (resetConfirmation !== 'RESET') {
      setMessage('اكتب RESET لتأكيد إعادة ضبط البيانات التشغيلية.');
      return;
    }

    if (
      !window.confirm(
        'سيتم إنشاء نسخة احتياطية أولا ثم حذف بيانات العمليات فقط مثل الفواتير والمصاريف والمبيعات والحركات المالية. لن يتم حذف المستخدمين أو الإعدادات أو المواد الأساسية. هل تريد المتابعة؟',
      )
    ) {
      return;
    }

    setIsResetting(true);
    setMessage(null);

    try {
      await submitJson('/settings/maintenance/reset-operational', 'POST', { confirmation: resetConfirmation });
      setResetConfirmation('');
      setMessage('تم إنشاء نسخة احتياطية ثم إعادة ضبط البيانات التشغيلية بنجاح.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر إعادة ضبط البيانات التشغيلية.');
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <section className="form-panel stacked-sections">
      <div className="panel-heading">
        <div>
          <h3>الصيانة والنسخ الاحتياطي</h3>
          <span>أنشئ نسخة احتياطية، استعد نسخة سابقة، أو نفذ إعادة ضبط تشغيلية بتأكيد واضح.</span>
        </div>
        <button className="secondary-button" disabled={isBackingUp} type="button" onClick={createBackup}>
          {isBackingUp ? 'جار إنشاء النسخة...' : 'نسخ احتياطي يدوي'}
        </button>
      </div>

      {message ? <p className={message.includes('تعذر') ? 'notice danger' : 'notice'}>{message}</p> : null}

      <section className="backup-panel">
        <div>
          <strong>إعادة ضبط البيانات التشغيلية</strong>
          <p>يمسح بيانات العمليات اليومية بعد إنشاء نسخة احتياطية، ويبقي الإعدادات والمستخدمين والمواد والبيانات الأساسية.</p>
        </div>
        <label>
          اكتب RESET للتأكيد
          <input value={resetConfirmation} onChange={(event) => setResetConfirmation(event.target.value)} />
        </label>
        <button className="secondary-button danger" disabled={isResetting} type="button" onClick={resetOperationalData}>
          {isResetting ? 'جار إعادة الضبط...' : 'إعادة ضبط البيانات التشغيلية'}
        </button>
      </section>

      {rows.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">+</div>
          <h3>لا توجد نسخ احتياطية بعد</h3>
          <p>استخدم زر النسخ الاحتياطي اليدوي لإنشاء أول نسخة.</p>
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
                    <button
                      className="secondary-button"
                      disabled={restoringId === backup.id}
                      type="button"
                      onClick={() => restoreBackup(backup)}
                    >
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
