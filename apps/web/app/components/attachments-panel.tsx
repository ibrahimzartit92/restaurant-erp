'use client';

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from 'react';
import { getClientApiBaseUrl } from '../lib/api-url';
import { readAccessTokenFromDocument } from '../lib/auth';
import type { AttachmentEntityType, AttachmentSummary } from '../lib/types';

const clientApiBaseUrl = getClientApiBaseUrl();

function getAttachmentKind(fileType: string) {
  if (fileType.startsWith('image/')) {
    return 'image';
  }

  if (fileType === 'application/pdf') {
    return 'pdf';
  }

  if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
    return 'excel';
  }

  return 'file';
}

function formatFileSize(value?: number | null) {
  if (!value) {
    return 'غير محدد';
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} ك.ب`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} م.ب`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ar', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function attachmentUrl(attachment: AttachmentSummary, action: 'preview' | 'download') {
  return `${clientApiBaseUrl}/attachments/${attachment.id}/${action}`;
}

export function AttachmentsPanel({
  entityType,
  entityId,
  initialAttachments,
}: Readonly<{
  entityType: AttachmentEntityType;
  entityId: string;
  initialAttachments: AttachmentSummary[];
}>) {
  const [attachments, setAttachments] = useState(initialAttachments);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState(initialAttachments[0]?.id ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const selectedAttachment = useMemo(
    () => attachments.find((attachment) => attachment.id === selectedAttachmentId) ?? attachments[0] ?? null,
    [attachments, selectedAttachmentId],
  );

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsUploading(true);
    setMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set('entityType', entityType);
    formData.set('entityId', entityId);

    try {
      const accessToken = readAccessTokenFromDocument();
      const response = await fetch(`${clientApiBaseUrl}/attachments`, {
        method: 'POST',
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message ?? 'تعذر رفع المرفق.');
      }

      const attachment = (await response.json()) as AttachmentSummary;
      setAttachments((currentAttachments) => [attachment, ...currentAttachments]);
      setSelectedAttachmentId(attachment.id);
      form.reset();
      setMessage('تم رفع المرفق بنجاح.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر رفع المرفق.');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="attachments-panel">
      <div className="panel-heading">
        <div>
          <h3>المرفقات</h3>
          <span>صور، PDF، وملفات Excel مرتبطة بهذا السجل</span>
        </div>
        <strong className="attachment-count">{attachments.length}</strong>
      </div>

      {message ? <p className={message.includes('تعذر') ? 'notice danger' : 'notice'}>{message}</p> : null}

      <form className="attachment-upload-form" onSubmit={handleUpload}>
        <label>
          الملف
          <input
            accept="image/*,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            name="file"
            required
            type="file"
          />
        </label>
        <label>
          ملاحظات
          <textarea name="notes" placeholder="اكتب ملاحظة قصيرة عن المرفق" rows={3} />
        </label>
        <button disabled={isUploading} type="submit">
          {isUploading ? 'جار رفع المرفق...' : 'رفع مرفق'}
        </button>
      </form>

      {attachments.length === 0 ? (
        <div className="attachments-empty">
          <strong>لا توجد مرفقات</strong>
          <span>ارفع صورة، ملف PDF، أو ملف Excel ليظهر هنا مع المعاينة والتنزيل.</span>
        </div>
      ) : (
        <div className="attachments-layout">
          <div className="attachments-list">
            {attachments.map((attachment) => {
              const kind = getAttachmentKind(attachment.fileType);
              const isActive = selectedAttachment?.id === attachment.id;

              return (
                <button
                  className={`attachment-list-item ${isActive ? 'active' : ''}`}
                  key={attachment.id}
                  onClick={() => setSelectedAttachmentId(attachment.id)}
                  type="button"
                >
                  <span className={`attachment-kind ${kind}`}>{kind === 'image' ? 'ص' : kind === 'pdf' ? 'PDF' : kind === 'excel' ? 'XLS' : 'ملف'}</span>
                  <span>
                    <strong>{attachment.fileName}</strong>
                    <small>
                      {attachment.fileType} · {formatFileSize(attachment.fileSize)} · {formatDate(attachment.createdAt)}
                    </small>
                    {attachment.notes ? <em>{attachment.notes}</em> : null}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedAttachment ? <AttachmentPreview attachment={selectedAttachment} /> : null}
        </div>
      )}
    </section>
  );
}

function AttachmentPreview({ attachment }: Readonly<{ attachment: AttachmentSummary }>) {
  const kind = getAttachmentKind(attachment.fileType);

  return (
    <div className="attachment-preview">
      <div className="attachment-preview-header">
        <div>
          <strong>{attachment.fileName}</strong>
          <span>{formatFileSize(attachment.fileSize)}</span>
        </div>
        <a className="secondary-button" href={attachmentUrl(attachment, 'download')}>
          تنزيل
        </a>
      </div>

      {kind === 'image' ? (
        <img alt={attachment.fileName} src={attachmentUrl(attachment, 'preview')} />
      ) : null}

      {kind === 'pdf' ? (
        <iframe src={attachmentUrl(attachment, 'preview')} title={attachment.fileName} />
      ) : null}

      {kind === 'excel' || kind === 'file' ? (
        <div className="attachment-file-preview">
          <strong>{kind === 'excel' ? 'ملف Excel' : 'ملف'}</strong>
          <p>لا تتوفر معاينة مباشرة لهذا النوع داخل المتصفح. يمكنك فتح الملف أو تنزيل النسخة الأصلية.</p>
          <a className="primary-button" href={attachmentUrl(attachment, 'preview')} target="_blank" rel="noreferrer">
            فتح الملف
          </a>
        </div>
      ) : null}
    </div>
  );
}
