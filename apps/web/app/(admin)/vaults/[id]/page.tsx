import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DataTable, type DataColumn } from '../../../components/data-table';
import { PageHeader } from '../../../components/page-header';
import { StatusBadge } from '../../../components/status-badge';
import { VaultTransferForm } from '../../../components/vault-transfer-form';
import { fetchList, fetchOne, formatDate, getMoneyFormatter } from '../../../lib/api';
import type { BankAccountOption, BranchOption, DrawerOption } from '../../../lib/types';

type VaultDetails = {
  id: string;
  code: string;
  name: string;
  openingBalance: number;
  openingBalanceDate?: string | null;
  currentBalance: number;
  isActive: boolean;
  notes?: string | null;
  transactionTotals?: {
    inflows: number;
    outflows: number;
  };
};

type VaultTransaction = {
  id: string;
  transactionDate: string;
  transactionType: string;
  direction: string;
  amount: number;
  description: string;
  referenceNumber?: string | null;
  drawer?: { name: string } | null;
  bankAccount?: { name: string } | null;
};

function transactionTypeLabel(value: string) {
  const labels: Record<string, string> = {
    deposit_from_drawer: 'تحويل من درج',
    deposit_from_bank: 'إيداع من بنك',
    manual_deposit: 'إيداع يدوي',
    withdrawal_to_bank: 'تحويل إلى بنك',
    expense_payment: 'دفع مصروف',
    supplier_payment: 'دفع مورد',
    payroll_payment: 'دفع راتب',
    admin_withdrawal: 'سحب إداري',
    manual_withdrawal: 'سحب يدوي',
    settlement: 'تسوية',
  };

  return labels[value] ?? value;
}

export default async function VaultDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [vault, transactions, drawers, bankAccounts, branches, formatMoney] = await Promise.all([
    fetchOne<VaultDetails>(`/vaults/${id}`),
    fetchList<VaultTransaction>(`/vaults/transactions?vault_id=${id}`),
    fetchList<DrawerOption>('/drawers'),
    fetchList<BankAccountOption>('/bank-accounts'),
    fetchList<BranchOption>('/branches'),
    getMoneyFormatter(),
  ]);

  if (!vault.data) {
    notFound();
  }

  const columns: DataColumn<VaultTransaction>[] = [
    { key: 'date', label: 'التاريخ', render: (row) => formatDate(row.transactionDate) },
    { key: 'type', label: 'النوع', render: (row) => transactionTypeLabel(row.transactionType) },
    { key: 'direction', label: 'الاتجاه', render: (row) => <StatusBadge value={row.direction} /> },
    { key: 'amount', label: 'المبلغ', render: (row) => formatMoney(row.amount) },
    { key: 'source', label: 'المصدر / الوجهة', render: (row) => row.drawer?.name ?? row.bankAccount?.name ?? 'الخزنة' },
    { key: 'reference', label: 'المرجع', render: (row) => row.referenceNumber ?? 'غير محدد' },
  ];

  return (
    <>
      <PageHeader title={vault.data.name} description="تفاصيل الخزنة المركزية والرصيد الحالي وآخر الحركات." />

      <section className="summary-grid">
        <article className="summary-card">
          <p>الرصيد الحالي</p>
          <strong>{formatMoney(vault.data.currentBalance)}</strong>
          <span>افتتاحي {formatMoney(vault.data.openingBalance)}</span>
        </article>
        <article className="summary-card">
          <p>إجمالي الداخل</p>
          <strong>{formatMoney(vault.data.transactionTotals?.inflows ?? 0)}</strong>
          <span>كل الإيداعات والتحويلات الداخلة</span>
        </article>
        <article className="summary-card">
          <p>إجمالي الخارج</p>
          <strong>{formatMoney(vault.data.transactionTotals?.outflows ?? 0)}</strong>
          <span>المدفوعات والسحوبات</span>
        </article>
        <article className="summary-card">
          <p>الحالة</p>
          <strong>
            <StatusBadge value={vault.data.isActive} />
          </strong>
          <span>{vault.data.code}</span>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <h3>بيانات الخزنة</h3>
              <span>{vault.data.notes ?? 'بدون ملاحظات'}</span>
            </div>
            <Link className="secondary-button" href={`/vaults/${vault.data.id}/edit`}>
              تعديل
            </Link>
          </div>
          <ul className="timeline-list">
            <li>الكود: {vault.data.code}</li>
            <li>الرصيد الافتتاحي: {formatMoney(vault.data.openingBalance)}</li>
            <li>تاريخ الرصيد الافتتاحي: {formatDate(vault.data.openingBalanceDate)}</li>
          </ul>
        </article>

        <VaultTransferForm
          vaultId={vault.data.id}
          drawers={drawers.data}
          bankAccounts={bankAccounts.data}
          branches={branches.data}
        />
      </section>

      {transactions.error ? <p className="notice">{transactions.error}</p> : null}
      <section className="panel">
        <div className="panel-heading">
          <h3>آخر حركات الخزنة</h3>
          <Link className="text-link" href={`/vault-transactions?vault_id=${vault.data.id}`}>
            عرض كل الحركات
          </Link>
        </div>
        <DataTable columns={columns} rows={transactions.data.slice(0, 10)} emptyTitle="لا توجد حركات" emptyText="ستظهر حركات الخزنة هنا بعد أول إيداع أو سحب." />
      </section>
    </>
  );
}
