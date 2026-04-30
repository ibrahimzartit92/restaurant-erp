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
      setMessage(error instanceof Error ? error.message : 'ØªØ¹Ø°Ø± Ø­ÙØ¸ Ø§Ù„ÙØ±Ø¹.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <FormMessage message={message} />
      <div className="form-grid">
        <label>
          ÙƒÙˆØ¯ Ø§Ù„ÙØ±Ø¹
          <input name="code" maxLength={50} placeholder="Ø§Ø®ØªÙŠØ§Ø±ÙŠ" />
        </label>
        <label>
          Ø§Ø³Ù… Ø§Ù„ÙØ±Ø¹
          <input name="name" maxLength={160} required />
        </label>
        <label>
          Ø§Ù„Ø±ØµÙŠØ¯ Ø§Ù„Ø§ÙØªØªØ§Ø­ÙŠ Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠ
          <input name="defaultOpeningBalance" type="number" min="0" step="0.01" defaultValue={0} />
        </label>
        <label>
          Ù…Ø¨Ù„Øº Ø§Ù„ÙÙƒØ© Ø§Ù„Ø«Ø§Ø¨Øª
          <input name="defaultCashFloat" type="number" min="0" step="0.01" defaultValue={0} />
        </label>
        <label className="checkbox-field">
          <input name="isActive" type="checkbox" defaultChecked />
          Ø§Ù„ÙØ±Ø¹ Ù†Ø´Ø·
        </label>
      </div>
      <div className="form-actions">
        <button disabled={isSaving} type="submit">{isSaving ? 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸...' : 'Ø­ÙØ¸ Ø§Ù„ÙØ±Ø¹'}</button>
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
      setMessage(error instanceof Error ? error.message : 'ØªØ¹Ø°Ø± Ø­ÙØ¸ Ø§Ù„Ù…Ø®Ø²Ù†.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <FormMessage message={message} />
      <div className="form-grid">
        <label>
          ÙƒÙˆØ¯ Ø§Ù„Ù…Ø®Ø²Ù†
          <input name="code" maxLength={50} required />
        </label>
        <label>
          Ø§Ø³Ù… Ø§Ù„Ù…Ø®Ø²Ù†
          <input name="name" maxLength={160} required />
        </label>
        <label className="checkbox-field">
          <input name="isActive" type="checkbox" defaultChecked />
          Ø§Ù„Ù…Ø®Ø²Ù† Ù†Ø´Ø·
        </label>
      </div>
      <div className="form-actions">
        <button disabled={isSaving} type="submit">{isSaving ? 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸...' : 'Ø­ÙØ¸ Ø§Ù„Ù…Ø®Ø²Ù†'}</button>
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
      setMessage(error instanceof Error ? error.message : 'ØªØ¹Ø°Ø± Ø­ÙØ¸ Ø§Ù„Ù…ÙˆØ±Ø¯.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <FormMessage message={message} />
      <div className="form-grid">
        <label>
          ÙƒÙˆØ¯ Ø§Ù„Ù…ÙˆØ±Ø¯
          <input name="code" maxLength={50} placeholder="Ø§Ø®ØªÙŠØ§Ø±ÙŠ" />
        </label>
        <label>
          Ø§Ø³Ù… Ø§Ù„Ù…ÙˆØ±Ø¯
          <input name="name" maxLength={180} required />
        </label>
        <label>
          Ø§Ù„Ù‡Ø§ØªÙ
          <input name="phone" maxLength={40} />
        </label>
        <label>
          Ù…Ù‡Ù„Ø© Ø§Ù„Ø¯ÙØ¹ Ø¨Ø§Ù„Ø£ÙŠØ§Ù…
          <input name="defaultDueDays" type="number" min="0" defaultValue={0} />
        </label>
        <label className="checkbox-field">
          <input name="isActive" type="checkbox" defaultChecked />
          Ø§Ù„Ù…ÙˆØ±Ø¯ Ù†Ø´Ø·
        </label>
      </div>
      <label>
        Ø§Ù„Ø¹Ù†ÙˆØ§Ù†
        <textarea name="address" rows={3} />
      </label>
      <label>
        Ù…Ù„Ø§Ø­Ø¸Ø§Øª
        <textarea name="notes" rows={3} />
      </label>
      <div className="form-actions">
        <button disabled={isSaving} type="submit">{isSaving ? 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸...' : 'Ø­ÙØ¸ Ø§Ù„Ù…ÙˆØ±Ø¯'}</button>
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
      setMessage(error instanceof Error ? error.message : 'ØªØ¹Ø°Ø± Ø­ÙØ¸ Ø§Ù„Ø¯Ø±Ø¬.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <FormMessage message={message} />
      <div className="form-grid">
        <label>
          Ø§Ù„ÙØ±Ø¹
          <select name="branchId" required>
            <option value="">Ø§Ø®ØªØ± Ø§Ù„ÙØ±Ø¹</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </label>
        <label>
          ÙƒÙˆØ¯ Ø§Ù„Ø¯Ø±Ø¬
          <input name="code" maxLength={50} required />
        </label>
        <label>
          Ø§Ø³Ù… Ø§Ù„Ø¯Ø±Ø¬
          <input name="name" maxLength={160} required />
        </label>
        <label className="checkbox-field">
          <input name="isActive" type="checkbox" defaultChecked />
          Ø§Ù„Ø¯Ø±Ø¬ Ù†Ø´Ø·
        </label>
      </div>
      <label>
        Ù…Ù„Ø§Ø­Ø¸Ø§Øª
        <textarea name="notes" rows={3} />
      </label>
      <div className="form-actions">
        <button disabled={isSaving} type="submit">{isSaving ? 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸...' : 'Ø­ÙØ¸ Ø§Ù„Ø¯Ø±Ø¬'}</button>
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
      setMessage(error instanceof Error ? error.message : 'ØªØ¹Ø°Ø± Ø­ÙØ¸ Ø§Ù„Ù…Ø§Ø¯Ø©.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <FormMessage message={message} />
      <div className="form-grid">
        <label>
          ÙƒÙˆØ¯ Ø§Ù„Ù…Ø§Ø¯Ø©
          <input name="code" maxLength={50} required />
        </label>
        <label>
          Ø§Ø³Ù… Ø§Ù„Ù…Ø§Ø¯Ø©
          <input name="name" maxLength={180} required />
        </label>
        <label>
          Ø§Ù„ØªØµÙ†ÙŠÙ
          <select name="categoryId">
            <option value="">ØªØµÙ†ÙŠÙ Ø§ÙØªØ±Ø§Ø¶ÙŠ</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label>
          Ø§Ù„ÙˆØ­Ø¯Ø©
          <select name="unitId">
            <option value="">ÙˆØ­Ø¯Ø© Ø§ÙØªØ±Ø§Ø¶ÙŠØ©</option>
            {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
          </select>
        </label>
        <label>
          Ø§Ù„Ø³Ø¹Ø± Ø§Ù„Ø§Ø¨ØªØ¯Ø§Ø¦ÙŠ
          <input name="initialPrice" type="number" min="0" step="0.01" defaultValue={0} />
        </label>
        <label>
          Ø³Ø¹Ø± Ø§Ù„ØªÙƒÙ„ÙØ©
          <input name="costPrice" type="number" min="0" step="0.01" defaultValue={0} />
        </label>
        <label>
          Ø³Ø¹Ø± Ø§Ù„Ø¨ÙŠØ¹
          <input name="salePrice" type="number" min="0" step="0.01" defaultValue={0} />
        </label>
        <label className="checkbox-field">
          <input name="isActive" type="checkbox" defaultChecked />
          Ø§Ù„Ù…Ø§Ø¯Ø© Ù†Ø´Ø·Ø©
        </label>
      </div>
      <label>
        ÙƒÙ„Ù…Ø§Øª Ø§Ù„Ø¨Ø­Ø«
        <input name="searchKeywords" maxLength={500} />
      </label>
      <label>
        Ù…Ù„Ø§Ø­Ø¸Ø§Øª
        <textarea name="notes" rows={3} />
      </label>
      <div className="form-actions">
        <button disabled={isSaving} type="submit">{isSaving ? 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸...' : 'Ø­ÙØ¸ Ø§Ù„Ù…Ø§Ø¯Ø©'}</button>
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

function itemLabel(item: ItemOption) {
  return `${item.code} - ${item.name}`;
}

function emptyPurchaseLine(): PurchaseLineDraft {
  return { itemId: '', itemLabel: '', quantity: '1', unitPrice: '0', notes: '' };
}

export function PurchaseInvoiceForm({
  branches,
  warehouses,
  suppliers,
  items,
  drawers,
  bankAccounts,
  vaults,
}: Readonly<{
  branches: BranchOption[];
  warehouses: WarehouseOption[];
  suppliers: SupplierOption[];
  items: ItemOption[];
  drawers: DrawerOption[];
  bankAccounts: BankAccountOption[];
  vaults: VaultOption[];
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
    updateLine(index, {
      itemLabel: value,
      itemId: matched?.id ?? '',
      unitPrice: matched ? String(matched.costPrice ?? 0) : lines[index]?.unitPrice ?? '0',
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
      setMessage('Ø£Ø¶Ù Ù…Ø§Ø¯Ø© ÙˆØ§Ø­Ø¯Ø© Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„ Ù…Ø¹ ÙƒÙ…ÙŠØ© ÙˆØ³Ø¹Ø± ØµØ­ÙŠØ­ÙŠÙ†.');
      setIsSaving(false);
      return;
    }

    if (totalPaid > totalAmount) {
      setMessage('Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¯ÙØ¹Ø§Øª Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø£Ù† ÙŠØªØ¬Ø§ÙˆØ² Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ÙØ§ØªÙˆØ±Ø©.');
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
      setMessage(error instanceof Error ? error.message : 'ØªØ¹Ø°Ø± Ø­ÙØ¸ ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ø´Ø±Ø§Ø¡.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel stacked-sections" onSubmit={handleSubmit}>
      <FormMessage message={message} />
      <div className="form-grid">
        <label>
          Ø±Ù‚Ù… Ø§Ù„ÙØ§ØªÙˆØ±Ø©
          <input name="invoiceNumber" maxLength={50} placeholder="ÙŠÙˆÙ„Ø¯ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§ Ø¹Ù†Ø¯ ØªØ±ÙƒÙ‡ ÙØ§Ø±ØºØ§" />
        </label>
        <label>
          Ø§Ù„ÙˆØµÙ
          <input name="invoiceLabel" maxLength={180} />
        </label>
        <label>
          Ø§Ù„ÙØ±Ø¹
          <select name="branchId" required>
            <option value="">Ø§Ø®ØªØ± Ø§Ù„ÙØ±Ø¹</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </label>
        <label>
          Ø§Ù„Ù…Ø®Ø²Ù†
          <select name="warehouseId" required>
            <option value="">Ø§Ø®ØªØ± Ø§Ù„Ù…Ø®Ø²Ù†</option>
            {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
          </select>
        </label>
        <label>
          Ø§Ù„Ù…ÙˆØ±Ø¯
          <select name="supplierId">
            <option value="">ÙØ§ØªÙˆØ±Ø© Ù…ØªÙØ±Ù‚Ø© Ø¨Ø¯ÙˆÙ† Ù…ÙˆØ±Ø¯</option>
            {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </select>
        </label>
        <label>
          ØªØ§Ø±ÙŠØ® Ø§Ù„ÙØ§ØªÙˆØ±Ø©
          <input name="invoiceDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
        </label>
        <label>
          ØªØ§Ø±ÙŠØ® Ø§Ù„Ø§Ø³ØªØ­Ù‚Ø§Ù‚
          <input name="dueDate" type="date" />
        </label>
        <label>
          Ø§Ù„Ø­Ø§Ù„Ø©
          <select name="status" defaultValue="open">
            <option value="draft">Ù…Ø³ÙˆØ¯Ø©</option>
            <option value="open">Ù…ÙØªÙˆØ­Ø©</option>
            <option value="partially_paid">Ù…Ø¯ÙÙˆØ¹Ø© Ø¬Ø²Ø¦ÙŠØ§</option>
            <option value="paid">Ù…Ø¯ÙÙˆØ¹Ø©</option>
          </select>
        </label>
        <label>
          Ø§Ù„Ø®ØµÙ…
          <input name="discountAmount" type="number" min="0" step="0.01" defaultValue={0} />
        </label>
      </div>
      <label>
        Ù…Ù„Ø§Ø­Ø¸Ø§Øª
        <textarea name="notes" rows={3} />
      </label>

      <section className="transfer-items-section">
        <div className="panel-heading">
          <div>
            <h3>Ù…ÙˆØ§Ø¯ Ø§Ù„ÙØ§ØªÙˆØ±Ø©</h3>
            <span>Ø§Ø®ØªØ± Ø§Ù„Ù…ÙˆØ§Ø¯ Ù…Ù† Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© ÙˆØ£Ø¯Ø®Ù„ Ø§Ù„ÙƒÙ…ÙŠØ© ÙˆØ³Ø¹Ø± Ø§Ù„ÙˆØ­Ø¯Ø©.</span>
          </div>
          <button className="secondary-button" type="button" onClick={() => setLines((current) => [...current, emptyPurchaseLine()])}>
            Ø¥Ø¶Ø§ÙØ© Ù…Ø§Ø¯Ø©
          </button>
        </div>
        <div className="transfer-items-list">
          {lines.map((line, index) => (
            <article className="transfer-item-card" key={index}>
              <div className="transfer-item-grid">
                <label>
                  Ø§Ù„Ù…Ø§Ø¯Ø©
                  <input list={`purchase-item-options-${index}`} value={line.itemLabel} onChange={(event) => handleItemChange(index, event.target.value)} required />
                  <datalist id={`purchase-item-options-${index}`}>
                    {itemOptions.map((item) => <option key={item.id} value={item.label} />)}
                  </datalist>
                </label>
                <label>
                  Ø§Ù„ÙƒÙ…ÙŠØ©
                  <input type="number" min="0.001" step="0.001" value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} required />
                </label>
                <label>
                  Ø³Ø¹Ø± Ø§Ù„ÙˆØ­Ø¯Ø©
                  <input type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => updateLine(index, { unitPrice: event.target.value })} required />
                </label>
                <label>
                  Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ
                  <input disabled value={(Number(line.quantity || 0) * Number(line.unitPrice || 0)).toFixed(2)} />
                </label>
              </div>
              <div className="transfer-item-meta">
                <p className="field-hint">ÙŠØ¬Ø¨ Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„Ù…Ø§Ø¯Ø© Ù…Ù† Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…Ù‚ØªØ±Ø­Ø© Ø­ØªÙ‰ ÙŠØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ù…Ø¹Ø±Ù Ø§Ù„Ù…Ø§Ø¯Ø© Ø§Ù„ØµØ­ÙŠØ­.</p>
                <button className="secondary-button" type="button" onClick={() => setLines((current) => current.length === 1 ? current : current.filter((_, lineIndex) => lineIndex !== index))}>
                  Ø­Ø°Ù Ø§Ù„Ø³Ø·Ø±
                </button>
              </div>
              <label>
                Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø§Ù„Ù…Ø§Ø¯Ø©
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
        <button disabled={isSaving} type="submit">{isSaving ? 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸...' : 'Ø­ÙØ¸ ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ø´Ø±Ø§Ø¡'}</button>
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
      setMessage(error instanceof Error ? error.message : 'ØªØ¹Ø°Ø± Ø­ÙØ¸ Ø¯ÙØ¹Ø© Ø§Ù„Ù…ÙˆØ±Ø¯.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <FormMessage message={message} />
      <div className="form-grid">
        <label>
          Ø±Ù‚Ù… Ø§Ù„Ø¯ÙØ¹Ø©
          <input name="paymentNumber" maxLength={50} placeholder="ÙŠÙˆÙ„Ø¯ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§ Ø¹Ù†Ø¯ ØªØ±ÙƒÙ‡ ÙØ§Ø±ØºØ§" />
        </label>
        <label>
          ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ø´Ø±Ø§Ø¡
          <select name="purchaseInvoiceId" required>
            <option value="">Ø§Ø®ØªØ± Ø§Ù„ÙØ§ØªÙˆØ±Ø©</option>
            {invoices.map((invoice) => (
              <option key={invoice.id} value={invoice.id}>
                {invoice.invoiceNumber} - {invoice.supplier?.name ?? 'Ù…ØªÙØ±Ù‚Ø©'} - Ù…ØªØ¨Ù‚ÙŠ {invoice.remainingAmount}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ø§Ù„ÙØ±Ø¹
          <select name="branchId" required>
            <option value="">Ø§Ø®ØªØ± Ø§Ù„ÙØ±Ø¹ Ø§Ù„Ù…Ø·Ø§Ø¨Ù‚ Ù„Ù„ÙØ§ØªÙˆØ±Ø©</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </label>
        <label>
          ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¯ÙØ¹
          <input name="paymentDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
        </label>
        <label>
          Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„Ø¯ÙØ¹
          <select name="paymentMethod" defaultValue="cash" required>
            <option value="cash">Ù†Ù‚Ø¯Ø§</option>
            <option value="bank">Ø¨Ù†ÙƒÙŠ</option>
            <option value="other">Ø£Ø®Ø±Ù‰</option>
          </select>
        </label>
        <label>
          Ø§Ù„Ø¯Ø±Ø¬ Ø§Ù„Ù†Ù‚Ø¯ÙŠ
          <select name="drawerId">
            <option value="">ØºÙŠØ± Ù…Ø­Ø¯Ø¯</option>
            {drawers.map((drawer) => <option key={drawer.id} value={drawer.id}>{drawer.name}</option>)}
          </select>
        </label>
        <label>
          Ø§Ù„Ø­Ø³Ø§Ø¨ Ø§Ù„Ø¨Ù†ÙƒÙŠ
          <select name="bankAccountId">
            <option value="">ØºÙŠØ± Ù…Ø­Ø¯Ø¯</option>
            {bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </label>
        <label>
          Ø§Ù„Ù…Ø¨Ù„Øº
          <input name="amount" type="number" min="0.01" step="0.01" required />
        </label>
        <label>
          Ø§Ù„Ù…Ø±Ø¬Ø¹
          <input name="referenceNumber" maxLength={120} />
        </label>
      </div>
      <p className="field-hint">Ø§Ù„Ø¯ÙØ¹ Ø§Ù„Ù†Ù‚Ø¯ÙŠ ÙŠØ­ØªØ§Ø¬ Ø¯Ø±Ø¬ Ù†Ù‚Ø¯ÙŠØŒ ÙˆØ§Ù„Ø¯ÙØ¹ Ø§Ù„Ø¨Ù†ÙƒÙŠ ÙŠØ­ØªØ§Ø¬ Ø­Ø³Ø§Ø¨Ø§ Ø¨Ù†ÙƒÙŠØ§. ÙŠØ¬Ø¨ Ø£Ù† ÙŠØ·Ø§Ø¨Ù‚ Ø§Ù„ÙØ±Ø¹ ÙØ±Ø¹ Ø§Ù„ÙØ§ØªÙˆØ±Ø©.</p>
      <label>
        Ù…Ù„Ø§Ø­Ø¸Ø§Øª
        <textarea name="notes" rows={3} />
      </label>
      <div className="form-actions">
        <button disabled={isSaving} type="submit">{isSaving ? 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸...' : 'Ø­ÙØ¸ Ø¯ÙØ¹Ø© Ø§Ù„Ù…ÙˆØ±Ø¯'}</button>
      </div>
    </form>
  );
}
