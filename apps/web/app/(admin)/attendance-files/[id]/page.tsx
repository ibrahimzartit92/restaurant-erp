import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AttachmentsPanel } from '../../../components/attachments-panel';
import { PageHeader } from '../../../components/page-header';
import { fetchList, fetchOne } from '../../../lib/api';
import type { AttachmentSummary, AttendanceFileSummary } from '../../../lib/types';

export default async function AttendanceFileDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [attendanceFileResult, attachmentsResult] = await Promise.all([
    fetchOne<AttendanceFileSummary>(`/attendance-files/${id}`),
    fetchList<AttachmentSummary>(`/attachments?entity_type=attendance_file&entity_id=${id}`),
  ]);

  if (!attendanceFileResult.data) {
    notFound();
  }

  const attendanceFile = attendanceFileResult.data;

  return (
    <>
      <PageHeader title="تفاصيل ملف البصمة" description="عرض بيانات ملف الحضور وإدارة المرفقات المرتبطة به." />

      <section className="content-grid">
        <div className="panel">
          <div className="panel-heading">
            <h3>بيانات الملف</h3>
            <span>{attendanceFile.fileType}</span>
          </div>
          <ul className="timeline-list">
            <li>اسم الملف: {attendanceFile.fileName}</li>
            <li>الموظف: {attendanceFile.employee?.fullName ?? 'غير محدد'}</li>
            <li>الفرع: {attendanceFile.branch?.name ?? 'غير محدد'}</li>
            <li>الفترة: {attendanceFile.month}/{attendanceFile.year}</li>
            <li>ملاحظات: {attendanceFile.notes ?? 'بدون ملاحظات'}</li>
          </ul>
          <div className="form-actions">
            <Link className="secondary-button" href="/attendance-files">
              قائمة ملفات البصمة
            </Link>
          </div>
        </div>
      </section>

      {attendanceFileResult.error ? <p className="notice">{attendanceFileResult.error}</p> : null}
      {attachmentsResult.error ? <p className="notice">{attachmentsResult.error}</p> : null}
      <AttachmentsPanel entityType="attendance_file" entityId={attendanceFile.id} initialAttachments={attachmentsResult.data} />
    </>
  );
}
