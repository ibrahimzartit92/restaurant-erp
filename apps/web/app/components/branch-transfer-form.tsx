'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitJson } from '../lib/client-api';
import { formatMoneyWithCurrency } from '../lib/money';
import type { BranchOption, BranchTransferSummary, ItemOption, WarehouseOption } from '../lib/types';

type PriceType = 'purchase' | 'cost' | 'sale';

type TransferItemDraft = {
  itemId: string;
  itemLabel: string;
  unitName: string;
  priceType: PriceType;
  quantity: string;
  unitCost: string;
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

function itemPriceByType(item: ItemOption | undefined, priceType: PriceType) {
  if (!item) {
    return 0;
  }

  if (priceType === 'purchase') {
    return Number(item.purchasePrice ?? item.initialPrice ?? item.costPrice ?? 0);
  }

  if (priceType === 'sale') {
    return Number(item.salePrice ?? 0);
  }

  return Number(item.costPrice ?? 0);
}

function createEmptyItem(): TransferItemDraft {
  return {
    itemId: '',
    itemLabel: '',
    unitName: '',
    priceType: 'cost',
    quantity: '1',
    unitCost: '0',
    notes: '',
  };
}

export function BranchTransferForm({
  mode,
  branches,
  warehouses,
  items,
  initialTransfer,
  currencySymbol = 'ر.س',
  decimalPlaces = 2,
}: Readonly<{
  mode: 'create' | 'edit';
  branches: BranchOption[];
  warehouses: WarehouseOption[];
  items: ItemOption[];
  initialTransfer?: BranchTransferSummary | null;
  currencySymbol?: string;
  decimalPlaces?: number;
}>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [transferItems, setTransferItems] = useState<TransferItemDraft[]>(
    initialTransfer?.items.length
      ? initialTransfer.items.map((item) => ({
          itemId: item.itemId,
          itemLabel: buildItemLabel(item.item),
          unitName: item.item?.unit?.name ?? '',
          priceType: 'cost',
          quantity: String(item.quantity),
          unitCost: String(item.unitCost),
          notes: item.notes ?? '',
        }))
      : [createEmptyItem()],
  );

  const itemOptions = useMemo(() => items.map((item) => ({ ...item, label: buildItemLabel(item) })), [items]);

  function updateTransferItem(index: number, patch: Partial<TransferItemDraft>) {
    setTransferItems((currentItems) =>
      currentItems.map((item, currentIndex) => (currentIndex === index ? { ...item, ...patch } : item)),
    );
  }

  function handleItemLabelChange(index: number, itemLabel: string) {
    const matchedItem = itemOptions.find((option) => option.label === itemLabel);
    const currentItem = transferItems[index];

    updateTransferItem(index, {
      itemLabel,
      itemId: matchedItem?.id ?? '',
      unitName: matchedItem?.unit?.name ?? '',
      unitCost:
        matchedItem && (!currentItem?.itemId || currentItem.itemId !== matchedItem.id)
          ? String(itemPriceByType(matchedItem, currentItem?.priceType ?? 'cost'))
          : currentItem?.unitCost ?? '0',
    });
  }

  function handlePriceTypeChange(index: number, priceType: PriceType) {
    const matchedItem = itemOptions.find((option) => option.id === transferItems[index]?.itemId);

    updateTransferItem(index, {
      priceType,
      unitCost: matchedItem ? String(itemPriceByType(matchedItem, priceType)) : transferItems[index]?.unitCost ?? '0',
    });
  }

  function addTransferItem() {
    setTransferItems((currentItems) => [...currentItems, createEmptyItem()]);
  }

  function removeTransferItem(index: number) {
    setTransferItems((currentItems) =>
      currentItems.length === 1 ? currentItems : currentItems.filter((_, currentIndex) => currentIndex !== index),
    );
  }

  const totalCostAmount = transferItems.reduce(
    (sum, item) => sum + normalizeNumber(item.quantity) * normalizeNumber(item.unitCost),
    0,
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      transferNumber: String(formData.get('transferNumber') ?? '').trim(),
      transferDate: String(formData.get('transferDate') ?? '').trim(),
      fromBranchId: String(formData.get('fromBranchId') ?? '').trim(),
      toBranchId: String(formData.get('toBranchId') ?? '').trim(),
      fromWarehouseId: String(formData.get('fromWarehouseId') ?? '').trim(),
      toWarehouseId: String(formData.get('toWarehouseId') ?? '').trim(),
      status: String(formData.get('status') ?? 'completed').trim(),
      notes: String(formData.get('notes') ?? '').trim() || null,
      items: transferItems.map((item) => ({
        itemId: item.itemId,
        quantity: normalizeNumber(item.quantity),
        unitCost: normalizeNumber(item.unitCost),
        notes: item.notes.trim() || null,
      })),
    };

    const invalidItem = payload.items.find((item) => !item.itemId || item.quantity <= 0 || item.unitCost <= 0);

    if (
      !payload.transferNumber ||
      !payload.transferDate ||
      !payload.fromBranchId ||
      !payload.toBranchId ||
      !payload.fromWarehouseId ||
      !payload.toWarehouseId
    ) {
      setMessage('يرجى تعبئة جميع الحقول الأساسية قبل الحفظ.');
      setIsSaving(false);
      return;
    }

    if (payload.fromBranchId === payload.toBranchId) {
      setMessage('يجب اختيار فرعين مختلفين للتحويل.');
      setIsSaving(false);
      return;
    }

    if (payload.fromWarehouseId === payload.toWarehouseId) {
      setMessage('يجب اختيار مخزنين مختلفين للتحويل.');
      setIsSaving(false);
      return;
    }

    if (payload.items.length === 0 || invalidItem) {
      setMessage('أضف مادة واحدة على الأقل مع كمية وتكلفة صحيحتين.');
      setIsSaving(false);
      return;
    }

    try {
      await submitJson(
        mode === 'create' ? '/transfers' : `/transfers/${initialTransfer?.id}`,
        mode === 'create' ? 'POST' : 'PATCH',
        payload,
      );
      router.push('/transfers');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ التحويل بين الفروع.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel stacked-sections" onSubmit={handleSubmit}>
      {message ? <p className="notice danger">{message}</p> : null}

      <div className="form-grid">
        <label>
          رقم التحويل
          <input defaultValue={initialTransfer?.transferNumber ?? ''} maxLength={50} name="transferNumber" placeholder="TR-001" required />
        </label>
        <label>
          تاريخ التحويل
          <input defaultValue={initialTransfer?.transferDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)} name="transferDate" required type="date" />
        </label>
        <label>
          من فرع
          <select defaultValue={initialTransfer?.fromBranchId ?? ''} name="fromBranchId" required>
            <option value="">اختر الفرع المصدر</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </label>
        <label>
          إلى فرع
          <select defaultValue={initialTransfer?.toBranchId ?? ''} name="toBranchId" required>
            <option value="">اختر الفرع المستهدف</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </label>
        <label>
          من مخزن
          <select defaultValue={initialTransfer?.fromWarehouseId ?? ''} name="fromWarehouseId" required>
            <option value="">اختر المخزن المصدر</option>
            {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
          </select>
        </label>
        <label>
          إلى مخزن
          <select defaultValue={initialTransfer?.toWarehouseId ?? ''} name="toWarehouseId" required>
            <option value="">اختر المخزن المستهدف</option>
            {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
          </select>
        </label>
        <label>
          الحالة
          <select defaultValue={initialTransfer?.status ?? 'completed'} name="status">
            {statusOptions.map((statusOption) => <option key={statusOption.value} value={statusOption.value}>{statusOption.label}</option>)}
          </select>
        </label>
      </div>

      <label>
        ملاحظات التحويل
        <textarea defaultValue={initialTransfer?.notes ?? ''} name="notes" rows={4} />
      </label>

      <section className="transfer-items-section">
        <div className="panel-heading">
          <div>
            <h3>مواد التحويل</h3>
            <span>اختر المادة ثم حدد نوع السعر. تظهر الوحدة والسعر تلقائيا ويمكن تعديل السعر عند الحاجة.</span>
          </div>
          <button className="secondary-button" onClick={addTransferItem} type="button">إضافة مادة</button>
        </div>

        <div className="transfer-items-list">
          {transferItems.map((item, index) => {
            const lineTotal = normalizeNumber(item.quantity) * normalizeNumber(item.unitCost);

            return (
              <article className="transfer-item-card" key={`${item.itemId || 'new'}-${index}`}>
                <div className="transfer-item-grid">
                  <label>
                    المادة
                    <input list={`transfer-item-options-${index}`} onChange={(event) => handleItemLabelChange(index, event.target.value)} placeholder="ابحث بالكود أو الاسم" required value={item.itemLabel} />
                    <datalist id={`transfer-item-options-${index}`}>
                      {itemOptions.map((option) => <option key={option.id} value={option.label} />)}
                    </datalist>
                  </label>
                  <label>
                    الوحدة
                    <input disabled value={item.unitName || 'غير محددة'} />
                  </label>
                  <label>
                    نوع السعر
                    <select value={item.priceType} onChange={(event) => handlePriceTypeChange(index, event.target.value as PriceType)}>
                      <option value="purchase">سعر الشراء</option>
                      <option value="cost">سعر التكلفة</option>
                      <option value="sale">سعر البيع</option>
                    </select>
                  </label>
                  <label>
                    السعر
                    <input min="0.01" onChange={(event) => updateTransferItem(index, { unitCost: event.target.value })} required step="0.01" type="number" value={item.unitCost} />
                  </label>
                  <label>
                    الكمية
                    <input min="0.001" onChange={(event) => updateTransferItem(index, { quantity: event.target.value })} required step="0.001" type="number" value={item.quantity} />
                  </label>
                  <label>
                    الإجمالي
                    <input disabled type="text" value={formatMoneyWithCurrency(lineTotal, currencySymbol, decimalPlaces)} />
                  </label>
                </div>

                <div className="transfer-item-meta">
                  <p className="field-hint">اختر المادة من القائمة المقترحة حتى يتم ربطها بشكل صحيح.</p>
                  <button className="secondary-button" onClick={() => removeTransferItem(index)} type="button">حذف السطر</button>
                </div>

                <label>
                  ملاحظات المادة
                  <textarea onChange={(event) => updateTransferItem(index, { notes: event.target.value })} rows={3} value={item.notes} />
                </label>
              </article>
            );
          })}
        </div>
      </section>

      <section className="summary-grid">
        <article className="summary-card">
          <p>عدد المواد</p>
          <strong>{transferItems.length}</strong>
          <span>عدد البنود المسجلة داخل التحويل</span>
        </article>
        <article className="summary-card">
          <p>إجمالي تكلفة التحويل</p>
          <strong>{formatMoneyWithCurrency(totalCostAmount, currencySymbol, decimalPlaces)}</strong>
          <span>مجموع تكلفة جميع المواد</span>
        </article>
      </section>

      <div className="form-actions">
        <button disabled={isSaving} type="submit">
          {isSaving ? 'جار الحفظ...' : mode === 'create' ? 'حفظ التحويل' : 'حفظ التعديلات'}
        </button>
      </div>
    </form>
  );
}
