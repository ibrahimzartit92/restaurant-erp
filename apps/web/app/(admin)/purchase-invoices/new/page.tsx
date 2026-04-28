import { PurchaseInvoiceForm } from '../../../components/core-crud-forms';
import { PageHeader } from '../../../components/page-header';
import { fetchList } from '../../../lib/api';
import type {
  BankAccountOption,
  BranchOption,
  DrawerOption,
  ItemOption,
  SupplierOption,
  WarehouseOption,
} from '../../../lib/types';

export default async function NewPurchaseInvoicePage() {
  const [branches, warehouses, suppliers, items, drawers, bankAccounts] = await Promise.all([
    fetchList<BranchOption>('/branches'),
    fetchList<WarehouseOption>('/warehouses'),
    fetchList<SupplierOption>('/suppliers'),
    fetchList<ItemOption>('/items'),
    fetchList<DrawerOption>('/drawers'),
    fetchList<BankAccountOption>('/bank-accounts'),
  ]);

  return (
    <>
      <PageHeader title="إضافة فاتورة شراء" description="سجل فاتورة شراء بموادها وربطها بالفرع والمخزن والمورد عند الحاجة." />
      {branches.error ? <p className="notice">{branches.error}</p> : null}
      {warehouses.error ? <p className="notice">{warehouses.error}</p> : null}
      {suppliers.error ? <p className="notice">{suppliers.error}</p> : null}
      {items.error ? <p className="notice">{items.error}</p> : null}
      {drawers.error ? <p className="notice">{drawers.error}</p> : null}
      {bankAccounts.error ? <p className="notice">{bankAccounts.error}</p> : null}
      <PurchaseInvoiceForm
        branches={branches.data}
        warehouses={warehouses.data}
        suppliers={suppliers.data}
        items={items.data}
        drawers={drawers.data}
        bankAccounts={bankAccounts.data}
      />
    </>
  );
}
