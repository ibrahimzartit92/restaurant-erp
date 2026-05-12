'use client';

import { useEffect, useId, useRef } from 'react';

export function ModalDialog({
  open,
  title,
  children,
  onClose,
  width = '760px',
}: Readonly<{
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  width?: string;
}>) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      aria-labelledby={titleId}
      className="app-modal"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      ref={dialogRef}
      style={{ width: `min(${width}, calc(100vw - 32px))` }}
    >
      <div className="app-modal-header">
        <h3 id={titleId}>{title}</h3>
        <button aria-label="إغلاق" className="secondary-button compact" onClick={onClose} type="button">
          إغلاق
        </button>
      </div>
      <div className="app-modal-body">{children}</div>
    </dialog>
  );
}
