'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';
import type { BankAccountSummary, BranchOption } from '../lib/types';

const transactionTypes = [
  'deposit',
  'withdrawal',
  'transfer',
  'settlement',
  'supplier_payment_bank',
  'expense_bank',
  'sales_receipt_bank',
  'refund_bank',
] as const;

const directions = [
  { value: 'incoming', label: 'داخل' },
  { value: 'outgoing', label: 'خارج' },
] as const;

const typeLabels: Record<(typeof transactionTypes)[number], string> = {
  deposit: 'إيداع',
  withdrawal: 'سحب',
  transfer: 'تحويل',
  settlement: 'تسوية',
  supplier_payment_bank: 'دفعة مورد بنكية',
  expense_bank: 'مصروف بنكي',
  sales_receipt_bank: 'قبض مبيعات بنكي',
  refund_bank: 'مرتجع بنكي',
};

export function BankAccountTransactionForm({
  bankAccounts,
  branches,
}: Readonly<{
  bankAccounts: BankAccountSummary[];
  branches: BranchOption[];
}>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      bankAccountId: String(formData.get('bankAccountId') ?? ''),
      transactionDate: String(formData.get('transactionDate') ?? ''),
      transactionType: String(formData.get('transactionType') ?? ''),
      direction: String(formData.get('direction') ?? ''),
      amount: Number(formData.get('amount') ?? 0),
      branchId: String(formData.get('branchId') ?? '') || null,
      sourceType: String(formData.get('sourceType') ?? '') || null,
      sourceId: String(formData.get('sourceId') ?? '') || null,
      referenceNumber: String(formData.get('referenceNumber') ?? '') || null,
      description: String(formData.get('description') ?? ''),
      notes: String(formData.get('notes') ?? '') || null,
    };

    try {
      await submitJson('/bank-account-transactions', 'POST', payload);
      router.push('/bank-account-transactions');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ الحركة البنكية.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      {message ? <p className="notice danger">{message}</p> : null}

      <div className="form-grid">
        <label>
          الحساب البنكي
          <select name="bankAccountId" required>
            <option value="">اختر الحساب</option>
            {bankAccounts.map((bankAccount) => (
              <option key={bankAccount.id} value={bankAccount.id}>
                {bankAccount.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          تاريخ الحركة
          <input name="transactionDate" type="date" required />
        </label>
        <label>
          نوع الحركة
          <select name="transactionType" required>
            <option value="">اختر النوع</option>
            {transactionTypes.map((type) => (
              <option key={type} value={type}>
                {typeLabels[type]}
              </option>
            ))}
          </select>
        </label>
        <label>
          الاتجاه
          <select name="direction" required>
            <option value="">اختر الاتجاه</option>
            {directions.map((direction) => (
              <option key={direction.value} value={direction.value}>
                {direction.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          المبلغ
          <input min="0.01" name="amount" step="0.01" type="number" required />
        </label>
        <label>
          الفرع
          <select name="branchId">
            <option value="">بدون فرع</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          نوع المصدر
          <input maxLength={80} name="sourceType" placeholder="expense أو supplier_payment" />
        </label>
        <label>
          معرف المصدر
          <input name="sourceId" placeholder="معرف السجل المرتبط" />
        </label>
        <label>
          رقم المرجع
          <input maxLength={120} name="referenceNumber" />
        </label>
        <label>
          الوصف
          <input maxLength={255} name="description" required />
        </label>
      </div>

      <label>
        ملاحظات
        <textarea name="notes" rows={4} />
      </label>

      <div className="form-actions">
        <button disabled={isSaving} type="submit">
          {isSaving ? 'جار الحفظ...' : 'حفظ الحركة البنكية'}
        </button>
      </div>
    </form>
  );
}
