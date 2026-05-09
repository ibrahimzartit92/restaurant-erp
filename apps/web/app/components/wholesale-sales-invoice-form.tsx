'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { fetchClientJson, submitJson } from '../lib/client-api';
import { formatMoneyWithCurrency } from '../lib/money';
import type { BranchOption, CustomerOption, ItemOption, WarehouseOption } from '../lib/types';

type SalesLineDraft = {
  itemId: string;
  itemLabel: string;
  unitName: string;
  quantity: string;
  unitPrice: string;
  notes: string;
};

type StockRow = {
  itemId: string;
  quantity: string | number;
};

type CreatedWholesaleInvoice = {
  id?: string | null;
  branchId?: string | null;
  invoiceDate?: string | null;
};

function emptyLine(): SalesLineDraft {
  return { itemId: '', itemLabel: '', unitName: '', quantity: '1', unitPrice: '0', notes: '' };
}

function itemLabel(item: ItemOption) {
  return `${item.code} - ${item.name}`;
}

function asNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isPersistedId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value !== 'new';
}

export function WholesaleSalesInvoiceForm({
  branches,
  warehouses,
  customers,
  items,
  currencySymbol = '',
  decimalPlaces = 2,
}: Readonly<{
  branches: BranchOption[];
  warehouses: WarehouseOption[];
  customers: CustomerOption[];
  items: ItemOption[];
  currencySymbol?: string;
  decimalPlaces?: number;
}>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lines, setLines] = useState<SalesLineDraft[]>([emptyLine()]);
  const [warehouseId, setWarehouseId] = useState('');
  const [stockByItem, setStockByItem] = useState<Record<string, number>>({});
  const [discountAmount, setDiscountAmount] = useState('0');
  const itemOptions = useMemo(() => items.map((item) => ({ ...item, label: itemLabel(item) })), [items]);
  const subtotal = lines.reduce((sum, line) => sum + asNumber(line.quantity) * asNumber(line.unitPrice), 0);
  const totalAmount = Math.max(subtotal - asNumber(discountAmount), 0);

  async function loadWarehouseStock(nextWarehouseId: string) {
    setWarehouseId(nextWarehouseId);
    if (!nextWarehouseId) {
      setStockByItem({});
      return;
    }
    try {
      const stockRows = await fetchClientJson<StockRow[]>(`/stock-movements/current-stock?warehouseId=${nextWarehouseId}`);
      setStockByItem(Object.fromEntries(stockRows.map((row) => [row.itemId, Number(row.quantity ?? 0)])));
    } catch {
      setStockByItem({});
    }
  }

  function updateLine(index: number, patch: Partial<SalesLineDraft>) {
    setLines((current) => current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)));
  }

  function handleItemChange(index: number, value: string) {
    const matched = itemOptions.find((item) => item.label === value);
    updateLine(index, {
      itemLabel: value,
      itemId: matched?.id ?? '',
      unitName: matched?.unit?.name ?? '',
      unitPrice: matched ? String(matched.salePrice ?? 0) : lines[index]?.unitPrice ?? '0',
    });
  }

  function stockWarning(line: SalesLineDraft) {
    if (!warehouseId || !line.itemId) return null;
    const available = stockByItem[line.itemId] ?? 0;
    const requested = asNumber(line.quantity);
    return requested > available ? `المتاح ${available} فقط، والكمية المطلوبة ${requested}. يمكن الاعتماد مع هذا التحذير.` : null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const parsedDiscountAmount = asNumber(String(formData.get('discountAmount') ?? '0'));
    const invalidLine = lines.find((line) => !line.itemId || asNumber(line.quantity) <= 0 || asNumber(line.unitPrice) < 0);

    if (invalidLine) {
      setMessage('أضف مادة واحدة على الأقل مع كمية وسعر صحيحين.');
      setIsSaving(false);
      return;
    }

    try {
      const saved = await submitJson<CreatedWholesaleInvoice>('/api/wholesale-sales-invoices', 'POST', {
        invoiceNumber: String(formData.get('invoiceNumber') ?? '').trim() || null,
        customerId: String(formData.get('customerId') ?? ''),
        branchId: String(formData.get('branchId') ?? ''),
        warehouseId: String(formData.get('warehouseId') ?? ''),
        invoiceDate: String(formData.get('invoiceDate') ?? ''),
        dueDate: String(formData.get('dueDate') ?? '').trim() || null,
        documentStatus: String(formData.get('documentStatus') ?? 'draft'),
        discountAmount: parsedDiscountAmount,
        notes: String(formData.get('notes') ?? '').trim() || null,
        items: lines.map((line) => ({
          itemId: line.itemId,
          quantity: asNumber(line.quantity),
          unitPrice: asNumber(line.unitPrice),
          notes: line.notes.trim() || null,
        })),
      });

      if (!isPersistedId(saved?.id)) {
        setMessage('تم حفظ الفاتورة، لكن لم يصل رقمها الداخلي من الخادم. افتح قائمة فواتير بيع الجملة للتأكد.');
        return;
      }

      router.replace(`/wholesale-sales-invoices/${saved.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ فاتورة بيع الجملة.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel stacked-sections" onSubmit={handleSubmit}>
      {message ? <p className="notice danger">{message}</p> : null}
      <div className="form-grid">
        <label>
          رقم الفاتورة
          <input maxLength={50} name="invoiceNumber" placeholder="يولد تلقائيًا عند تركه فارغًا" />
        </label>
        <label>
          العميل
          <select name="customerId" required>
            <option value="">اختر العميل</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          الفرع
          <select name="branchId" required>
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
          <select name="warehouseId" onChange={(event) => loadWarehouseStock(event.target.value)} required>
            <option value="">اختر المخزن</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          تاريخ الفاتورة
          <input defaultValue={new Date().toISOString().slice(0, 10)} name="invoiceDate" required type="date" />
        </label>
        <label>
          تاريخ الاستحقاق
          <input name="dueDate" type="date" />
        </label>
        <label>
          حالة الفاتورة
          <select defaultValue="draft" name="documentStatus">
            <option value="draft">مسودة</option>
            <option value="approved">معتمدة</option>
          </select>
        </label>
        <label>
          الخصم
          <input min="0" name="discountAmount" onChange={(event) => setDiscountAmount(event.target.value)} step="0.01" type="number" value={discountAmount} />
        </label>
      </div>

      <label>
        ملاحظات
        <textarea name="notes" rows={3} />
      </label>

      <section className="transfer-items-section">
        <div className="panel-heading">
          <div>
            <h3>مواد فاتورة البيع</h3>
            <span>يتم تحميل سعر البيع تلقائيًا، ويمكن تعديله داخل الفاتورة دون تعديل سعر المادة الأساسي.</span>
          </div>
          <button className="secondary-button" type="button" onClick={() => setLines((current) => [emptyLine(), ...current])}>
            إضافة مادة
          </button>
        </div>
        <div className="transfer-items-list">
          {lines.map((line, index) => {
            const warning = stockWarning(line);
            return (
              <article className="transfer-item-card" key={index}>
                <div className="transfer-item-grid">
                  <label>
                    المادة
                    <input list={`sales-item-options-${index}`} required value={line.itemLabel} onChange={(event) => handleItemChange(index, event.target.value)} />
                    <datalist id={`sales-item-options-${index}`}>
                      {itemOptions.map((item) => (
                        <option key={item.id} value={item.label} />
                      ))}
                    </datalist>
                  </label>
                  <label>
                    الوحدة
                    <input disabled value={line.unitName || 'غير محددة'} />
                  </label>
                  <label>
                    سعر البيع
                    <input min="0" required step="0.01" type="number" value={line.unitPrice} onChange={(event) => updateLine(index, { unitPrice: event.target.value })} />
                  </label>
                  <label>
                    الكمية
                    <input min="0.001" required step="0.001" type="number" value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} />
                  </label>
                  <label>
                    الإجمالي
                    <input disabled value={formatMoneyWithCurrency(asNumber(line.quantity) * asNumber(line.unitPrice), currencySymbol, decimalPlaces)} />
                  </label>
                </div>
                {warning ? <p className="notice warning">{warning}</p> : null}
                <div className="transfer-item-meta">
                  <p className="field-hint">تحذير المخزون لا يمنع اعتماد الفاتورة، لكنه يوضح النقص قبل الحفظ.</p>
                  <button className="secondary-button" type="button" onClick={() => setLines((current) => (current.length === 1 ? current : current.filter((_, lineIndex) => lineIndex !== index)))}>
                    حذف السطر
                  </button>
                </div>
                <label>
                  ملاحظات المادة
                  <textarea rows={2} value={line.notes} onChange={(event) => updateLine(index, { notes: event.target.value })} />
                </label>
              </article>
            );
          })}
        </div>
      </section>

      <div className="summary-grid compact-summary">
        <article className="summary-card">
          <p>إجمالي الفاتورة قبل الخصم</p>
          <strong>{formatMoneyWithCurrency(subtotal, currencySymbol, decimalPlaces)}</strong>
        </article>
        <article className="summary-card">
          <p>الإجمالي بعد الخصم</p>
          <strong>{formatMoneyWithCurrency(totalAmount, currencySymbol, decimalPlaces)}</strong>
        </article>
      </div>

      <p className="notice">بعد حفظ الفاتورة سيتم فتح صفحة التفاصيل لتسجيل التحصيلات على الفاتورة المحفوظة.</p>

      <div className="form-actions">
        <button disabled={isSaving} type="submit">
          {isSaving ? 'جار الحفظ...' : 'حفظ وفتح تفاصيل الفاتورة'}
        </button>
      </div>
    </form>
  );
}
