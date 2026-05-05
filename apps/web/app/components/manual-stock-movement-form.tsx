'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';
import type { ItemOption, WarehouseOption } from '../lib/types';

export function ManualStockMovementForm({
  warehouses,
  items,
}: Readonly<{
  warehouses: WarehouseOption[];
  items: ItemOption[];
}>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);

    try {
      await submitJson('/stock-movements/manual', 'POST', {
        warehouseId: String(formData.get('warehouseId') ?? ''),
        itemId: String(formData.get('itemId') ?? ''),
        movementDate: String(formData.get('movementDate') ?? ''),
        movementType: String(formData.get('movementType') ?? 'manual_out'),
        quantity: Number(formData.get('quantity') ?? 0),
        reason: String(formData.get('reason') ?? '').trim(),
        notes: String(formData.get('notes') ?? '').trim() || null,
      });
      router.push('/stock-movements');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ حركة المخزون.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      {message ? <p className="notice danger">{message}</p> : null}
      <div className="form-grid">
        <label>
          المخزن
          <select name="warehouseId" required>
            <option value="">اختر المخزن</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          المادة
          <select name="itemId" required>
            <option value="">اختر المادة</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code} - {item.name} {item.unit?.name ? `(${item.unit.name})` : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          التاريخ
          <input name="movementDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
        </label>
        <label>
          نوع الحركة
          <select name="movementType" defaultValue="manual_out">
            <option value="manual_out">صرف / استهلاك يدوي</option>
            <option value="manual_in">إدخال يدوي</option>
          </select>
        </label>
        <label>
          الكمية
          <input name="quantity" type="number" min="0.001" step="0.001" required />
        </label>
        <label>
          السبب
          <input name="reason" maxLength={160} placeholder="استهلاك مطبخ، تلف، تسوية بسيطة..." required />
        </label>
      </div>
      <label>
        ملاحظات
        <textarea name="notes" rows={3} />
      </label>
      <div className="form-actions">
        <button disabled={isSaving} type="submit">
          {isSaving ? 'جار الحفظ...' : 'حفظ حركة المخزون'}
        </button>
      </div>
    </form>
  );
}
