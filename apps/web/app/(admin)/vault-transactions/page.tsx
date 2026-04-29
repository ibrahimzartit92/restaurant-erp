import { DataTable, type DataColumn } from '../../components/data-table';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { buildQuery, fetchList, formatDate, getMoneyFormatter } from '../../lib/api';
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
  ['payroll_payment', 'دفع راتب'],
  ['admin_withdrawal', 'سحب إداري'],
  ['manual_withdrawal', 'سحب يدوي'],
  ['settlement', 'تسوية'],
];

function typeLabel(value: string) {
  return typeOptions.find(([key]) => key === value)?.[1] ?? value;
}

export default async function VaultTransactionsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
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
    { key: 'type', label: 'نوع الحركة', render: (row) => typeLabel(row.transactionType) },
    { key: 'direction', label: 'الاتجاه', render: (row) => <StatusBadge value={row.direction} /> },
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
      <PageHeader title="حركات الخزنة" description="سجل مركزي لكل الداخل والخارج من الخزن مع الفلاتر اليومية." />

      <form className="filter-bar">
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
            {typeOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
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
          <button type="submit">تطبيق</button>
          <a className="secondary-button" href="/vault-transactions">
            إعادة ضبط
          </a>
        </div>
      </form>

      {transactions.error ? <p className="notice">{transactions.error}</p> : null}
      <DataTable columns={columns} rows={transactions.data} emptyTitle="لا توجد حركات" emptyText="لا توجد حركات خزنة مطابقة للفلاتر الحالية." />
    </>
  );
}
