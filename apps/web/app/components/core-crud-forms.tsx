'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { submitJson } from '../lib/client-api';
import { formatMoneyWithCurrency } from '../lib/money';
import type {
  BankAccountOption,
  BranchOption,
  DrawerOption,
  ItemCategoryOption,
  ItemOption,
  PurchaseInvoiceOption,
  SupplierOption,
  UnitOption,
  VaultOption,
  WarehouseOption,
} from '../lib/types';
import {
  PaymentSourceRows,
  activePaymentRows,
  paymentRowsTotal,
  toBackendPayment,
  validatePaymentRows,
  type UnifiedPaymentRow,
} from './payment-source-rows';

type MessageState = string | null;
type PriceType = 'purchase' | 'cost' | 'sale';

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function optionalText(formData: FormData, key: string) {
  return text(formData, key) || null;
}

function numberValue(formData: FormData, key: string, fallback = 0) {
  const parsed = Number(formData.get(key) ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function draftNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function FormMessage({ message }: Readonly<{ message: MessageState }>) {
  return message ? <p className="notice danger">{message}</p> : null;
}

export function BranchForm() {
  const router = useRouter();
  const [message, setMessage] = useState<MessageState>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);

    try {
      await submitJson('/branches', 'POST', {
        code: text(formData, 'code'),
        name: text(formData, 'name'),
        defaultOpeningBalance: numberValue(formData, 'defaultOpeningBalance'),
        defaultCashFloat: numberValue(formData, 'defaultCashFloat'),
        isActive: formData.get('isActive') === 'on',
      });
      router.push('/branches');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ الفرع.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <FormMessage message={message} />
      <div className="form-grid">
        <label>
          كود الفرع
          <input name="code" maxLength={50} placeholder="اختياري" />
        </label>
        <label>
          اسم الفرع
          <input name="name" maxLength={160} required />
        </label>
        <label>
          الرصيد الافتتاحي الافتراضي
          <input name="defaultOpeningBalance" type="number" min="0" step="0.01" defaultValue={0} />
        </label>
        <label>
          مبلغ الفكة الثابت
          <input name="defaultCashFloat" type="number" min="0" step="0.01" defaultValue={0} />
        </label>
        <label className="checkbox-field">
          <input name="isActive" type="checkbox" defaultChecked />
          الفرع نشط
        </label>
      </div>
      <div className="form-actions">
        <button disabled={isSaving} type="submit">{isSaving ? 'جاري الحفظ...' : 'حفظ الفرع'}</button>
      </div>
    </form>
  );
}

export function WarehouseForm() {
  const router = useRouter();
  const [message, setMessage] = useState<MessageState>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);

    try {
      await submitJson('/warehouses', 'POST', {
        code: text(formData, 'code'),
        name: text(formData, 'name'),
        isActive: formData.get('isActive') === 'on',
      });
      router.push('/warehouses');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ المخزن.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <FormMessage message={message} />
      <div className="form-grid">
        <label>
          كود المخزن
          <input name="code" maxLength={50} required />
        </label>
        <label>
          اسم المخزن
          <input name="name" maxLength={160} required />
        </label>
        <label className="checkbox-field">
          <input name="isActive" type="checkbox" defaultChecked />
          المخزن نشط
        </label>
      </div>
      <div className="form-actions">
        <button disabled={isSaving} type="submit">{isSaving ? 'جاري الحفظ...' : 'حفظ المخزن'}</button>
      </div>
    </form>
  );
}

export function SupplierForm() {
  const router = useRouter();
  const [message, setMessage] = useState<MessageState>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);

    try {
      await submitJson('/suppliers', 'POST', {
        code: text(formData, 'code'),
        name: text(formData, 'name'),
        phone: optionalText(formData, 'phone'),
        address: optionalText(formData, 'address'),
        defaultDueDays: numberValue(formData, 'defaultDueDays'),
        isActive: formData.get('isActive') === 'on',
        notes: optionalText(formData, 'notes'),
      });
      router.push('/suppliers');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ المورد.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <FormMessage message={message} />
      <div className="form-grid">
        <label>
          كود المورد
          <input name="code" maxLength={50} placeholder="اختياري" />
        </label>
        <label>
          اسم المورد
          <input name="name" maxLength={180} required />
        </label>
        <label>
          الهاتف
          <input name="phone" maxLength={40} />
        </label>
        <label>
          مهلة الدفع بالأيام
          <input name="defaultDueDays" type="number" min="0" defaultValue={0} />
        </label>
        <label className="checkbox-field">
          <input name="isActive" type="checkbox" defaultChecked />
          المورد نشط
        </label>
      </div>
      <label>
        العنوان
        <textarea name="address" rows={3} />
      </label>
      <label>
        ملاحظات
        <textarea name="notes" rows={3} />
      </label>
      <div className="form-actions">
        <button disabled={isSaving} type="submit">{isSaving ? 'جاري الحفظ...' : 'حفظ المورد'}</button>
      </div>
    </form>
  );
}

