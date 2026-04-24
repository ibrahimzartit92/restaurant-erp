'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitJson } from '../lib/client-api';
import type {
  BranchOption,
  ItemOption,
  StockCountSummary,
  WarehouseOption,
} from '../lib/types';

type StockCountItemDraft = {
  itemId: string;
  itemLabel: string;
  systemQuantity: string;
  countedQuantity: string;
  notes: string;
};

const statusOptions = [
  { value: 'draft', label: 'مسودة' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'cancelled', label: 'ملغاة' },
] as const;

function buildItemLabel(item: ItemOption) {
  return `${item.code} - ${item.name}`;
}

function normalizeNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createEmptyItem(): StockCountItemDraft {
  return {
    itemId: '',
    itemLabel: '',
    systemQuantity: '0',
    countedQuantity: '0',
    notes: '',
  };
}

export function StockCountForm({
  mode,
  branches,
  warehouses,
  items,
  initialStockCount,
}: Readonly<{
  mode: 'create' | 'edit';
  branches: BranchOption[];
  warehouses: WarehouseOption[];
  items: ItemOption[];
  initialStockCount?: StockCountSummary | null;
}>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [countItems, setCountItems] = useState<StockCountItemDraft[]>(
    initialStockCount?.items.length
      ? initialStockCount.items.map((item) => ({
          itemId: item.itemId,
          itemLabel: buildItemLabel(item.item),
          systemQuantity: String(item.systemQuantity),
          countedQuantity: String(item.countedQuantity),
          notes: item.notes ?? '',
        }))
      : [createEmptyItem()],
  );

  const itemOptions = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        label: buildItemLabel(item),
      })),
    [items],
  );

  function updateCountItem(index: number, patch: Partial<StockCountItemDraft>) {
    setCountItems((currentItems) =>
      currentItems.map((item, currentIndex) =>
        currentIndex === index
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );
  }

  function handleItemLabelChange(index: number, itemLabel: string) {
    const matchedItem = itemOptions.find((option) => option.label === itemLabel);

    updateCountItem(index, {
      itemLabel,
      itemId: matchedItem?.id ?? '',
    });
  }

  function addCountItem() {
    setCountItems((currentItems) => [...currentItems, createEmptyItem()]);
  }

  function removeCountItem(index: number) {
    setCountItems((currentItems) =>
      currentItems.length === 1 ? currentItems : currentItems.filter((_, currentIndex) => currentIndex !== index),
    );
  }

  const totalDifferenceQuantity = countItems.reduce(
    (sum, item) => sum + (normalizeNumber(item.countedQuantity) - normalizeNumber(item.systemQuantity)),
    0,
  );

  const totalCostDifference = countItems.reduce((sum, item) => {
    const matchedItem = itemOptions.find((option) => option.id === item.itemId);
    const difference = normalizeNumber(item.countedQuantity) - normalizeNumber(item.systemQuantity);
    return sum + difference * Number(matchedItem?.costPrice ?? 0);
  }, 0);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      countNumber: String(formData.get('countNumber') ?? '').trim(),
      branchId: String(formData.get('branchId') ?? '').trim(),
      warehouseId: String(formData.get('warehouseId') ?? '').trim(),
      countDate: String(formData.get('countDate') ?? '').trim(),
      status: String(formData.get('status') ?? 'completed').trim(),
      notes: String(formData.get('notes') ?? '').trim() || null,
      items: countItems.map((item) => ({
        itemId: item.itemId,
        systemQuantity: normalizeNumber(item.systemQuantity),
        countedQuantity: normalizeNumber(item.countedQuantity),
        notes: item.notes.trim() || null,
      })),
    };

    const invalidItem = payload.items.find((item) => !item.itemId);

    if (!payload.countNumber || !payload.branchId || !payload.warehouseId || !payload.countDate) {
      setMessage('يرجى تعبئة جميع الحقول الأساسية قبل الحفظ.');
      setIsSaving(false);
      return;
    }

    if (payload.items.length === 0 || invalidItem) {
      setMessage('أضف مادة واحدة على الأقل واخترها من القائمة المقترحة.');
      setIsSaving(false);
      return;
    }

    try {
      await submitJson(
        mode === 'create' ? '/stock-counts' : `/stock-counts/${initialStockCount?.id}`,
        mode === 'create' ? 'POST' : 'PATCH',
        payload,
      );
      router.push('/stock-counts');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ الجرد.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel stacked-sections" onSubmit={handleSubmit}>
      {message ? <p className="notice danger">{message}</p> : null}

      <div className="form-grid">
        <label>
          رقم الجرد
          <input
            defaultValue={initialStockCount?.countNumber ?? ''}
            maxLength={50}
            name="countNumber"
            placeholder="SC-20260424-001"
            required
          />
        </label>
        <label>
          تاريخ الجرد
          <input
            defaultValue={initialStockCount?.countDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)}
            name="countDate"
            required
            type="date"
          />
        </label>
        <label>
          الفرع
          <select defaultValue={initialStockCount?.branchId ?? ''} name="branchId" required>
            <option value="">اختر الفرع</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          المخزن
          <select defaultValue={initialStockCount?.warehouseId ?? ''} name="warehouseId" required>
            <option value="">اختر المخزن</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          الحالة
          <select defaultValue={initialStockCount?.status ?? 'completed'} name="status">
            {statusOptions.map((statusOption) => (
              <option key={statusOption.value} value={statusOption.value}>
                {statusOption.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        ملاحظات الجرد
        <textarea defaultValue={initialStockCount?.notes ?? ''} name="notes" rows={4} />
      </label>

      <section className="transfer-items-section">
        <div className="panel-heading">
          <div>
            <h3>مواد الجرد</h3>
            <span>أدخل الكمية بالنظام والكمية المعدودة يدويًا لكل مادة.</span>
          </div>
          <button className="secondary-button" onClick={addCountItem} type="button">
            إضافة مادة
          </button>
        </div>

        <div className="transfer-items-list">
          {countItems.map((item, index) => {
            const matchedItem = itemOptions.find((option) => option.id === item.itemId);
            const differenceQuantity = normalizeNumber(item.countedQuantity) - normalizeNumber(item.systemQuantity);
            const estimatedCostDifference = differenceQuantity * Number(matchedItem?.costPrice ?? 0);

            return (
              <article className="transfer-item-card" key={`${item.itemId || 'new'}-${index}`}>
                <div className="stock-count-item-grid">
                  <label>
                    المادة
                    <input
                      list={`stock-count-item-options-${index}`}
                      onChange={(event) => handleItemLabelChange(index, event.target.value)}
                      placeholder="ابحث بالكود أو الاسم"
                      required
                      value={item.itemLabel}
                    />
                    <datalist id={`stock-count-item-options-${index}`}>
                      {itemOptions.map((option) => (
                        <option key={option.id} value={option.label} />
                      ))}
                    </datalist>
                  </label>
                  <label>
                    الكمية بالنظام
                    <input
                      onChange={(event) => updateCountItem(index, { systemQuantity: event.target.value })}
                      step="0.001"
                      type="number"
                      value={item.systemQuantity}
                    />
                  </label>
                  <label>
                    الكمية المعدودة
                    <input
                      onChange={(event) => updateCountItem(index, { countedQuantity: event.target.value })}
                      step="0.001"
                      type="number"
                      value={item.countedQuantity}
                    />
                  </label>
                  <label>
                    الفرق
                    <input disabled type="text" value={differenceQuantity.toFixed(3)} />
                  </label>
                  <label>
                    فرق التكلفة
                    <input disabled type="text" value={estimatedCostDifference.toFixed(2)} />
                  </label>
                </div>

                <div className="transfer-item-meta">
                  <p className="field-hint">
                    {matchedItem
                      ? `تكلفة المادة الحالية: ${Number(matchedItem.costPrice ?? 0).toFixed(2)} | الوحدة: ${matchedItem.unit?.name ?? 'غير محددة'}`
                      : 'اختر مادة من القائمة المقترحة حتى يظهر فرق التكلفة التقديري.'}
                  </p>
                  <button className="secondary-button" onClick={() => removeCountItem(index)} type="button">
                    حذف السطر
                  </button>
                </div>

                <label>
                  ملاحظات المادة
                  <textarea
                    onChange={(event) => updateCountItem(index, { notes: event.target.value })}
                    rows={3}
                    value={item.notes}
                  />
                </label>
              </article>
            );
          })}
        </div>
      </section>

      <section className="summary-grid">
        <article className="summary-card">
          <p>عدد المواد</p>
          <strong>{countItems.length}</strong>
          <span>عدد البنود داخل الجرد</span>
        </article>
        <article className="summary-card">
          <p>إجمالي فرق الكميات</p>
          <strong>{totalDifferenceQuantity.toFixed(3)}</strong>
          <span>مجموع الفروقات بين العد والنظام</span>
        </article>
        <article className="summary-card">
          <p>إجمالي فرق التكلفة</p>
          <strong>{totalCostDifference.toFixed(2)}</strong>
          <span>فرق التكلفة التقديري حسب تكلفة المادة</span>
        </article>
      </section>

      <div className="form-actions">
        <button disabled={isSaving} type="submit">
          {isSaving ? 'جار الحفظ...' : mode === 'create' ? 'حفظ الجرد' : 'حفظ التعديلات'}
        </button>
      </div>
    </form>
  );
}
