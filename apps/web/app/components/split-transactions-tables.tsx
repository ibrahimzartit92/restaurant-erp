import Link from 'next/link';
import { DataTable, type DataColumn } from './data-table';

const recentLimit = 8;

type SplitTransactionsTablesProps<T> = {
  rows: T[];
  columns: DataColumn<T>[];
  getDirection: (row: T) => 'in' | 'out';
  getDate: (row: T) => string;
  showAll: boolean;
  showAllHref: string;
  emptyIncomingText: string;
  emptyOutgoingText: string;
};

function sortNewestFirst<T>(rows: T[], getDate: (row: T) => string) {
  return [...rows].sort((first, second) => {
    const firstTime = new Date(getDate(first)).getTime();
    const secondTime = new Date(getDate(second)).getTime();
    return secondTime - firstTime;
  });
}

function visibleRows<T>(rows: T[], showAll: boolean) {
  return showAll ? rows : rows.slice(0, recentLimit);
}

export function SplitTransactionsTables<T>({
  rows,
  columns,
  getDirection,
  getDate,
  showAll,
  showAllHref,
  emptyIncomingText,
  emptyOutgoingText,
}: Readonly<SplitTransactionsTablesProps<T>>) {
  const sortedRows = sortNewestFirst(rows, getDate);
  const incomingRows = sortedRows.filter((row) => getDirection(row) === 'in');
  const outgoingRows = sortedRows.filter((row) => getDirection(row) === 'out');
  const incomingVisibleRows = visibleRows(incomingRows, showAll);
  const outgoingVisibleRows = visibleRows(outgoingRows, showAll);
  const shouldShowAll = !showAll && (incomingRows.length > recentLimit || outgoingRows.length > recentLimit);

  return (
    <section className="split-transactions-grid">
      <article className="split-transactions-panel incoming">
        <div className="panel-heading">
          <div>
            <h3>الحركات الداخلة</h3>
            <span>
              {incomingRows.length} حركة
              {!showAll && incomingRows.length > recentLimit ? ` - أحدث ${recentLimit}` : ''}
            </span>
          </div>
          {shouldShowAll ? (
            <Link className="secondary-button compact" href={showAllHref}>
              عرض الكل
            </Link>
          ) : null}
        </div>
        <DataTable
          columns={columns}
          rows={incomingVisibleRows}
          emptyTitle="لا توجد حركات داخلة"
          emptyText={emptyIncomingText}
        />
      </article>

      <article className="split-transactions-panel outgoing">
        <div className="panel-heading">
          <div>
            <h3>الحركات الخارجة</h3>
            <span>
              {outgoingRows.length} حركة
              {!showAll && outgoingRows.length > recentLimit ? ` - أحدث ${recentLimit}` : ''}
            </span>
          </div>
          {shouldShowAll ? (
            <Link className="secondary-button compact" href={showAllHref}>
              عرض الكل
            </Link>
          ) : null}
        </div>
        <DataTable
          columns={columns}
          rows={outgoingVisibleRows}
          emptyTitle="لا توجد حركات خارجة"
          emptyText={emptyOutgoingText}
        />
      </article>
    </section>
  );
}
