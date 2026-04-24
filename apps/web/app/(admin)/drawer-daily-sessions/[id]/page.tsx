import Link from 'next/link';
import { DataTable, type DataColumn } from '../../../components/data-table';
import { PageHeader } from '../../../components/page-header';
import { StatusBadge } from '../../../components/status-badge';
import { fetchOne, formatDate, formatMoney } from '../../../lib/api';

type DrawerTransaction = {
  id: string;
  transactionDate: string;
  transactionType: string;
  direction: string;
  amount: number;
  description: string;
};

type DrawerSessionDetails = {
  id: string;
  drawer?: { name: string } | null;
  branch?: { name: string } | null;
  sessionDate: string;
  openingBalance: number;
  calculatedBalance: number;
  closingBalance?: number | null;
  differenceAmount: number;
  status: string;
  notes?: string | null;
  transactions: DrawerTransaction[];
};

const columns: DataColumn<DrawerTransaction>[] = [
  { key: 'date', label: 'التاريخ', render: (row) => formatDate(row.transactionDate) },
  { key: 'type', label: 'نوع الحركة', render: (row) => <StatusBadge value={row.transactionType} /> },
  { key: 'direction', label: 'الاتجاه', render: (row) => row.direction === 'in' ? 'داخل' : 'خارج' },
  { key: 'amount', label: 'المبلغ', render: (row) => formatMoney(row.amount) },
  { key: 'description', label: 'الوصف', render: (row) => row.description },
];

export default async function DrawerSessionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await fetchOne<DrawerSessionDetails>(`/drawer-daily-sessions/${id}`);
  const session = result.data;

  if (!session) {
    return (
      <>
        <PageHeader title="تفاصيل جلسة الدرج" description="تعذر تحميل الجلسة." />
        <p className="notice">{result.error ?? 'الجلسة غير متاحة.'}</p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="تفاصيل جلسة الدرج"
        description={`${session.drawer?.name ?? 'درج'} - ${session.branch?.name ?? 'فرع'} - ${formatDate(session.sessionDate)}`}
      />
      <section className="summary-grid">
        <article className="summary-card">
          <p>الرصيد الافتتاحي</p>
          <strong>{formatMoney(session.openingBalance)}</strong>
          <span>مدخل يدوياً</span>
        </article>
        <article className="summary-card">
          <p>الرصيد المحسوب</p>
          <strong>{formatMoney(session.calculatedBalance)}</strong>
          <span>من حركات الدرج</span>
        </article>
        <article className="summary-card">
          <p>الرصيد الختامي</p>
          <strong>{session.closingBalance === null ? 'غير مغلق' : formatMoney(session.closingBalance)}</strong>
          <span>الرصيد الفعلي</span>
        </article>
        <article className="summary-card">
          <p>الفرق</p>
          <strong>{formatMoney(session.differenceAmount)}</strong>
          <span>{session.status === 'open' ? 'الجلسة مفتوحة' : 'بعد الإغلاق'}</span>
        </article>
      </section>

      <div className="page-toolbar">
        <StatusBadge value={session.status} />
        {session.status === 'open' ? (
          <Link className="primary-button" href={`/drawer-daily-sessions/${session.id}/close`}>
            إغلاق الجلسة
          </Link>
        ) : null}
      </div>

      <DataTable
        columns={columns}
        rows={session.transactions}
        emptyTitle="لا توجد حركات لهذه الجلسة"
        emptyText="عند تسجيل حركات نقدية في نفس تاريخ الجلسة ستظهر هنا."
      />
    </>
  );
}
