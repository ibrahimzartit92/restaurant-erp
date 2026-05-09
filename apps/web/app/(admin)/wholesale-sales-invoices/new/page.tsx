import { PageHeader } from '../../../components/page-header';
import { WholesaleSalesInvoiceForm } from '../../../components/wholesale-sales-invoice-form';
import { fetchList, getCurrencySettings } from '../../../lib/api';
import type { BranchOption, CustomerOption, ItemOption, WarehouseOption } from '../../../lib/types';

export default async function NewWholesaleSalesInvoicePage() {
  const [branches, warehouses, customers, items, currency] = await Promise.all([
    fetchList<BranchOption>('/branches'),
    fetchList<WarehouseOption>('/warehouses'),
    fetchList<CustomerOption>('/customers?active=true'),
    fetchList<ItemOption>('/items'),
    getCurrencySettings(),
  ]);

  return (
    <>
      <PageHeader title="فاتورة بيع جملة جديدة" description="أنشئ الفاتورة أولًا، ثم سيتم فتح تفاصيلها لتسجيل التحصيلات على رقم فاتورة محفوظ." />
      {branches.error ?? warehouses.error ?? customers.error ?? items.error ? (
        <p className="notice danger">{branches.error ?? warehouses.error ?? customers.error ?? items.error}</p>
      ) : null}
      <WholesaleSalesInvoiceForm
        branches={branches.data}
        warehouses={warehouses.data}
        customers={customers.data}
        items={items.data}
        currencySymbol={currency.currencySymbol}
        decimalPlaces={currency.decimalPlaces}
      />
    </>
  );
}
