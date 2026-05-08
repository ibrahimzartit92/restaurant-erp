import { PageHeader } from '../../../components/page-header';
import { WholesaleSalesInvoiceForm } from '../../../components/wholesale-sales-invoice-form';
import { fetchList } from '../../../lib/api';
import { getCurrencySettings } from '../../../lib/api';
import type { BankAccountOption, BranchOption, CustomerOption, DrawerOption, ItemOption, WarehouseOption } from '../../../lib/types';

export default async function NewWholesaleSalesInvoicePage() {
  const [branches, warehouses, customers, items, drawers, bankAccounts, currency] = await Promise.all([
    fetchList<BranchOption>('/branches'),
    fetchList<WarehouseOption>('/warehouses'),
    fetchList<CustomerOption>('/customers?active=true'),
    fetchList<ItemOption>('/items'),
    fetchList<DrawerOption>('/drawers'),
    fetchList<BankAccountOption>('/bank-accounts'),
    getCurrencySettings(),
  ]);

  return (
    <>
      <PageHeader title="فاتورة بيع جملة جديدة" description="أنشئ فاتورة بيع من مخزن واحد، مع تحصيل نقدي أو بنكي وتخفيض المخزون عند الاعتماد." />
      {branches.error ?? warehouses.error ?? customers.error ?? items.error ?? drawers.error ?? bankAccounts.error ? (
        <p className="notice danger">{branches.error ?? warehouses.error ?? customers.error ?? items.error ?? drawers.error ?? bankAccounts.error}</p>
      ) : null}
      <WholesaleSalesInvoiceForm
        branches={branches.data}
        warehouses={warehouses.data}
        customers={customers.data}
        items={items.data}
        drawers={drawers.data}
        bankAccounts={bankAccounts.data}
        currencySymbol={currency.currencySymbol}
        decimalPlaces={currency.decimalPlaces}
      />
    </>
  );
}
