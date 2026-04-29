import { SupplierPaymentBatchForm } from '../../../components/supplier-payment-batch-form';
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
      <PageHeader title="دفعات موردين" description="سجل دفعة واحدة أو عدة دفعات نقدية وبنكية لنفس فاتورة الشراء." />
      {invoices.error ? <p className="notice">{invoices.error}</p> : null}
      {branches.error ? <p className="notice">{branches.error}</p> : null}
      {drawers.error ? <p className="notice">{drawers.error}</p> : null}
      {bankAccounts.error ? <p className="notice">{bankAccounts.error}</p> : null}
      <SupplierPaymentBatchForm invoices={invoices.data} branches={branches.data} drawers={drawers.data} bankAccounts={bankAccounts.data} />
    </>
  );
}
