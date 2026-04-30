import { DataTable, type DataColumn } from '../../components/data-table';
import { PageHeader } from '../../components/page-header';
import { UndoActionButton } from '../../components/undo-action-button';
import { fetchList, formatDate } from '../../lib/api';
import type { UndoActionSummary } from '../../lib/types';

const actionTypeLabels: Record<string, string> = {
  delete_only: 'حذف فقط',
  delete_with_vault_reversal: 'حذف مع إرجاع للخزنة',
};

const entityTypeLabels: Record<string, string> = {
  expense: 'مصروف',
  supplier_payment: 'دفعة مورد',
  employee_advance: 'سلفة موظف',
  employee_penalty: 'عقوبة موظف',
  payroll: 'راتب',
};

const columns: DataColumn<UndoActionSummary>[] = [
  { key: 'type', label: 'العملية', render: (row) => actionTypeLabels[row.actionType] ?? row.actionType },
  { key: 'entity', label: 'السجل', render: (row) => `${entityTypeLabels[row.entityType] ?? row.entityType} - ${row.recordSummary}` },
  { key: 'vault', label: 'الخزنة', render: (row) => (row.reverseToVault ? 'تم إرجاع المبلغ للخزنة' : 'بدون إرجاع مالي') },
  { key: 'createdAt', label: 'الوقت', render: (row) => formatDate(row.createdAt) },
  { key: 'actions', label: 'إجراء', render: (row) => <UndoActionButton actionId={row.id} /> },
];

export default async function UndoActionsPage() {
  const result = await fetchList<UndoActionSummary>('/undo-actions?limit=5');

  return (
    <>
      <PageHeader
        title="آخر 5 عمليات قابلة للتراجع"
        description="راجع آخر عمليات الحذف أو الإلغاء التي يمكن التراجع عنها واستعادة السجلات عند الحاجة."
      />
      {result.error ? <p className="notice">{result.error}</p> : null}
      <DataTable
        columns={columns}
        rows={result.data}
        emptyTitle="لا توجد عمليات قابلة للتراجع"
        emptyText="ستظهر هنا آخر عمليات الحذف القابلة للتراجع."
      />
    </>
  );
}
