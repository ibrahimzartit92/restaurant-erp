'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { submitJson } from '../lib/client-api';
import type {
  BankAccountOption,
  BranchOption,
  DrawerOption,
  ItemCategoryOption,
  ItemOption,
  PurchaseInvoiceOption,
  SupplierOption,
  UnitOption,
  WarehouseOption,
} from '../lib/types';

type MessageState = string | null;

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
}: Readonly<{
  categories: ItemCategoryOption[];
  units: UnitOption[];
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
      await submitJson('/items', 'POST', {
        code: text(formData, 'code'),
        name: text(formData, 'name'),
        categoryId: optionalText(formData, 'categoryId'),
        unitId: optionalText(formData, 'unitId'),
        initialPrice: numberValue(formData, 'initialPrice'),
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
          <input name="code" maxLength={50} required />
        </label>
        <label>
          اسم المادة
          <input name="name" maxLength={180} required />
        </label>
        <label>
          التصنيف
          <select name="categoryId">
            <option value="">تصنيف افتراضي</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label>
          الوحدة
          <select name="unitId">
            <option value="">وحدة افتراضية</option>
            {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
          </select>
        </label>
        <label>
          السعر الابتدائي
          <input name="initialPrice" type="number" min="0" step="0.01" defaultValue={0} />
        </label>
        <label>
          سعر التكلفة
          <input name="costPrice" type="number" min="0" step="0.01" defaultValue={0} />
        </label>
        <label>
          سعر البيع
          <input name="salePrice" type="number" min="0" step="0.01" defaultValue={0} />
        </label>
        <label className="checkbox-field">
          <input name="isActive" type="checkbox" defaultChecked />
          المادة نشطة
        </label>
      </div>
      <label>
        كلمات البحث
        <input name="searchKeywords" maxLength={500} />
      </label>
      <label>
        ملاحظات
        <textarea name="notes" rows={3} />
      </label>
      <div className="form-actions">
        <button disabled={isSaving} type="submit">{isSaving ? 'جاري الحفظ...' : 'حفظ المادة'}</button>
      </div>
    </form>
  );
}

type PurchaseLineDraft = {
  itemId: string;
  itemLabel: string;
  quantity: string;
  unitPrice: string;
  notes: string;
};

type PurchasePaymentDraft = {
  paymentMethod: 'cash' | 'bank' | 'other';
  drawerId: string;
  bankAccountId: string;
  amount: string;
  referenceNumber: string;
  notes: string;
};

function itemLabel(item: ItemOption) {
  return `${item.code} - ${item.name}`;
}

function emptyPurchaseLine(): PurchaseLineDraft {
  return { itemId: '', itemLabel: '', quantity: '1', unitPrice: '0', notes: '' };
}

function emptyPurchasePayment(): PurchasePaymentDraft {
  return {
    paymentMethod: 'cash',
    drawerId: '',
    bankAccountId: '',
    amount: '',
    referenceNumber: '',
    notes: '',
  };
}

export function PurchaseInvoiceForm({
  branches,
  warehouses,
  suppliers,
  items,
  drawers,
  bankAccounts,
}: Readonly<{
  branches: BranchOption[];
  warehouses: WarehouseOption[];
  suppliers: SupplierOption[];
  items: ItemOption[];
  drawers: DrawerOption[];
  bankAccounts: BankAccountOption[];
}>) {
  const router = useRouter();
  const [message, setMessage] = useState<MessageState>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lines, setLines] = useState<PurchaseLineDraft[]>([emptyPurchaseLine()]);
  const [payments, setPayments] = useState<PurchasePaymentDraft[]>([]);
  const itemOptions = useMemo(() => items.map((item) => ({ ...item, label: itemLabel(item) })), [items]);

  function updateLine(index: number, patch: Partial<PurchaseLineDraft>) {
    setLines((current) => current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)));
  }

  function handleItemChange(index: number, value: string) {
    const matched = itemOptions.find((item) => item.label === value);
    updateLine(index, {
      itemLabel: value,
      itemId: matched?.id ?? '',
      unitPrice: matched ? String(matched.costPrice ?? 0) : lines[index]?.unitPrice ?? '0',
    });
  }

  function updatePayment(index: number, patch: Partial<PurchasePaymentDraft>) {
    setPayments((current) =>
      current.map((payment, paymentIndex) => (paymentIndex === index ? { ...payment, ...patch } : payment)),
    );
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
    const activePayments = payments
      .map((payment) => ({
        ...payment,
        amount: draftNumber(payment.amount),
      }))
      .filter((payment) => payment.amount > 0);
    const totalPaid = activePayments.reduce((sum, payment) => sum + payment.amount, 0);

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

    const invalidPayment = activePayments.find(
      (payment) =>
        !['cash', 'bank'].includes(payment.paymentMethod) ||
        (payment.paymentMethod === 'cash' && !payment.drawerId) ||
        (payment.paymentMethod === 'bank' && !payment.bankAccountId),
    );

    if (invalidPayment) {
      setMessage('اختر الدرج للدفعات النقدية والحساب البنكي للدفعات البنكية.');
      setIsSaving(false);
      return;
    }

    try {
      const saved = (await submitJson('/purchase-invoices', 'POST', payload)) as { id?: string };
      if (saved.id && activePayments.length > 0) {
        await submitJson('/supplier-payments/batch', 'POST', {
          purchaseInvoiceId: saved.id,
          branchId: payload.branchId,
          paymentDate: payload.invoiceDate,
          payments: activePayments.map((payment) => ({
            paymentMethod: payment.paymentMethod,
            drawerId: payment.paymentMethod === 'cash' ? payment.drawerId : null,
            bankAccountId: payment.paymentMethod === 'bank' ? payment.bankAccountId : null,
            amount: payment.amount,
            referenceNumber: payment.referenceNumber.trim() || null,
            notes: payment.notes.trim() || null,
          })),
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
            <span>اختر المواد من القائمة وأدخل الكمية وسعر الوحدة.</span>
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
                  الكمية
                  <input type="number" min="0.001" step="0.001" value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} required />
                </label>
                <label>
                  سعر الوحدة
                  <input type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => updateLine(index, { unitPrice: event.target.value })} required />
                </label>
                <label>
                  الإجمالي
                  <input disabled value={(Number(line.quantity || 0) * Number(line.unitPrice || 0)).toFixed(2)} />
                </label>
              </div>
              <div className="transfer-item-meta">
                <p className="field-hint">يجب اختيار المادة من القائمة المقترحة حتى يتم إرسال معرف المادة الصحيح.</p>
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

      <section className="transfer-items-section">
        <div className="panel-heading">
          <div>
            <h3>دفعات الفاتورة</h3>
            <span>يمكن تركها فارغة أو إضافة أكثر من دفعة نقدية وبنكية لنفس الفاتورة.</span>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setPayments((current) => [...current, emptyPurchasePayment()])}
          >
            إضافة دفعة
          </button>
        </div>

        {payments.length === 0 ? (
          <p className="field-hint">بدون دفعات الآن. ستبقى الفاتورة مفتوحة ويمكن إضافة الدفعات لاحقا.</p>
        ) : (
          <div className="transfer-items-list">
            {payments.map((payment, index) => (
              <article className="transfer-item-card" key={index}>
                <div className="transfer-item-grid">
                  <label>
                    طريقة الدفع
                    <select
                      value={payment.paymentMethod}
                      onChange={(event) =>
                        updatePayment(index, {
                          paymentMethod: event.target.value as PurchasePaymentDraft['paymentMethod'],
                        })
                      }
                    >
                      <option value="cash">نقدا</option>
                      <option value="bank">بنكي</option>
                      <option value="other">أخرى</option>
                    </select>
                  </label>
                  <label>
                    المبلغ
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={payment.amount}
                      onChange={(event) => updatePayment(index, { amount: event.target.value })}
                    />
                  </label>
                  <label>
                    الدرج النقدي
                    <select
                      value={payment.drawerId}
                      onChange={(event) => updatePayment(index, { drawerId: event.target.value })}
                      disabled={payment.paymentMethod !== 'cash'}
                    >
                      <option value="">اختر الدرج</option>
                      {drawers.map((drawer) => (
                        <option key={drawer.id} value={drawer.id}>
                          {drawer.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    الحساب البنكي
                    <select
                      value={payment.bankAccountId}
                      onChange={(event) => updatePayment(index, { bankAccountId: event.target.value })}
                      disabled={payment.paymentMethod !== 'bank'}
                    >
                      <option value="">اختر الحساب</option>
                      {bankAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    المرجع
                    <input
                      maxLength={120}
                      value={payment.referenceNumber}
                      onChange={(event) => updatePayment(index, { referenceNumber: event.target.value })}
                    />
                  </label>
                </div>
                <div className="transfer-item-meta">
                  <p className="field-hint">الدفعات النقدية تخصم من الدرج، والدفعات البنكية تخصم من الحساب البنكي.</p>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setPayments((current) => current.filter((_, paymentIndex) => paymentIndex !== index))}
                  >
                    حذف الدفعة
                  </button>
                </div>
                <label>
                  ملاحظات الدفعة
                  <textarea
                    rows={2}
                    value={payment.notes}
                    onChange={(event) => updatePayment(index, { notes: event.target.value })}
                  />
                </label>
              </article>
            ))}
          </div>
        )}
      </section>

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
