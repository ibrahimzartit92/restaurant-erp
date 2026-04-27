import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DataTable, type DataColumn } from '../../../components/data-table';
import { PageHeader } from '../../../components/page-header';
import { StatusBadge } from '../../../components/status-badge';
import { buildQuery, fetchList, fetchOne, formatDate, formatMoney } from '../../../lib/api';
import type { BankAccountSummary, BankAccountTransactionSummary } from '../../../lib/types';

const transactionColumns: DataColumn<BankAccountTransactionSummary>[] = [
  { key: 'date', label: 'التاريخ', render: (row) => formatDate(row.transactionDate) },
  { key: 'type', label: 'النوع', render: (row) => <StatusBadge value={row.transactionType} /> },
  { key: 'direction', label: 'الاتجاه', render: (row) => row.direction === 'incoming' ? 'داخل' : 'خارج' },
  { key: 'amount', label: 'المبلغ', render: (row) => formatMoney(row.amount) },
  { key: 'branch', label: 'الفرع', render: (row) => row.branch?.name ?? 'بدون فرع' },
  { key: 'description', label: 'الوصف', render: (row) => row.description },
];

export default async function BankAccountDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [accountResult, transactionsResult] = await Promise.all([
    fetchOne<BankAccountSummary>(`/bank-accounts/${id}`),
    fetchList<BankAccountTransactionSummary>(`/bank-account-transactions${buildQuery({ bank_account_id: id })}`),
  ]);

  if (!accountResult.data) {
    notFound();
  }

  const account = accountResult.data;

  return (
    <>
      <PageHeader title="صفحة تفاصيل الحساب البنكي" description="عرض بيانات الحساب البنكي ورصيده الحالي وملخص الحركات المرتبطة به." />

      <section className="summary-grid">
        <article className="summary-card">
          <p>الرصيد الحالي</p>
          <strong>{formatMoney(account.currentBalance ?? 0)}</strong>
          <span>{account.currency}</span>
        </article>
        <article className="summary-card">
          <p>الإيداعات</p>
          <strong>{formatMoney(account.transactionTotals?.deposits ?? 0)}</strong>
          <span>إجمالي الحركات الداخلة</span>
        </article>
        <article className="summary-card">
          <p>السحوبات</p>
          <strong>{formatMoney(account.transactionTotals?.withdrawals ?? 0)}</strong>
          <span>إجمالي الحركات الخارجة</span>
        </article>
        <article className="summary-card">
          <p>التحويلات</p>
          <strong>{formatMoney(account.transactionTotals?.transfers ?? 0)}</strong>
          <span>حركات من نوع تحويل</span>
        </article>
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-heading">
            <h3>بيانات الحساب</h3>
            <span>{account.code}</span>
          </div>
          <ul className="timeline-list">
            <li>اسم الحساب: {account.name}</li>
            <li>اسم البنك: {account.bankName}</li>
            <li>العملة: {account.currency}</li>
            <li>الآيبان: {account.iban ?? 'غير محدد'}</li>
            <li>رقم الحساب: {account.accountNumber ?? 'غير محدد'}</li>
            <li>الحالة: {account.isActive ? 'نشط' : 'متوقف'}</li>
            <li>ملاحظات: {account.notes ?? 'بدون ملاحظات'}</li>
          </ul>
          <div className="form-actions">
            <Link className="primary-button" href={`/bank-accounts/${account.id}/edit`}>
              تعديل الحساب
            </Link>
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <h3>إجراء سريع</h3>
            <span>البنك</span>
          </div>
          <div className="quick-actions">
            <Link className="quick-link-button" href="/bank-account-transactions/new">
              إضافة حركة بنكية
            </Link>
            <Link className="quick-link-button" href="/bank-account-transactions">
              عرض حركات البنك
            </Link>
          </div>
        </div>
      </section>

      {transactionsResult.error ? <p className="notice">{transactionsResult.error}</p> : null}
      <DataTable
        columns={transactionColumns}
        rows={transactionsResult.data}
        emptyTitle="لا توجد حركات بنكية"
        emptyText="عند إضافة حركة جديدة لهذا الحساب ستظهر هنا مع النوع والمبلغ والوصف."
      />
    </>
  );
}
