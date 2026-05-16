import { notFound, redirect } from 'next/navigation';
import { PurchaseInvoiceForm } from '../../../../components/core-crud-forms';
import { PageHeader } from '../../../../components/page-header';
import { fetchList, fetchOne, getCurrencySettings } from '../../../../lib/api';
import type {
  BankAccountOption,
  BranchOption,
  DrawerOption,
  ItemOption,
  SupplierOption,
  VaultOption,
  WarehouseOption,
} from '../../../../lib/types';

type PurchaseInvoiceEditDetails = {
  id: string;
  invoiceNumber: string;
  invoiceLabel?: string | null;
  branchId: string;
  warehouseId: string;
  supplierId?: string | null;
  invoiceDate: string;
  dueDate?: string | null;
  status: string;
  discountAmount: number;
  notes?: string | null;
  items: {
    itemId: string;
    item?: ItemOption | null;
    quantity: number;
    unitPrice: number;
    notes?: string | null;
  }[];
};

export default async function EditPurchaseInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [invoiceResult, branches, warehouses, suppliers, items, drawers, bankAccounts, vaults, currencySettings] =
    await Promise.all([
      fetchOne<PurchaseInvoiceEditDetails>(`/purchase-invoices/${id}`),
      fetchList<BranchOption>('/branches'),
      fetchList<WarehouseOption>('/warehouses'),
      fetchList<SupplierOption>('/suppliers'),
      fetchList<ItemOption>('/items'),
      fetchList<DrawerOption>('/drawers'),
      fetchList<BankAccountOption>('/bank-accounts'),
      fetchList<VaultOption>('/vaults'),
      getCurrencySettings(),
    ]);

  if (!invoiceResult.data) {
    notFound();
  }

  if (!['draft', 'reopened'].includes(invoiceResult.data.status)) {
    redirect(`/purchase-invoices/${id}`);
  }

  return (
    <>
      <PageHeader title="تعديل فاتورة شراء مفتوحة" description="احفظ التعديلات هنا، ثم ارجع للتفاصيل لإعادة الاعتماد وتطبيق الأثر المحاسبي بشكل مراقب." />
      {branches.error ? <p className="notice">{branches.error}</p> : null}
      {warehouses.error ? <p className="notice">{warehouses.error}</p> : null}
      {suppliers.error ? <p className="notice">{suppliers.error}</p> : null}
      {items.error ? <p className="notice">{items.error}</p> : null}
      <PurchaseInvoiceForm
        branches={branches.data}
        warehouses={warehouses.data}
        suppliers={suppliers.data}
        items={items.data}
        drawers={drawers.data}
        bankAccounts={bankAccounts.data}
        vaults={vaults.data}
        currencySymbol={currencySettings.currencySymbol}
        decimalPlaces={currencySettings.decimalPlaces}
        initialInvoice={invoiceResult.data}
        editMode
      />
    </>
  );
}
