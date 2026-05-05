'use client';

import Link from 'next/link';
import { useState } from 'react';
import { submitJson } from '../lib/client-api';
import { formatMoneyWithCurrency } from '../lib/money';
import { StatusBadge } from './status-badge';

type ItemRow = {
  id: string;
  code: string;
  name: string;
  category?: { name: string } | null;
  unit?: { name: string } | null;
  purchasePrice?: number;
  initialPrice?: number;
  costPrice: number;
  salePrice: number;
  isActive: boolean;
};

type SaveState = {
  status: 'idle' | 'saving' | 'saved' | 'failed';
  message?: string;
};

type PriceField = 'purchasePrice' | 'costPrice' | 'salePrice';

const priceLabels: Record<PriceField, string> = {
  purchasePrice: 'سعر الشراء',
  costPrice: 'سعر التكلفة',
  salePrice: 'سعر البيع',
};

export function ItemsPriceTable({
  rows,
  currencySymbol,
  decimalPlaces,
}: Readonly<{
  rows: ItemRow[];
  currencySymbol: string;
  decimalPlaces: number;
}>) {
  const [items, setItems] = useState(rows);
  const [states, setStates] = useState<Record<string, SaveState>>({});

  function setState(itemId: string, field: PriceField, state: SaveState) {
    setStates((current) => ({ ...current, [`${itemId}.${field}`]: state }));
  }

  async function savePrice(itemId: string, field: PriceField, rawValue: string) {
    const numericValue = Number(rawValue);

    if (!Number.isFinite(numericValue) || numericValue < 0) {
      setState(itemId, field, { status: 'failed', message: 'أدخل سعرا صحيحا.' });
      return;
    }

    const currentItem = items.find((item) => item.id === itemId);
    const currentValue = Number(
      field === 'purchasePrice' ? currentItem?.purchasePrice ?? currentItem?.initialPrice ?? 0 : currentItem?.[field] ?? 0,
    );

    if (numericValue === currentValue) {
      return;
    }

    setState(itemId, field, { status: 'saving' });

    try {
      await submitJson(`/items/${itemId}`, 'PATCH', {
        [field]: numericValue,
        ...(field === 'purchasePrice' ? { initialPrice: numericValue } : {}),
      });
      setItems((currentItems) =>
        currentItems.map((item) =>
          item.id === itemId
            ? {
                ...item,
                [field]: numericValue,
                ...(field === 'purchasePrice' ? { initialPrice: numericValue } : {}),
              }
            : item,
        ),
      );
      setState(itemId, field, { status: 'saved' });
    } catch (error) {
      setState(itemId, field, {
        status: 'failed',
        message: error instanceof Error ? error.message : 'تعذر حفظ السعر.',
      });
    }
  }

  async function deleteItem(item: ItemRow) {
    if (
      !window.confirm(
        `هل تريد حذف المادة "${item.name}"؟ إذا كانت مستخدمة في سجلات سابقة سيتم تعطيلها بدل حذفها.`,
      )
    ) {
      return;
    }

    setState(item.id, 'purchasePrice', { status: 'saving', message: 'جار الحذف...' });

    try {
      const result = (await submitJson(`/items/${item.id}/delete`, 'POST', {})) as {
        deleted?: boolean;
        deactivated?: boolean;
        message?: string;
      };

      if (result.deleted) {
        setItems((currentItems) => currentItems.filter((currentItem) => currentItem.id !== item.id));
        return;
      }

      setItems((currentItems) =>
        currentItems.map((currentItem) => (currentItem.id === item.id ? { ...currentItem, isActive: false } : currentItem)),
      );
      setState(item.id, 'purchasePrice', {
        status: 'saved',
        message: result.message ?? 'تم تعطيل المادة بدل حذفها لأنها مستخدمة في سجلات سابقة.',
      });
    } catch (error) {
      setState(item.id, 'purchasePrice', {
        status: 'failed',
        message: error instanceof Error ? error.message : 'تعذر حذف المادة.',
      });
    }
  }

  function renderPriceInput(item: ItemRow, field: PriceField) {
    const key = `${item.id}.${field}`;
    const state = states[key];
    const value = field === 'purchasePrice' ? item.purchasePrice ?? item.initialPrice ?? 0 : item[field];

    return (
      <div className="price-autosave-cell">
        <label className="sr-only" htmlFor={key}>
          {priceLabels[field]}
        </label>
        <input
          id={key}
          type="number"
          min="0"
          step="0.01"
          defaultValue={Number(value ?? 0).toFixed(2)}
          onBlur={(event) => savePrice(item.id, field, event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
        />
        <small>{formatMoneyWithCurrency(value, currencySymbol, decimalPlaces)}</small>
        {state?.status === 'saving' ? <em>{state.message ?? 'جار الحفظ...'}</em> : null}
        {state?.status === 'saved' ? <em>{state.message ?? 'تم الحفظ'}</em> : null}
        {state?.status === 'failed' ? <em className="danger-text">{state.message ?? 'فشل الحفظ'}</em> : null}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">+</div>
        <h3>لا توجد مواد بعد</h3>
        <p>أضف المواد الأساسية حتى تظهر في فواتير الشراء والتحويلات والجرد.</p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>الكود</th>
            <th>اسم المادة</th>
            <th>التصنيف</th>
            <th>الوحدة</th>
            <th>سعر الشراء</th>
            <th>سعر التكلفة</th>
            <th>سعر البيع</th>
            <th>الحالة</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.code}</td>
              <td>{item.name}</td>
              <td>{item.category?.name ?? 'غير محدد'}</td>
              <td>{item.unit?.name ?? 'غير محدد'}</td>
              <td>{renderPriceInput(item, 'purchasePrice')}</td>
              <td>{renderPriceInput(item, 'costPrice')}</td>
              <td>{renderPriceInput(item, 'salePrice')}</td>
              <td>
                <StatusBadge value={item.isActive} />
              </td>
              <td>
                <div className="inline-actions">
                  <Link href={`/items/${item.id}/edit`}>تعديل</Link>
                  <button className="link-button danger" type="button" onClick={() => deleteItem(item)}>
                    حذف
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
