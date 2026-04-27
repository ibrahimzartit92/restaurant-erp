import Link from 'next/link';
import { DataTable, type DataColumn } from '../../components/data-table';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { buildQuery, fetchList, formatDate, formatMoney } from '../../lib/api';
import type { BankAccountSummary, BankAccountTransactionSummary, BranchOption } from '../../lib/types';

const columns: DataColumn<BankAccountTransactionSummary>[] = [
  { key: 'date', label: 'التاريخ', render: (row) => formatDate(row.transactionDate) },
  { key: 'account', label: 'الحساب', render: (row) => row.bankAccount?.name ?? 'غير محدد' },
  { key: 'type', label: 'النوع', render: (row) => <StatusBadge value={row.transactionType} /> },
  { key: 'direction', label: 'الاتجاه', render: (row) => row.direction === 'incoming' ? 'داخل' : 'خارج' },
  { key: 'amount', label: 'المبلغ', render: (row) => formatMoney(row.amount) },
  { key: 'branch', label: 'الفرع', render: (row) => row.branch?.name ?? 'بدون فرع' },
  { key: 'reference', label: 'المرجع', render: (row) => row.referenceNumber ?? 'غير محدد' },
  { key: 'description', label: 'الوصف', render: (row) => row.description },
];

const transactionTypeOptions = [
  { value: '', label: 'كل الأنواع' },
  { value: 'deposit', label: 'إيداع' },
  { value: 'withdrawal', label: 'سحب' },
  { value: 'transfer', label: 'تحويل' },
  { value: 'settlement', label: 'تسوية' },
  { value: 'supplier_payment_bank', label: 'دفعة مورد بنكية' },
  { value: 'expense_bank', label: 'مصروف بنكي' },
  { value: 'sales_receipt_bank', label: 'قبض مبيعات بنكي' },
  { value: 'refund_bank', label: 'مرتجع بنكي' },
];

export default async function BankAccountTransactionsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const [transactionsResult, branchesResult, bankAccountsResult] = await Promise.all([
    fetchList<BankAccountTransactionSummary>(
      `/bank-account-transactions${buildQuery({
        search: params.search,
        branch_id: params.branch_id,
        bank_account_id: params.bank_account_id,
        transaction_type: params.transaction_type,
        date_from: params.date_from,
        date_to: params.date_to,
      })}`,
    ),
    fetchList<BranchOption>('/branches'),
    fetchList<BankAccountSummary>('/bank-accounts'),
  ]);

  return (
    <>
      <PageHeader title="قائمة حركات البنك" description="عرض حركات البنك مع التصفية حسب الحساب والفرع والتاريخ ونوع الحركة." />
      <div className="page-toolbar">
        <form className="filters">
          <label>
            بحث
            <input defaultValue={params.search ?? ''} name="search" placeholder="الوصف أو المرجع" />
          </label>
          <label>
            الحساب البنكي
            <select defaultValue={params.bank_account_id ?? ''} name="bank_account_id">
              <option value="">كل الحسابات</option>
              {bankAccountsResult.data.map((bankAccount) => (
                <option key={bankAccount.id} value={bankAccount.id}>
                  {bankAccount.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            الفرع
            <select defaultValue={params.branch_id ?? ''} name="branch_id">
              <option value="">كل الفروع</option>
              {branchesResult.data.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            نوع الحركة
            <select defaultValue={params.transaction_type ?? ''} name="transaction_type">
              {transactionTypeOptions.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            من تاريخ
            <input defaultValue={params.date_from ?? ''} name="date_from" type="date" />
          </label>
          <label>
            إلى تاريخ
            <input defaultValue={params.date_to ?? ''} name="date_to" type="date" />
          </label>
          <button type="submit">تطبيق</button>
        </form>
        <Link className="primary-button" href="/bank-account-transactions/new">
          حركة بنكية جديدة
        </Link>
      </div>
      {transactionsResult.error ? <p className="notice">{transactionsResult.error}</p> : null}
      <DataTable
        columns={columns}
        rows={transactionsResult.data}
        emptyTitle="لا توجد حركات بنكية"
        emptyText="عند إضافة حركة بنكية جديدة ستظهر هنا مع الحساب والنوع والاتجاه والمبلغ."
      />
    </>
  );
}
