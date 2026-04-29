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
  requiredClosingFloat?: number;
  closingBalance?: number | null;
  differenceAmount: number;
  status: string;
  notes?: string | null;
  movementTotals?: {
    inflows: number;
    outflows: number;
  };
  reconciliationDifference?: number | null;
  transactions: DrawerTransaction[];
};

const columns: DataColumn<DrawerTransaction>[] = [
  { key: 'date', label: 'التاريخ', render: (row) => formatDate(row.transactionDate) },
  { key: 'type', label: 'نوع الحركة', render: (row) => <StatusBadge value={row.transactionType} /> },
  { key: 'direction', label: 'الاتجاه', render: (row) => (row.direction === 'in' ? 'داخل' : 'خارج') },
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
        <PageHeader title="تفاصيل تسوية الدرج" description="تعذر تحميل التسوية." />
        <p className="notice">{result.error ?? 'التسوية غير متاحة.'}</p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="تفاصيل تسوية الدرج"
        description={`${session.drawer?.name ?? 'درج'} - ${session.branch?.name ?? 'فرع'} - ${formatDate(session.sessionDate)}`}
      />
      <section className="summary-grid">
        <article className="summary-card">
          <p>العهدة الثابتة</p>
          <strong>{formatMoney(session.requiredClosingFloat ?? session.openingBalance)}</strong>
          <span>المبلغ المعتمد كبداية نقدية لليوم</span>
        </article>
        <article className="summary-card">
          <p>إجمالي الداخل</p>
          <strong>{formatMoney(session.movementTotals?.inflows ?? 0)}</strong>
          <span>مبيعات نقدية وحركات داخلة</span>
        </article>
        <article className="summary-card">
          <p>إجمالي الخارج</p>
          <strong>{formatMoney(session.movementTotals?.outflows ?? 0)}</strong>
          <span>مصروفات ودفعات وسلف نقدية</span>
        </article>
        <article className="summary-card">
          <p>الرصيد النظري</p>
          <strong>{formatMoney(session.calculatedBalance)}</strong>
          <span>العهدة + الداخل - الخارج</span>
        </article>
        <article className="summary-card">
          <p>النقد الفعلي</p>
          <strong>{session.closingBalance === null ? 'لم يدخل' : formatMoney(session.closingBalance)}</strong>
          <span>المبلغ الموجود فعليا عند الإغلاق</span>
        </article>
        <article className="summary-card">
          <p>الفرق</p>
          <strong>{formatMoney(session.reconciliationDifference ?? session.differenceAmount)}</strong>
          <span>النقد الفعلي - الرصيد النظري</span>
        </article>
      </section>

      <div className="page-toolbar">
        <StatusBadge value={session.status} />
        <Link className="secondary-button" href="/drawers">
          تعديل تسوية اليوم
        </Link>
      </div>

      {session.notes ? <p className="notice">{session.notes}</p> : null}

      <DataTable
        columns={columns}
        rows={session.transactions}
        emptyTitle="لا توجد حركات لهذا اليوم"
        emptyText="عند تسجيل مبيعات نقدية أو مصروفات أو دفعات مورد أو سلف نقدية في نفس التاريخ ستظهر هنا."
      />
    </>
  );
}