export function DrawerForm({ branches }: Readonly<{ branches: BranchOption[] }>) {
  const router = useRouter();
  const [message, setMessage] = useState<MessageState>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);

    try {
      await submitJson('/drawers', 'POST', {
        branchId: text(formData, 'branchId'),
        code: text(formData, 'code'),
        name: text(formData, 'name'),
        defaultOpeningBalance: numberValue(formData, 'defaultOpeningBalance'),
        defaultCashFloat: numberValue(formData, 'defaultCashFloat', numberValue(formData, 'defaultOpeningBalance')),
        isActive: formData.get('isActive') === 'on',
        notes: optionalText(formData, 'notes'),
      });
      router.push('/drawers');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ الدرج.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <FormMessage message={message} />
      <div className="form-grid">
        <label>
          الفرع
          <select name="branchId" required>
            <option value="">اختر الفرع</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </label>
        <label>
          كود الدرج
          <input name="code" maxLength={50} required />
        </label>
        <label>
          اسم الدرج
          <input name="name" maxLength={160} required />
        </label>
        <label>
          الرصيد الافتراضي
          <input name="defaultOpeningBalance" type="number" min="0" step="0.01" defaultValue={0} />
        </label>
        <label>
          الفكة الثابتة
          <input name="defaultCashFloat" type="number" min="0" step="0.01" defaultValue={0} />
        </label>
        <label className="checkbox-field">
          <input name="isActive" type="checkbox" defaultChecked />
          الدرج نشط
        </label>
      </div>
      <label>
        ملاحظات
        <textarea name="notes" rows={3} />
      </label>
      <div className="form-actions">
        <button disabled={isSaving} type="submit">{isSaving ? 'جاري الحفظ...' : 'حفظ الدرج'}</button>
      </div>
    </form>
  );
}

export function ItemForm({
  categories,
  units,
  initialItem,
  currencySymbol = 'ر.س',
}: Readonly<{
  categories: ItemCategoryOption[];
  units: UnitOption[];
  currencySymbol?: string;
  initialItem?: (ItemOption & {
    categoryId?: string;
    category?: ItemCategoryOption | null;
    unitId?: string;
    searchKeywords?: string | null;
    notes?: string | null;
  }) | null;
}>) {
  const router = useRouter();
  const [message, setMessage] = useState<MessageState>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);

    try {
      const purchasePrice = numberValue(formData, 'purchasePrice');
      await submitJson(initialItem?.id ? `/items/${initialItem.id}` : '/items', initialItem?.id ? 'PATCH' : 'POST', {
        code: text(formData, 'code'),
        name: text(formData, 'name'),
        categoryId: optionalText(formData, 'categoryId'),
        unitId: optionalText(formData, 'unitId'),
        initialPrice: purchasePrice,
        purchasePrice,
        costPrice: numberValue(formData, 'costPrice'),
        salePrice: numberValue(formData, 'salePrice'),
        searchKeywords: optionalText(formData, 'searchKeywords'),
        isActive: formData.get('isActive') === 'on',
        notes: optionalText(formData, 'notes'),
      });
      router.push('/items');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ المادة.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <FormMessage message={message} />
      <div className="form-grid">
        <label>
          كود المادة
          <input name="code" maxLength={50} placeholder="اختياري" defaultValue={initialItem?.code ?? ''} />
        </label>
        <label>
          اسم المادة
          <input name="name" maxLength={180} required defaultValue={initialItem?.name ?? ''} />
        </label>
        <label>
          التصنيف
          <select name="categoryId" defaultValue={initialItem?.categoryId ?? initialItem?.category?.id ?? ''}>
            <option value="">تصنيف افتراضي</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label>
          الوحدة
          <select name="unitId" defaultValue={initialItem?.unitId ?? initialItem?.unit?.id ?? ''}>
            <option value="">وحدة افتراضية</option>
            {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
          </select>
        </label>
        <label>
          سعر الشراء
          <input name="purchasePrice" type="number" min="0" step="0.01" defaultValue={initialItem?.purchasePrice ?? initialItem?.initialPrice ?? 0} />
          <small className="field-hint">العملة المستخدمة: {currencySymbol}</small>
        </label>
        <label>
          سعر التكلفة
          <input name="costPrice" type="number" min="0" step="0.01" defaultValue={initialItem?.costPrice ?? 0} />
          <small className="field-hint">العملة المستخدمة: {currencySymbol}</small>
        </label>
        <label>
          سعر البيع
          <input name="salePrice" type="number" min="0" step="0.01" defaultValue={initialItem?.salePrice ?? 0} />
          <small className="field-hint">العملة المستخدمة: {currencySymbol}</small>
        </label>
        <label className="checkbox-field">
          <input name="isActive" type="checkbox" defaultChecked={initialItem?.isActive ?? true} />
          المادة نشطة
        </label>
      </div>
      <label>
        كلمات البحث
        <input name="searchKeywords" maxLength={500} defaultValue={initialItem?.searchKeywords ?? ''} />
      </label>
      <label>
        ملاحظات
        <textarea name="notes" rows={3} defaultValue={initialItem?.notes ?? ''} />
      </label>
      <div className="form-actions">
        <button disabled={isSaving} type="submit">{isSaving ? 'جاري الحفظ...' : initialItem?.id ? 'حفظ التعديلات' : 'حفظ المادة'}</button>
      </div>
    </form>
  );
}

