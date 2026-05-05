import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BankAccountTransactionDirection,
  BankAccountTransactionEntity,
} from '../bank-account-transactions/entities/bank-account-transaction.entity';
import { BankAccountEntity } from '../bank-accounts/entities/bank-account.entity';
import { BranchEntity } from '../branches/entities/branch.entity';
import { DailySaleEntity } from '../daily-sales/entities/daily-sale.entity';
import { ExpenseEntity } from '../expenses/entities/expense.entity';
import { PayrollRecordEntity } from '../payroll/entities/payroll-record.entity';
import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';
import { SettingsService } from '../settings/settings.service';
import {
  VaultTransactionDirection,
  VaultTransactionEntity,
} from '../vaults/entities/vault-transaction.entity';
import { VaultEntity } from '../vaults/entities/vault.entity';
import {
  DashboardBranchComparison,
  DashboardFilters,
  DashboardMetric,
  DashboardMetricKey,
  DashboardOpenInvoice,
  DashboardPoint,
  DashboardResult,
} from './dashboard.types';

type Range = { dateFrom: string; dateTo: string };
type Totals = {
  sales: number;
  cashSales: number;
  bankSales: number;
  deliverySales: number;
  websiteSales: number;
  purchases: number;
  operatingExpenses: number;
  miscellaneousExpenses: number;
  payroll: number;
};

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(BranchEntity)
    private readonly branchesRepository: Repository<BranchEntity>,
    @InjectRepository(DailySaleEntity)
    private readonly dailySalesRepository: Repository<DailySaleEntity>,
    @InjectRepository(ExpenseEntity)
    private readonly expensesRepository: Repository<ExpenseEntity>,
    @InjectRepository(PurchaseInvoiceEntity)
    private readonly purchaseInvoicesRepository: Repository<PurchaseInvoiceEntity>,
    @InjectRepository(PayrollRecordEntity)
    private readonly payrollRepository: Repository<PayrollRecordEntity>,
    @InjectRepository(BankAccountEntity)
    private readonly bankAccountsRepository: Repository<BankAccountEntity>,
    @InjectRepository(BankAccountTransactionEntity)
    private readonly bankTransactionsRepository: Repository<BankAccountTransactionEntity>,
    @InjectRepository(VaultEntity)
    private readonly vaultsRepository: Repository<VaultEntity>,
    @InjectRepository(VaultTransactionEntity)
    private readonly vaultTransactionsRepository: Repository<VaultTransactionEntity>,
    private readonly settingsService: SettingsService,
  ) {}

  async getDashboard(filters: DashboardFilters): Promise<DashboardResult> {
    const range = this.resolveRange(filters);
    const previousPeriod = this.previousEquivalentRange(range);
    const [branches, currentData, previousData, bankBalance, vaultBalance, openInvoices] = await Promise.all([
      this.branchesRepository.find({ order: { name: 'ASC' } }),
      this.loadPeriodData(range, filters.branchId),
      this.loadPeriodData(previousPeriod, filters.branchId),
      this.getBankBalance(filters.branchId),
      this.getVaultBalance(filters.branchId),
      this.getOpenInvoices(filters.branchId),
    ]);

    const totals = this.calculateTotals(currentData.dailySales, currentData.expenses, currentData.invoices, currentData.payrolls);
    const previousTotals = this.calculateTotals(
      previousData.dailySales,
      previousData.expenses,
      previousData.invoices,
      previousData.payrolls,
    );
    const operatingNet = totals.sales - totals.operatingExpenses - totals.miscellaneousExpenses - totals.payroll;
    const previousOperatingNet =
      previousTotals.sales -
      previousTotals.operatingExpenses -
      previousTotals.miscellaneousExpenses -
      previousTotals.payroll;
    const netAfterPurchases = operatingNet - totals.purchases;
    const previousNetAfterPurchases = previousOperatingNet - previousTotals.purchases;
    const supplierDue = openInvoices.reduce((sum, invoice) => sum + invoice.remainingAmount, 0);
    const previousSupplierDue = previousData.invoices
      .filter((invoice) => ['open', 'partially_paid'].includes(invoice.status))
      .reduce((sum, invoice) => sum + Number(invoice.remainingAmount ?? 0), 0);

    return {
      generatedAt: new Date().toISOString(),
      filters: {
        branchId: filters.branchId ?? null,
        period: filters.period ?? 'this_month',
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
      },
      previousPeriod,
      metrics: [
        this.metric('total_sales', 'إجمالي المبيعات', totals.sales, previousTotals.sales),
        this.metric('total_purchases', 'إجمالي المشتريات', totals.purchases, previousTotals.purchases),
        this.metric(
          'total_operating_expenses',
          'المصاريف التشغيلية',
          totals.operatingExpenses,
          previousTotals.operatingExpenses,
        ),
        this.metric(
          'total_miscellaneous_expenses',
          'مصاريف المتفرقات',
          totals.miscellaneousExpenses,
          previousTotals.miscellaneousExpenses,
        ),
        this.metric('total_payroll', 'الرواتب', totals.payroll, previousTotals.payroll),
        this.metric('operating_net', 'صافي التشغيل', operatingNet, previousOperatingNet),
        this.metric('net_after_purchases', 'الصافي بعد المشتريات', netAfterPurchases, previousNetAfterPurchases),
        this.metric('bank_balance', 'الرصيد البنكي الحالي', bankBalance, bankBalance),
        this.metric('vault_balance', 'رصيد الخزنة الحالي', vaultBalance, vaultBalance),
        this.metric('supplier_due', 'المستحقات للموردين', supplierDue, previousSupplierDue),
      ],
      charts: {
        timeSeries: this.buildTimeSeries(range, currentData.dailySales, currentData.expenses, currentData.invoices, currentData.payrolls),
        salesDistribution: [
          { label: 'نقدي', value: this.round(totals.cashSales) },
          { label: 'بنكي', value: this.round(totals.bankSales) },
          { label: 'توصيل', value: this.round(totals.deliverySales) },
          { label: 'موقع', value: this.round(totals.websiteSales) },
        ],
        costStructure: [
          { label: 'المشتريات', value: this.round(totals.purchases) },
          { label: 'تشغيلية', value: this.round(totals.operatingExpenses) },
          { label: 'متفرقات', value: this.round(totals.miscellaneousExpenses) },
          { label: 'رواتب', value: this.round(totals.payroll) },
        ],
        branchComparison: filters.branchId
          ? []
          : this.buildBranchComparison(branches, currentData.dailySales, currentData.expenses, currentData.invoices, currentData.payrolls),
      },
      openInvoices: openInvoices.slice(0, 8),
    };
  }

  async exportDashboard(filters: DashboardFilters, format: 'excel' | 'pdf') {
    const dashboard = await this.getDashboard(filters);
    const currencySettings = await this.getCurrencySettings();
    const filename = `dashboard-${dashboard.filters.dateFrom}-${dashboard.filters.dateTo}`;

    if (format === 'excel') {
      return {
        body: this.toCsv(dashboard, currencySettings),
        contentType: 'text/csv; charset=utf-8',
        filename: `${filename}.csv`,
      };
    }

    return {
      body: this.toPrintableHtml(dashboard, currencySettings),
      contentType: 'text/html; charset=utf-8',
      filename: `${filename}.html`,
    };
  }

  private async loadPeriodData(range: Range, branchId?: string) {
    const [dailySales, expenses, invoices, payrolls] = await Promise.all([
      this.dailySalesRepository
        .createQueryBuilder('sale')
        .leftJoinAndSelect('sale.branch', 'branch')
        .where('sale.sales_date BETWEEN :dateFrom AND :dateTo', range)
        .andWhere(branchId ? 'sale.branch_id = :branchId' : '1=1', { branchId })
        .getMany(),
      this.expensesRepository
        .createQueryBuilder('expense')
        .leftJoinAndSelect('expense.branch', 'branch')
        .leftJoinAndSelect('expense.expenseCategory', 'category')
        .where('expense.expense_date BETWEEN :dateFrom AND :dateTo', range)
        .andWhere(branchId ? 'expense.branch_id = :branchId' : '1=1', { branchId })
        .getMany(),
      this.purchaseInvoicesRepository
        .createQueryBuilder('invoice')
        .leftJoinAndSelect('invoice.branch', 'branch')
        .leftJoinAndSelect('invoice.supplier', 'supplier')
        .where('invoice.invoice_date BETWEEN :dateFrom AND :dateTo', range)
        .andWhere(branchId ? 'invoice.branch_id = :branchId' : '1=1', { branchId })
        .getMany(),
      this.payrollRepository
        .createQueryBuilder('payroll')
        .leftJoinAndSelect('payroll.employee', 'employee')
        .where('make_date(payroll.payroll_year, payroll.payroll_month, 1) BETWEEN CAST(:dateFrom AS date) AND CAST(:dateTo AS date)', range)
        .andWhere(branchId ? 'employee.default_branch_id = :branchId' : '1=1', { branchId })
        .getMany(),
    ]);

    return { dailySales, expenses, invoices, payrolls };
  }

  private async getOpenInvoices(branchId?: string): Promise<DashboardOpenInvoice[]> {
    const query = this.purchaseInvoicesRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.branch', 'branch')
      .leftJoinAndSelect('invoice.supplier', 'supplier')
      .where('invoice.status IN (:...statuses)', { statuses: ['open', 'unpaid', 'partially_paid'] })
      .andWhere('invoice.remaining_amount > 0')
      .orderBy('invoice.dueDate', 'ASC', 'NULLS LAST')
      .addOrderBy('invoice.invoiceDate', 'ASC');

    if (branchId) {
      query.andWhere('invoice.branch_id = :branchId', { branchId });
    }

    return (await query.getMany()).map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      supplierName: invoice.supplier?.name ?? 'متفرقة',
      branchName: invoice.branch?.name ?? 'غير محدد',
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      remainingAmount: invoice.remainingAmount,
      status: invoice.status,
    }));
  }

  private async getBankBalance(branchId?: string) {
    const accounts = await this.bankAccountsRepository.find();
    const rows = await this.bankTransactionsRepository
      .createQueryBuilder('transaction')
      .select('transaction.bank_account_id', 'bankAccountId')
      .addSelect(
        'COALESCE(SUM(CASE WHEN transaction.direction = :incoming THEN transaction.amount ELSE -transaction.amount END), 0)',
        'movementTotal',
      )
      .where(branchId ? 'transaction.branch_id = :branchId' : '1=1', { branchId })
      .groupBy('transaction.bank_account_id')
      .setParameter('incoming', BankAccountTransactionDirection.Incoming)
      .getRawMany<{ bankAccountId: string; movementTotal: string }>();
    const movementByAccount = new Map(rows.map((row) => [row.bankAccountId, Number(row.movementTotal ?? 0)]));

    return this.round(
      accounts.reduce((sum, account) => sum + Number(account.openingBalance ?? 0) + (movementByAccount.get(account.id) ?? 0), 0),
    );
  }

  private async getVaultBalance(branchId?: string) {
    const vaults = await this.vaultsRepository.find({ where: { isActive: true } });
    const rows = await this.vaultTransactionsRepository
      .createQueryBuilder('transaction')
      .select('transaction.vault_id', 'vaultId')
      .addSelect(
        'COALESCE(SUM(CASE WHEN transaction.direction = :incoming THEN transaction.amount ELSE -transaction.amount END), 0)',
        'movementTotal',
      )
      .where(branchId ? 'transaction.branch_id = :branchId' : '1=1', { branchId })
      .groupBy('transaction.vault_id')
      .setParameter('incoming', VaultTransactionDirection.In)
      .getRawMany<{ vaultId: string; movementTotal: string }>();
    const movementByVault = new Map(rows.map((row) => [row.vaultId, Number(row.movementTotal ?? 0)]));

    return this.round(
      vaults.reduce((sum, vault) => sum + Number(vault.openingBalance ?? 0) + (movementByVault.get(vault.id) ?? 0), 0),
    );
  }

  private calculateTotals(
    dailySales: DailySaleEntity[],
    expenses: ExpenseEntity[],
    invoices: PurchaseInvoiceEntity[],
    payrolls: PayrollRecordEntity[],
  ): Totals {
    const cashSales = dailySales.reduce((sum, sale) => sum + Number(sale.cashSalesAmount ?? 0), 0);
    const bankSales = dailySales.reduce((sum, sale) => sum + Number(sale.bankSalesAmount ?? 0), 0);
    const deliverySales = dailySales.reduce((sum, sale) => sum + Number(sale.deliverySalesAmount ?? 0), 0);
    const websiteSales = dailySales.reduce((sum, sale) => sum + Number(sale.websiteSalesAmount ?? 0), 0);
    const operatingExpenses = expenses
      .filter((expense) => expense.isFixed || expense.expenseCategory?.isFixed)
      .reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0);
    const miscellaneousExpenses = expenses
      .filter((expense) => !(expense.isFixed || expense.expenseCategory?.isFixed))
      .reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0);

    return {
      sales: dailySales.reduce((sum, sale) => sum + Number(sale.netSalesAmount ?? 0), 0),
      cashSales,
      bankSales,
      deliverySales,
      websiteSales,
      purchases: invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount ?? 0), 0),
      operatingExpenses,
      miscellaneousExpenses,
      payroll: payrolls.reduce((sum, payroll) => sum + Number(payroll.netSalary ?? 0), 0),
    };
  }

  private buildTimeSeries(
    range: Range,
    dailySales: DailySaleEntity[],
    expenses: ExpenseEntity[],
    invoices: PurchaseInvoiceEntity[],
    payrolls: PayrollRecordEntity[],
  ) {
    const buckets = new Map<string, DashboardPoint>();
    const ensure = (date: string) => {
      if (!buckets.has(date)) {
        buckets.set(date, {
          date,
          sales: 0,
          purchases: 0,
          operatingExpenses: 0,
          miscellaneousExpenses: 0,
          payroll: 0,
          netAfterPurchases: 0,
        });
      }

      return buckets.get(date)!;
    };

    for (const date of this.eachDate(range)) ensure(date);
    dailySales.forEach((sale) => {
      ensure(sale.salesDate).sales += Number(sale.netSalesAmount ?? 0);
    });
    invoices.forEach((invoice) => {
      ensure(invoice.invoiceDate).purchases += Number(invoice.totalAmount ?? 0);
    });
    expenses.forEach((expense) => {
      const bucket = ensure(expense.expenseDate);
      if (expense.isFixed || expense.expenseCategory?.isFixed) bucket.operatingExpenses += Number(expense.amount ?? 0);
      else bucket.miscellaneousExpenses += Number(expense.amount ?? 0);
    });
    payrolls.forEach((payroll) => {
      ensure(`${payroll.payrollYear}-${String(payroll.payrollMonth).padStart(2, '0')}-01`).payroll += Number(payroll.netSalary ?? 0);
    });

    return [...buckets.values()]
      .sort((first, second) => first.date.localeCompare(second.date))
      .map((point) => ({
        ...point,
        sales: this.round(point.sales),
        purchases: this.round(point.purchases),
        operatingExpenses: this.round(point.operatingExpenses),
        miscellaneousExpenses: this.round(point.miscellaneousExpenses),
        payroll: this.round(point.payroll),
        netAfterPurchases: this.round(
          point.sales - point.purchases - point.operatingExpenses - point.miscellaneousExpenses - point.payroll,
        ),
      }));
  }

  private buildBranchComparison(
    branches: BranchEntity[],
    dailySales: DailySaleEntity[],
    expenses: ExpenseEntity[],
    invoices: PurchaseInvoiceEntity[],
    payrolls: PayrollRecordEntity[],
  ): DashboardBranchComparison[] {
    return branches
      .map((branch) => {
        const branchSales = dailySales.filter((sale) => sale.branchId === branch.id);
        const branchExpenses = expenses.filter((expense) => expense.branchId === branch.id);
        const branchInvoices = invoices.filter((invoice) => invoice.branchId === branch.id);
        const branchPayrolls = payrolls.filter((payroll) => payroll.employee?.defaultBranchId === branch.id);
        const totals = this.calculateTotals(branchSales, branchExpenses, branchInvoices, branchPayrolls);

        return {
          branchId: branch.id,
          branchName: branch.name,
          sales: this.round(totals.sales),
          netAfterPurchases: this.round(
            totals.sales - totals.purchases - totals.operatingExpenses - totals.miscellaneousExpenses - totals.payroll,
          ),
        };
      })
      .filter((branch) => branch.sales !== 0 || branch.netAfterPurchases !== 0);
  }

  private metric(key: DashboardMetricKey, label: string, value: number, previousValue: number): DashboardMetric {
    const roundedValue = this.round(value);
    const roundedPreviousValue = this.round(previousValue);
    const changeAmount = this.round(roundedValue - roundedPreviousValue);

    return {
      key,
      label,
      value: roundedValue,
      previousValue: roundedPreviousValue,
      changeAmount,
      changePercent: roundedPreviousValue === 0 ? null : this.round((changeAmount / Math.abs(roundedPreviousValue)) * 100),
      type: 'money',
    };
  }

  private resolveRange(filters: DashboardFilters): Range {
    if (filters.dateFrom && filters.dateTo) return { dateFrom: filters.dateFrom, dateTo: filters.dateTo };

    const today = new Date();
    const period = filters.period ?? 'this_month';
    const start = new Date(today);
    const end = new Date(today);

    if (period === 'today') {
      return { dateFrom: this.toDateKey(today), dateTo: this.toDateKey(today) };
    }

    if (period === 'this_week') {
      const day = today.getDay() || 7;
      start.setDate(today.getDate() - day + 1);
      return { dateFrom: this.toDateKey(start), dateTo: this.toDateKey(end) };
    }

    if (period === 'this_year') {
      start.setMonth(0, 1);
      return { dateFrom: this.toDateKey(start), dateTo: this.toDateKey(end) };
    }

    start.setDate(1);
    return { dateFrom: this.toDateKey(start), dateTo: this.toDateKey(end) };
  }

  private previousEquivalentRange(range: Range): Range {
    const start = new Date(`${range.dateFrom}T00:00:00.000Z`);
    const end = new Date(`${range.dateTo}T00:00:00.000Z`);
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
    const previousEnd = new Date(start);
    previousEnd.setUTCDate(start.getUTCDate() - 1);
    const previousStart = new Date(previousEnd);
    previousStart.setUTCDate(previousEnd.getUTCDate() - days + 1);

    return { dateFrom: this.toDateKey(previousStart), dateTo: this.toDateKey(previousEnd) };
  }

  private eachDate(range: Range) {
    const dates: string[] = [];
    const cursor = new Date(`${range.dateFrom}T00:00:00.000Z`);
    const end = new Date(`${range.dateTo}T00:00:00.000Z`);

    while (cursor <= end) {
      dates.push(this.toDateKey(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return dates;
  }

  private toDateKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private async getCurrencySettings() {
    const settings = await this.settingsService.findAll();
    const financeGroup = settings.groups.find((group) => group.key === 'finance');
    const currencySymbolField = financeGroup?.fields.find((field) => field.key === 'currencySymbol');
    const decimalPlacesField = financeGroup?.fields.find((field) => field.key === 'decimalPlaces');
    const currencySymbol = String(currencySymbolField?.value ?? currencySymbolField?.defaultValue ?? 'ر.س').trim() || 'ر.س';
    const decimalPlaces = Number(decimalPlacesField?.value ?? decimalPlacesField?.defaultValue ?? 2);

    return { currencySymbol, decimalPlaces: Number.isFinite(decimalPlaces) ? decimalPlaces : 2 };
  }

  private formatMoney(value: number, settings: { currencySymbol: string; decimalPlaces: number }) {
    return `${new Intl.NumberFormat('ar', {
      minimumFractionDigits: settings.decimalPlaces,
      maximumFractionDigits: settings.decimalPlaces,
    }).format(value)} ${settings.currencySymbol}`;
  }

  private toCsv(dashboard: DashboardResult, settings: { currencySymbol: string; decimalPlaces: number }) {
    const escape = (value: string | number | null) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const metricRows = dashboard.metrics.map((metric) => [metric.label, this.formatMoney(metric.value, settings)].map(escape).join(','));
    const invoiceRows = dashboard.openInvoices.map((invoice) =>
      [
        invoice.invoiceNumber,
        invoice.supplierName,
        invoice.branchName,
        invoice.invoiceDate,
        invoice.dueDate ?? '',
        this.formatMoney(invoice.remainingAmount, settings),
        invoice.status,
      ]
        .map(escape)
        .join(','),
    );

    return `\uFEFF"المؤشر","القيمة"\n${metricRows.join('\n')}\n\n"الفاتورة","المورد","الفرع","التاريخ","الاستحقاق","المتبقي","الحالة"\n${invoiceRows.join('\n')}`;
  }

  private toPrintableHtml(dashboard: DashboardResult, settings: { currencySymbol: string; decimalPlaces: number }) {
    const escape = (value: unknown) =>
      String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8" />
<title>لوحة الإدارة</title>
<style>body{font-family:Arial,Tahoma,sans-serif;margin:24px;color:#17212b}table{width:100%;border-collapse:collapse;font-size:12px;margin-top:14px}th,td{border:1px solid #d9e0e7;padding:8px;text-align:right}th{background:#f4f7fb}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.card{border:1px solid #d9e0e7;border-radius:8px;padding:12px}.card span{display:block;color:#667085;font-size:12px}.card strong{font-size:18px}</style>
</head><body><h1>لوحة الإدارة</h1><p>${escape(dashboard.filters.dateFrom)} - ${escape(dashboard.filters.dateTo)}</p>
<section class="cards">${dashboard.metrics.map((metric) => `<div class="card"><span>${escape(metric.label)}</span><strong>${escape(this.formatMoney(metric.value, settings))}</strong></div>`).join('')}</section>
<h2>الفواتير المفتوحة</h2><table><thead><tr><th>الفاتورة</th><th>المورد</th><th>الفرع</th><th>التاريخ</th><th>الاستحقاق</th><th>المتبقي</th><th>الحالة</th></tr></thead>
<tbody>${dashboard.openInvoices.map((invoice) => `<tr><td>${escape(invoice.invoiceNumber)}</td><td>${escape(invoice.supplierName)}</td><td>${escape(invoice.branchName)}</td><td>${escape(invoice.invoiceDate)}</td><td>${escape(invoice.dueDate ?? '')}</td><td>${escape(this.formatMoney(invoice.remainingAmount, settings))}</td><td>${escape(invoice.status)}</td></tr>`).join('')}</tbody></table>
</body></html>`;
  }

  private round(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
