import { AutoApplyFilterForm } from '../../components/auto-apply-filter-form';
import { type DataColumn } from '../../components/data-table';
import { PageHeader } from '../../components/page-header';
import { SplitTransactionsTables } from '../../components/split-transactions-tables';
import { buildQuery, fetchList, formatDate, getMoneyFormatter } from '../../lib/api';
import { displayLabel } from '../../lib/display-labels';
import type { VaultOption } from '../../lib/types';

type VaultTransaction = {
  id: string;
  transactionDate: string;
  transactionType: string;
  direction: string;
  amount: number;
  description: string;
  referenceNumber?: string | null;
  notes?: string | null;
  vault?: { name: string } | null;
  branch?: { name: string } | null;
  drawer?: { name: string } | null;
  bankAccount?: { name: string } | null;
};

const typeOptions = [
  ['deposit_from_drawer', 'تحويل من درج'],
  ['deposit_from_bank', 'إيداع من بنك'],
  ['manual_deposit', 'إيداع يدوي'],
  ['withdrawal_to_bank', 'تحويل إلى بنك'],
  ['payroll_payment', 'دفع راتب'],
  ['expense_payment', 'دفع مصروف'],
  ['supplier_payment', 'دفع مورد'],
  ['admin_withdrawal', 'سحب إداري'],
  ['manual_withdrawal', 'سحب يدوي'],
  ['settlement', 'تسوية'],
];

function exportQuery(params: Record<string, string | undefined>, format: 'excel' | 'pdf') {
  return buildQuery({
    vault_id: params.vault_id,
    transaction_type: params.transaction_type,
    direction: params.direction,
    date_from: params.date_from,
    date_to: params.date_to,
    search: params.search,
    format,
  });
}

export default async function VaultTransactionsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const showAll = params.show_all === '1';
  const showAllHref = `/vault-transactions${buildQuery({ ...params, show_all: '1' })}`;
  const query = buildQuery({
    vault_id: params.vault_id,
    transaction_type: params.transaction_type,
    direction: params.direction,
    date_from: params.date_from,
    date_to: params.date_to,
    search: params.search,
  });
  const [transactions, vaults, formatMoney] = await Promise.all([
    fetchList<VaultTransaction>(`/vaults/transactions${query}`),
    fetchList<VaultOption>('/vaults'),
    getMoneyFormatter(),
  ]);

  const columns: DataColumn<VaultTransaction>[] = [
    { key: 'date', label: 'التاريخ', render: (row) => formatDate(row.transactionDate) },
    { key: 'vault', label: 'الخزنة', render: (row) => row.vault?.name ?? 'غير محدد' },
    { key: 'type', label: 'نوع الحركة', render: (row) => displayLabel(row.transactionType) },
    { key: 'amount', label: 'المبلغ', render: (row) => formatMoney(row.amount) },
    {
      key: 'source',
      label: 'المصدر / الوجهة',
      render: (row) => row.drawer?.name ?? row.bankAccount?.name ?? row.branch?.name ?? 'الخزنة',
    },
    { key: 'reference', label: 'المرجع', render: (row) => row.referenceNumber ?? 'غير محدد' },
    { key: 'notes', label: 'ملاحظات', render: (row) => row.notes ?? row.description },
  ];

  return (
    <>
      <PageHeader title="حركات الخزنة" description="سجل مركزي للحركات الداخلة والخارجة من الخزن مع فلاتر موحدة." />

      <AutoApplyFilterForm className="filter-bar">
        <label>
          الخزنة
          <select name="vault_id" defaultValue={params.vault_id ?? ''}>
            <option value="">كل الخزن</option>
            {vaults.data.map((vault) => (
              <option key={vault.id} value={vault.id}>
                {vault.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          نوع الحركة
          <select name="transaction_type" defaultValue={params.transaction_type ?? ''}>
            <option value="">كل الأنواع</option>
            {typeOptions.map(([value]) => (
              <option key={value} value={value}>
                {displayLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label>
          الاتجاه
          <select name="direction" defaultValue={params.direction ?? ''}>
            <option value="">الكل</option>
            <option value="in">داخل</option>
            <option value="out">خارج</option>
          </select>
        </label>
        <label>
          من تاريخ
          <input name="date_from" type="date" defaultValue={params.date_from ?? ''} />
        </label>
        <label>
          إلى تاريخ
          <input name="date_to" type="date" defaultValue={params.date_to ?? ''} />
        </label>
        <label>
          بحث
          <input name="search" defaultValue={params.search ?? ''} placeholder="الوصف أو المرجع" />
        </label>
        <div className="form-actions">
          <a className="secondary-button" href="/vault-transactions">
            إعادة ضبط
          </a>
        </div>
      </AutoApplyFilterForm>

      <div className="report-export-actions">
        <a className="secondary-button" href={`/api/vaults/transactions/export${exportQuery(params, 'excel')}`}>
          تصدير Excel
        </a>
        <a className="secondary-button" href={`/api/vaults/transactions/export${exportQuery(params, 'pdf')}`}>
          تصدير PDF
        </a>
      </div>
      {transactions.error ? <p className="notice">{transactions.error}</p> : null}
      <SplitTransactionsTables
        columns={columns}
        rows={transactions.data}
        getDate={(row) => row.transactionDate}
        getDirection={(row) => (row.direction === 'in' ? 'in' : 'out')}
        showAll={showAll}
        showAllHref={showAllHref}
        emptyIncomingText="لا توجد حركات خزنة داخلة مطابقة للفلاتر الحالية."
        emptyOutgoingText="لا توجد حركات خزنة خارجة مطابقة للفلاتر الحالية."
      />
    </>
  );
}