type PurchaseLineDraft = {
  itemId: string;
  itemLabel: string;
  unitName: string;
  priceType: PriceType;
  quantity: string;
  unitPrice: string;
  notes: string;
};

function itemLabel(item: ItemOption) {
  return `${item.code} - ${item.name}`;
}

function emptyPurchaseLine(): PurchaseLineDraft {
  return { itemId: '', itemLabel: '', unitName: '', priceType: 'purchase', quantity: '1', unitPrice: '0', notes: '' };
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

export function PurchaseInvoiceForm({
  branches,
  warehouses,
  suppliers,
  items,
  drawers,
  bankAccounts,
  vaults,
  currencySymbol = 'ر.س',
  decimalPlaces = 2,
}: Readonly<{
  branches: BranchOption[];
  warehouses: WarehouseOption[];
  suppliers: SupplierOption[];
  items: ItemOption[];
  drawers: DrawerOption[];
  bankAccounts: BankAccountOption[];
  vaults: VaultOption[];
  currencySymbol?: string;
  decimalPlaces?: number;
}>) {
  const router = useRouter();
  const [message, setMessage] = useState<MessageState>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lines, setLines] = useState<PurchaseLineDraft[]>([emptyPurchaseLine()]);
  const [payments, setPayments] = useState<UnifiedPaymentRow[]>([]);
  const itemOptions = useMemo(() => items.map((item) => ({ ...item, label: itemLabel(item) })), [items]);

  function updateLine(index: number, patch: Partial<PurchaseLineDraft>) {
    setLines((current) => current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)));
  }

  function handleItemChange(index: number, value: string) {
    const matched = itemOptions.find((item) => item.label === value);
    const priceType = lines[index]?.priceType ?? 'purchase';
    updateLine(index, {
      itemLabel: value,
      itemId: matched?.id ?? '',
      unitName: matched?.unit?.name ?? '',
      unitPrice: matched ? String(itemPriceByType(matched, priceType)) : lines[index]?.unitPrice ?? '0',
    });
  }

  function handlePriceTypeChange(index: number, priceType: PriceType) {
    const matched = itemOptions.find((item) => item.id === lines[index]?.itemId);
    updateLine(index, {
      priceType,
      unitPrice: matched ? String(itemPriceByType(matched, priceType)) : lines[index]?.unitPrice ?? '0',
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const payload = {
      invoiceNumber: optionalText(formData, 'invoiceNumber'),
      invoiceLabel: optionalText(formData, 'invoiceLabel'),
      branchId: text(formData, 'branchId'),
      warehouseId: text(formData, 'warehouseId'),
      supplierId: optionalText(formData, 'supplierId'),
      supplierRepresentativeId: null,
      invoiceDate: text(formData, 'invoiceDate'),
      status: text(formData, 'status') || undefined,
      discountAmount: numberValue(formData, 'discountAmount'),
      paidAmount: 0,
      isMiscellaneous: !optionalText(formData, 'supplierId'),
      dueDate: optionalText(formData, 'dueDate'),
      notes: optionalText(formData, 'notes'),
      items: lines.map((line) => ({
        itemId: line.itemId,
        quantity: draftNumber(line.quantity),
        unitPrice: draftNumber(line.unitPrice),
        notes: line.notes.trim() || null,
      })),
    };

    const invalidLine = payload.items.find((line) => !line.itemId || line.quantity <= 0 || line.unitPrice < 0);
    const subtotalAmount = payload.items.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
    const totalAmount = Math.max(subtotalAmount - payload.discountAmount, 0);
    const activePayments = activePaymentRows(payments);
    const totalPaid = paymentRowsTotal(activePayments);

    if (invalidLine) {
      setMessage('أضف مادة واحدة على الأقل مع كمية وسعر صحيحين.');
      setIsSaving(false);
      return;
    }

    if (totalPaid > totalAmount) {
      setMessage('إجمالي الدفعات لا يمكن أن يتجاوز إجمالي الفاتورة.');
      setIsSaving(false);
      return;
    }

    const paymentValidationMessage = activePayments.length ? validatePaymentRows(activePayments) : null;

    if (paymentValidationMessage) {
      setMessage(paymentValidationMessage);
      setIsSaving(false);
      return;
    }

    try {
      const saved = (await submitJson('/purchase-invoices', 'POST', payload)) as { id?: string };
      if (saved.id && activePayments.length > 0) {
        await submitJson('/supplier-payments/batch', 'POST', {
          purchaseInvoiceId: saved.id,
          branchId: payload.branchId,
          paymentDate: activePayments[0]?.paymentDate ?? payload.invoiceDate,
          payments: activePayments.map(toBackendPayment),
        });
      }
      router.push(saved.id ? `/purchase-invoices/${saved.id}` : '/purchase-invoices');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ فاتورة الشراء.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel stacked-sections" onSubmit={handleSubmit}>
      <FormMessage message={message} />
      <div className="form-grid">
        <label>
          رقم الفاتورة
          <input name="invoiceNumber" maxLength={50} placeholder="يولد تلقائيا عند تركه فارغا" />
        </label>
        <label>
          الوصف
          <input name="invoiceLabel" maxLength={180} />
        </label>
        <label>
          الفرع
          <select name="branchId" required>
            <option value="">اختر الفرع</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </label>
        <label>
          المخزن
          <select name="warehouseId" required>
            <option value="">اختر المخزن</option>
            {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
          </select>
        </label>
        <label>
          المورد
          <select name="supplierId">
            <option value="">فاتورة متفرقة بدون مورد</option>
            {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </select>
        </label>
        <label>
          تاريخ الفاتورة
          <input name="invoiceDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
        </label>
        <label>
          تاريخ الاستحقاق
          <input name="dueDate" type="date" />
        </label>
        <label>
          الحالة
          <select name="status" defaultValue="open">
            <option value="draft">مسودة</option>
            <option value="open">مفتوحة</option>
            <option value="partially_paid">مدفوعة جزئيا</option>
            <option value="paid">مدفوعة</option>
          </select>
        </label>
        <label>
          الخصم
          <input name="discountAmount" type="number" min="0" step="0.01" defaultValue={0} />
        </label>
      </div>
      <label>
        ملاحظات
        <textarea name="notes" rows={3} />
      </label>

      <section className="transfer-items-section">
        <div className="panel-heading">
          <div>
            <h3>مواد الفاتورة</h3>
            <span>اختر المادة ثم حدد نوع السعر. يظهر سعر المادة ووحدتها تلقائيا ويمكن تعديل السعر يدويا.</span>
          </div>
          <button className="secondary-button" type="button" onClick={() => setLines((current) => [...current, emptyPurchaseLine()])}>
            إضافة مادة
          </button>
        </div>
        <div className="transfer-items-list">
          {lines.map((line, index) => (
            <article className="transfer-item-card" key={index}>
              <div className="transfer-item-grid">
                <label>
                  المادة
                  <input list={`purchase-item-options-${index}`} value={line.itemLabel} onChange={(event) => handleItemChange(index, event.target.value)} required />
                  <datalist id={`purchase-item-options-${index}`}>
                    {itemOptions.map((item) => <option key={item.id} value={item.label} />)}
                  </datalist>
                </label>
                <label>
                  الوحدة
                  <input disabled value={line.unitName || 'غير محددة'} />
                </label>
                <label>
                  نوع السعر
                  <select value={line.priceType} onChange={(event) => handlePriceTypeChange(index, event.target.value as PriceType)}>
                    <option value="purchase">سعر الشراء</option>
                    <option value="cost">سعر التكلفة</option>
                    <option value="sale">سعر البيع</option>
                  </select>
                </label>
                <label>
                  السعر
                  <input type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => updateLine(index, { unitPrice: event.target.value })} required />
                </label>
                <label>
                  الكمية
                  <input type="number" min="0.001" step="0.001" value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} required />
                </label>
                <label>
                  الإجمالي
                  <input disabled value={formatMoneyWithCurrency(Number(line.quantity || 0) * Number(line.unitPrice || 0), currencySymbol, decimalPlaces)} />
                </label>
              </div>
              <div className="transfer-item-meta">
                <p className="field-hint">اختر المادة من القائمة المقترحة حتى يتم إرسال معرف المادة الصحيح.</p>
                <button className="secondary-button" type="button" onClick={() => setLines((current) => current.length === 1 ? current : current.filter((_, lineIndex) => lineIndex !== index))}>
                  حذف السطر
                </button>
              </div>
              <label>
                ملاحظات المادة
                <textarea rows={2} value={line.notes} onChange={(event) => updateLine(index, { notes: event.target.value })} />
              </label>
            </article>
          ))}
        </div>
      </section>

      <PaymentSourceRows
        rows={payments}
        onChange={setPayments}
        drawers={drawers}
        bankAccounts={bankAccounts}
        vaults={vaults}
        title="دفعات الفاتورة"
        description="يمكن تركها فارغة أو تقسيم الدفع بين الدرج، البنك، والخزنة."
        showPaymentDate={false}
      />

      <div className="form-actions">
        <button disabled={isSaving} type="submit">{isSaving ? 'جاري الحفظ...' : 'حفظ فاتورة الشراء'}</button>
      </div>
    </form>
  );
}

export function SupplierPaymentForm({
  invoices,
  branches,
  drawers,
  bankAccounts,
}: Readonly<{
  invoices: PurchaseInvoiceOption[];
  branches: BranchOption[];
  drawers: DrawerOption[];
  bankAccounts: BankAccountOption[];
}>) {
  const router = useRouter();
  const [message, setMessage] = useState<MessageState>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);

    try {
      await submitJson('/supplier-payments', 'POST', {
        paymentNumber: optionalText(formData, 'paymentNumber'),
        purchaseInvoiceId: text(formData, 'purchaseInvoiceId'),
        branchId: text(formData, 'branchId'),
        paymentDate: text(formData, 'paymentDate'),
        paymentMethod: text(formData, 'paymentMethod'),
        drawerId: optionalText(formData, 'drawerId'),
        bankAccountId: optionalText(formData, 'bankAccountId'),
        amount: numberValue(formData, 'amount'),
        referenceNumber: optionalText(formData, 'referenceNumber'),
        notes: optionalText(formData, 'notes'),
      });
      router.push('/supplier-payments');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ دفعة المورد.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <FormMessage message={message} />
      <div className="form-grid">
        <label>
          رقم الدفعة
          <input name="paymentNumber" maxLength={50} placeholder="يولد تلقائيا عند تركه فارغا" />
        </label>
        <label>
          فاتورة الشراء
          <select name="purchaseInvoiceId" required>
            <option value="">اختر الفاتورة</option>
            {invoices.map((invoice) => (
              <option key={invoice.id} value={invoice.id}>
                {invoice.invoiceNumber} - {invoice.supplier?.name ?? 'متفرقة'} - متبقي {invoice.remainingAmount}
              </option>
            ))}
          </select>
        </label>
        <label>
          الفرع
          <select name="branchId" required>
            <option value="">اختر الفرع المطابق للفاتورة</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </label>
        <label>
          تاريخ الدفع
          <input name="paymentDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
        </label>
        <label>
          طريقة الدفع
          <select name="paymentMethod" defaultValue="cash" required>
            <option value="cash">نقدا</option>
            <option value="bank">بنكي</option>
            <option value="other">أخرى</option>
          </select>
        </label>
        <label>
          الدرج النقدي
          <select name="drawerId">
            <option value="">غير محدد</option>
            {drawers.map((drawer) => <option key={drawer.id} value={drawer.id}>{drawer.name}</option>)}
          </select>
        </label>
        <label>
          الحساب البنكي
          <select name="bankAccountId">
            <option value="">غير محدد</option>
            {bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </label>
        <label>
          المبلغ
          <input name="amount" type="number" min="0.01" step="0.01" required />
        </label>
        <label>
          المرجع
          <input name="referenceNumber" maxLength={120} />
        </label>
      </div>
      <p className="field-hint">الدفع النقدي يحتاج درج نقدي، والدفع البنكي يحتاج حسابا بنكيا. يجب أن يطابق الفرع فرع الفاتورة.</p>
      <label>
        ملاحظات
        <textarea name="notes" rows={3} />
      </label>
      <div className="form-actions">
        <button disabled={isSaving} type="submit">{isSaving ? 'جاري الحفظ...' : 'حفظ دفعة المورد'}</button>
      </div>
    </form>
  );
}
