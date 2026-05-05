import { ManualStockMovementForm } from '../../../components/manual-stock-movement-form';
import { PageHeader } from '../../../components/page-header';
import { fetchList } from '../../../lib/api';
import type { ItemOption, WarehouseOption } from '../../../lib/types';

export default async function NewManualStockMovementPage() {
  const [warehouses, items] = await Promise.all([
    fetchList<WarehouseOption>('/warehouses'),
    fetchList<ItemOption>('/items'),
  ]);

  return (
    <>
      <PageHeader
        title="صرف أو إدخال مخزون يدوي"
        description="استخدم هذه الشاشة لتسجيل الاستهلاك أو الصرف اليدوي أو إدخال مخزون غير مرتبط بالمبيعات."
      />
      {warehouses.error || items.error ? <p className="notice">{warehouses.error ?? items.error}</p> : null}
      <ManualStockMovementForm warehouses={warehouses.data} items={items.data} />
    </>
  );
}
