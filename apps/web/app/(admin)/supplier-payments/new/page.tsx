import { SupplierPaymentForm } from '../../../components/core-crud-forms';
import { PageHeader } from '../../../components/page-header';
import { fetchList } from '../../../lib/api';
import type { BankAccountOption, BranchOption, DrawerOption, PurchaseInvoiceOption } from '../../../lib/types';

export default async function NewSupplierPaymentPage() {
  const [invoices, branches, drawers, bankAccounts] = await Promise.all([
    fetchList<PurchaseInvoiceOption>('/purchase-invoices'),
    fetchList<BranchOption>('/branches'),
    fetchList<DrawerOption>('/drawers'),
    fetchList<BankAccountOption>('/bank-accounts'),
  ]);

  return (
    <>
      <PageHeader title="إضافة دفعة مورد" description="سجل دفعة مرتبطة بفاتورة شراء مع طريقة الدفع والمرجع." />
      {invoices.error ? <p className="notice">{invoices.error}</p> : null}
      {branches.error ? <p className="notice">{branches.error}</p> : null}
      {drawers.error ? <p className="notice">{drawers.error}</p> : null}
      {bankAccounts.error ? <p className="notice">{bankAccounts.error}</p> : null}
      <SupplierPaymentForm invoices={invoices.data} branches={branches.data} drawers={drawers.data} bankAccounts={bankAccounts.data} />
    </>
  );
}
