'use client';

import { useState } from 'react';
import { ModalDialog } from './modal-dialog';

type PostCloseChange = {
  id?: string | null;
  operationType: string;
  actionType: 'created' | 'edited' | 'cancelled' | 'deleted';
  effectiveDate: string;
  recordedAt: string;
  amount?: number | null;
  reference?: string | null;
  operationId?: string | null;
};

const operationLabels: Record<string, string> = {
  expense: 'مصروف',
  purchase_invoice: 'فاتورة شراء',
  purchase_invoice_payment: 'دفعة شراء',
  supplier_payment: 'دفعة مورد',
  wholesale_collection: 'تحصيل جملة',
  wholesale_sales_invoice: 'فاتورة بيع جملة',
  employee_debt: 'دين موظف',
  employee_advance: 'سلفة موظف',
};

const actionLabels: Record<string, string> = {
  created: 'إضافة',
  edited: 'تعديل',
  cancelled: 'إلغاء',
  deleted: 'حذف',
};

function money(value?: number | string | null) {
  return `${new Intl.NumberFormat('ar', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value ?? 0))} €`;
}

export function DailySalesClosingChangesButton({ changes }: Readonly<{ changes?: PostCloseChange[] | null }>) {
  const [open, setOpen] = useState(false);
  const rows = changes ?? [];
  if (!rows.length) return null;

  return (
    <>
      <button className="modified-indicator" onClick={() => setOpen(true)} type="button">
        معدّلة
      </button>
      <ModalDialog onClose={() => setOpen(false)} open={open} title="تغييرات بعد الإقفال" width="980px">
        <div className="post-close-modal-table-wrap">
          <table className="post-close-modal-table">
            <thead>
              <tr>
                <th>العملية</th>
                <th>الإجراء</th>
                <th>تاريخ التأثير</th>
                <th>وقت التسجيل</th>
                <th>المبلغ</th>
                <th>المرجع</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((change, index) => (
                <tr key={`${change.id ?? change.operationId ?? change.operationType}-${change.recordedAt}-${index}`}>
                  <td>{operationLabels[change.operationType] ?? change.operationType}</td>
                  <td>{actionLabels[change.actionType] ?? change.actionType}</td>
                  <td>{change.effectiveDate}</td>
                  <td>{new Date(change.recordedAt).toLocaleString('ar')}</td>
                  <td>{change.amount === null || change.amount === undefined ? '-' : money(change.amount)}</td>
                  <td>{change.reference ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <style jsx>{`
          .modified-indicator {
            appearance: none;
            border: 1px solid #fde68a;
            border-radius: 999px;
            background: #fffbeb;
            color: #92400e;
            cursor: pointer;
            font: inherit;
            font-size: 0.78rem;
            font-weight: 800;
            line-height: 1;
            padding: 7px 10px;
          }
          .modified-indicator:hover {
            border-color: #f59e0b;
            background: #fef3c7;
          }
          .post-close-modal-table-wrap {
            overflow-x: auto;
          }
          .post-close-modal-table {
            width: 100%;
            border-collapse: collapse;
            min-width: 760px;
          }
          .post-close-modal-table th,
          .post-close-modal-table td {
            border-bottom: 1px solid #e5e7eb;
            padding: 10px 12px;
            text-align: right;
            vertical-align: top;
          }
          .post-close-modal-table th {
            background: #f8fafc;
            color: #334155;
            font-size: 0.82rem;
          }
        `}</style>
      </ModalDialog>
    </>
  );
}
