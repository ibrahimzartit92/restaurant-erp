import Link from 'next/link';
import { PageHeader } from '../../components/page-header';
import { buildQuery, fetchList, fetchOne } from '../../lib/api';
import type { ItemOption, WarehouseOption } from '../../lib/types';

type MovementRow = {
  id: string;
  movementDate: string;
  movementType: string;
  warehouse?: { name: string } | null;
  item?: { code: string; name: string; unit?: { name: string } | null } | null;
  quantityIn: number | string;
  quantityOut: number | string;
  balanceAfter: number | string;
  referenceNumber?: string | null;
  notes?: string | null;
};

type ReportRow = {
  itemCode: string;
  itemName: string;
  unitName?: string | null;
  openingQuantity: string | number;
  purchasedQuantity: string | number;
  transferInQuantity: string | number;
  transferOutQuantity: string | number;
  consumedQuantity: string | number;
  adjustmentQuantity: string | number;
  theoreticalEndingQuantity: string | number;
  actualCountedQuantity?: string | number | null;
  difference?: string | number | null;
};

type StockCard = {
  openingBalance: number;
  closingBalance: number;
  totals: {
    purchasesIn: number;
    transfersIn: number;
    transfersOut: number;
    manualOut: number;
    adjustments: number;
  };
};

const movementLabels: Record<string, string> = {
  purchase_in: 'شراء وارد',
  transfer_in: 'تحويل وارد',
  transfer_out: 'تحويل صادر',
  manual_in: 'إدخال يدوي',
  manual_out: 'صرف / استهلاك',
  stock_count_adjustment: 'تسوية جرد',
};

function numberValue(value: string | number | null | undefined) {
  return Number(value ?? 0).toFixed(3);
}

export default async function StockMovementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const query = buildQuery({
    warehouseId: params.warehouseId,
    itemId: params.itemId,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    movementType: params.movementType,
  });
  const reportQuery = buildQuery({
    warehouseId: params.warehouseId,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  });
  const stockCardQuery = buildQuery({
    warehouseId: params.warehouseId,
    itemId: params.itemId,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  });
  const [movements, warehouses, items, betweenCounts, stockCard] = await Promise.all([
    fetchList<MovementRow>(`/stock-movements${query}`),
    fetchList<WarehouseOption>('/warehouses'),
    fetchList<ItemOption>('/items'),
    params.warehouseId ? fetchList<ReportRow>(`/stock-movements/between-counts${reportQuery}`) : Promise.resolve({ data: [] }),
    params.warehouseId && params.itemId
      ? fetchOne<StockCard>(`/stock-movements/stock-card${stockCardQuery}`)
      : Promise.resolve({ data: null }),
  ]);

  return (
    <>
      <PageHeader
        title="حركات وتقارير المخزون"
        description="دفتر حركة لكل مادة ومخزن مع تقرير عملي بين تاريخين أو بين جردين."
      />
      <div className="page-toolbar">
        <form className="filters-form">
          <label>
            المخزن
            <select name="warehouseId" defaultValue={params.warehouseId ?? ''}>
              <option value="">كل المخازن</option>
              {warehouses.data.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            المادة
            <select name="itemId" defaultValue={params.itemId ?? ''}>
              <option value="">كل المواد</option>
              {items.data.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} - {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            من تاريخ
            <input name="dateFrom" type="date" defaultValue={params.dateFrom ?? ''} />
          </label>
          <label>
            إلى تاريخ
            <input name="dateTo" type="date" defaultValue={params.dateTo ?? ''} />
          </label>
          <button type="submit">تطبيق</button>
          <Link className="secondary-button" href="/stock-movements">
            إعادة ضبط
          </Link>
        </form>
        <Link className="primary-button" href="/stock-movements/new">
          حركة يدوية
        </Link>
      </div>

      {movements.error ? <p className="notice">{movements.error}</p> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>المخزن</th>
              <th>المادة</th>
              <th>نوع الحركة</th>
              <th>وارد</th>
              <th>صادر</th>
              <th>الرصيد بعد الحركة</th>
              <th>المرجع</th>
            </tr>
          </thead>
          <tbody>
            {movements.data.map((movement) => (
              <tr key={movement.id}>
                <td>{movement.movementDate}</td>
                <td>{movement.warehouse?.name ?? '-'}</td>
                <td>{movement.item ? `${movement.item.code} - ${movement.item.name}` : '-'}</td>
                <td>{movementLabels[movement.movementType] ?? movement.movementType}</td>
                <td>{numberValue(movement.quantityIn)}</td>
                <td>{numberValue(movement.quantityOut)}</td>
                <td>{numberValue(movement.balanceAfter)}</td>
                <td>{movement.referenceNumber ?? movement.notes ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {stockCard.data ? (
        <section className="summary-grid">
          <article className="summary-card">
            <p>الرصيد الافتتاحي</p>
            <strong>{numberValue(stockCard.data.openingBalance)}</strong>
            <span>قبل بداية الفترة المحددة</span>
          </article>
          <article className="summary-card">
            <p>المشتريات</p>
            <strong>{numberValue(stockCard.data.totals.purchasesIn)}</strong>
            <span>وارد من فواتير الشراء</span>
          </article>
          <article className="summary-card">
            <p>الاستهلاك اليدوي</p>
            <strong>{numberValue(stockCard.data.totals.manualOut)}</strong>
            <span>صرف أو استهلاك غير مرتبط بالمبيعات</span>
          </article>
          <article className="summary-card">
            <p>الرصيد الختامي</p>
            <strong>{numberValue(stockCard.data.closingBalance)}</strong>
            <span>حسب دفتر الحركة</span>
          </article>
        </section>
      ) : null}

      {params.warehouseId ? (
        <section className="form-panel">
          <div className="panel-heading">
            <div>
              <h3>تقرير بين تاريخين / بين جردين</h3>
              <span>يعرض المشتريات، التحويلات، الاستهلاك اليدوي، التسويات، والرصيد النظري لكل مادة.</span>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>المادة</th>
                  <th>افتتاحي</th>
                  <th>مشتريات</th>
                  <th>تحويل وارد</th>
                  <th>تحويل صادر</th>
                  <th>استهلاك</th>
                  <th>تسويات</th>
                  <th>نظري آخر المدة</th>
                  <th>آخر عد فعلي</th>
                  <th>الفرق</th>
                </tr>
              </thead>
              <tbody>
                {betweenCounts.data.map((row) => (
                  <tr key={row.itemCode}>
                    <td>{row.itemCode} - {row.itemName} {row.unitName ? `(${row.unitName})` : ''}</td>
                    <td>{numberValue(row.openingQuantity)}</td>
                    <td>{numberValue(row.purchasedQuantity)}</td>
                    <td>{numberValue(row.transferInQuantity)}</td>
                    <td>{numberValue(row.transferOutQuantity)}</td>
                    <td>{numberValue(row.consumedQuantity)}</td>
                    <td>{numberValue(row.adjustmentQuantity)}</td>
                    <td>{numberValue(row.theoreticalEndingQuantity)}</td>
                    <td>{row.actualCountedQuantity == null ? '-' : numberValue(row.actualCountedQuantity)}</td>
                    <td>{row.difference == null ? '-' : numberValue(row.difference)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </>
  );
}
