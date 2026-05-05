import Link from 'next/link';
import { PageHeader } from '../../../components/page-header';
import { fetchList, fetchOne } from '../../../lib/api';

type WarehouseDetails = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

type StockRow = {
  itemId: string;
  itemCode: string;
  itemName: string;
  unitName?: string | null;
  quantity: string | number;
  latestMovementDate?: string | null;
};

function numberValue(value: string | number | null | undefined) {
  return Number(value ?? 0).toFixed(3);
}

export default async function WarehouseDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [warehouse, stock] = await Promise.all([
    fetchOne<WarehouseDetails>(`/warehouses/${id}`),
    fetchList<StockRow>(`/warehouses/${id}/current-stock`),
  ]);

  return (
    <>
      <PageHeader
        title={warehouse.data?.name ?? 'تفاصيل المخزن'}
        description="الرصيد الحالي للمواد داخل المخزن حسب دفتر حركات المخزون."
      />
      {warehouse.error || stock.error ? <p className="notice">{warehouse.error ?? stock.error}</p> : null}
      <div className="page-toolbar">
        <Link className="secondary-button" href={`/stock-movements?warehouseId=${id}`}>
          تقرير المخزون
        </Link>
        <Link className="primary-button" href="/stock-movements/new">
          حركة يدوية
        </Link>
      </div>
      <section className="summary-grid">
        <article className="summary-card">
          <p>عدد المواد</p>
          <strong>{stock.data.length}</strong>
          <span>مواد لها حركة في هذا المخزن</span>
        </article>
        <article className="summary-card">
          <p>مواد منخفضة أو صفر</p>
          <strong>{stock.data.filter((row) => Number(row.quantity) <= 0).length}</strong>
          <span>تحتاج مراجعة أو جرد</span>
        </article>
      </section>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>الكود</th>
              <th>المادة</th>
              <th>الوحدة</th>
              <th>الكمية الحالية</th>
              <th>آخر حركة</th>
              <th>تقرير</th>
            </tr>
          </thead>
          <tbody>
            {stock.data.map((row) => (
              <tr key={row.itemId}>
                <td>{row.itemCode}</td>
                <td>{row.itemName}</td>
                <td>{row.unitName ?? '-'}</td>
                <td>{numberValue(row.quantity)}</td>
                <td>{row.latestMovementDate ?? '-'}</td>
                <td>
                  <Link className="text-link" href={`/stock-movements?warehouseId=${id}&itemId=${row.itemId}`}>
                    كرت المادة
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
