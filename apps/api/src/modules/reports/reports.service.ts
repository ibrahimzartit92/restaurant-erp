import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import { BankAccountTransactionEntity } from '../bank-account-transactions/entities/bank-account-transaction.entity';
import { BranchEntity } from '../branches/entities/branch.entity';
import { DailySaleEntity } from '../daily-sales/entities/daily-sale.entity';
import { DrawerDailySessionEntity } from '../drawer-daily-sessions/entities/drawer-daily-session.entity';
import { EmployeeAdvanceEntity } from '../employee-advances/entities/employee-advance.entity';
import { EmployeePenaltyEntity } from '../employee-penalties/entities/employee-penalty.entity';
import { ExpenseEntity } from '../expenses/entities/expense.entity';
import { PayrollRecordEntity } from '../payroll/entities/payroll-record.entity';
import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';
import { ItemCategoryEntity } from '../item-categories/entities/item-category.entity';
import { SettingsService } from '../settings/settings.service';
import { ReportExportService } from './report-export.service';
import { StockCountEntity } from '../stock-counts/entities/stock-count.entity';
import { SupplierPaymentEntity } from '../supplier-payments/entities/supplier-payment.entity';
import { TransferEntity } from '../transfers/entities/transfer.entity';
import { WholesaleSalesService } from '../wholesale-sales/wholesale-sales.service';
import { ReportColumn, ReportFilters, ReportKey, ReportResult, ReportRow, ReportSummary } from './reports.types';

type ReportBuilder = (filters: ReportFilters) => Promise<ReportResult>;
type BuiltReportKey = Exclude<ReportKey, 'dashboard'>;

@Injectable()
export class ReportsService {
  private readonly builders: Record<BuiltReportKey, ReportBuilder> = {
    'daily-sales': (filters) => this.dailySales(filters),
    expenses: (filters) => this.expenses(filters),
    purchases: (filters) => this.purchases(filters),
    'supplier-statement': (filters) => this.supplierStatement(filters),
    'supplier-payments': (filters) => this.supplierPayments(filters),
    drawer: (filters) => this.drawer(filters),
    'bank-transactions': (filters) => this.bankTransactions(filters),
    'branch-transfers': (filters) => this.branchTransfers(filters),
    'stock-counts': (filters) => this.stockCounts(filters),
    payroll: (filters) => this.payroll(filters),
    'advances-penalties': (filters) => this.advancesPenalties(filters),
  };

  constructor(
    @InjectRepository(DailySaleEntity)
    private readonly dailySalesRepository: Repository<DailySaleEntity>,
    @InjectRepository(BranchEntity)
    private readonly branchesRepository: Repository<BranchEntity>,
    @InjectRepository(ExpenseEntity)
    private readonly expensesRepository: Repository<ExpenseEntity>,
    @InjectRepository(PurchaseInvoiceEntity)
    private readonly purchaseInvoicesRepository: Repository<PurchaseInvoiceEntity>,
    @InjectRepository(ItemCategoryEntity)
    private readonly itemCategoriesRepository: Repository<ItemCategoryEntity>,
    @InjectRepository(SupplierPaymentEntity)
    private readonly supplierPaymentsRepository: Repository<SupplierPaymentEntity>,
    @InjectRepository(DrawerDailySessionEntity)
    private readonly drawerSessionsRepository: Repository<DrawerDailySessionEntity>,
    @InjectRepository(BankAccountTransactionEntity)
    private readonly bankTransactionsRepository: Repository<BankAccountTransactionEntity>,
    @InjectRepository(TransferEntity)
    private readonly transfersRepository: Repository<TransferEntity>,
    @InjectRepository(StockCountEntity)
    private readonly stockCountsRepository: Repository<StockCountEntity>,
    @InjectRepository(PayrollRecordEntity)
    private readonly payrollRepository: Repository<PayrollRecordEntity>,
    @InjectRepository(EmployeeAdvanceEntity)
    private readonly advancesRepository: Repository<EmployeeAdvanceEntity>,
    @InjectRepository(EmployeePenaltyEntity)
    private readonly penaltiesRepository: Repository<EmployeePenaltyEntity>,
    private readonly settingsService: SettingsService,
    private readonly reportExportService: ReportExportService,
    private readonly wholesaleSalesService: WholesaleSalesService,
  ) {}

  getCatalog() {
    return [
      { key: 'daily-sales', title: 'تقرير المبيعات اليومية', description: 'ملخص مبيعات الفروع حسب التاريخ وطريقة التحصيل.' },
      { key: 'expenses', title: 'تقرير المصاريف', description: 'تحليل المصاريف حسب الفرع والتصنيف وطريقة الدفع.' },
      { key: 'purchases', title: 'تقرير المشتريات', description: 'فواتير الشراء والمدفوع والمتبقي حسب المورد والحالة.' },
      { key: 'supplier-statement', title: 'كشف حساب المورد', description: 'رصيد المورد من الفواتير والدفعات والحركات.' },
      { key: 'supplier-payments', title: 'تقرير دفعات الموردين', description: 'دفعات الموردين النقدية والبنكية مع المراجع.' },
      { key: 'drawer', title: 'تقرير الدرج / الخزنة', description: 'جلسات الدرج وحركات النقد والفروقات.' },
      { key: 'bank-transactions', title: 'تقرير الحركات البنكية', description: 'حركات الحسابات البنكية الواردة والصادرة.' },
      { key: 'branch-transfers', title: 'تقرير التحويل بين الفروع', description: 'تحويلات المواد بين الفروع والتكلفة.' },
      { key: 'stock-counts', title: 'تقرير الجرد', description: 'نتائج الجرد وفروقات الكميات والتكلفة.' },
      { key: 'payroll', title: 'تقرير الرواتب', description: 'رواتب الموظفين والاستقطاعات وصافي الرواتب.' },
      { key: 'advances-penalties', title: 'تقرير السلف والعقوبات', description: 'سلف وعقوبات الموظفين المرتبطة بالرواتب.' },
    ];
  }

  async getReport(key: string, filters: ReportFilters) {
    const builder = this.builders[key as BuiltReportKey];

    if (!builder) {
      throw new NotFoundException('Report was not found.');
    }

    return builder(this.cleanFilters(filters));
  }

  async exportReport(key: string, filters: ReportFilters, format: 'excel' | 'pdf') {
    const report = await this.getReport(key, filters);
    const currencySettings = await this.getCurrencySettings();
    return this.reportExportService.exportReport(report, format, currencySettings);
  }

  private cleanFilters(filters: ReportFilters): ReportFilters {
    return Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''),
    ) as ReportFilters;
  }

  private baseResult(
    key: ReportKey,
    title: string,
    description: string,
    filters: ReportFilters,
    columns: ReportColumn[],
    rows: ReportRow[],
    summaries: ReportSummary[],
  ): ReportResult {
    return {
      key,
      title,
      description,
      generatedAt: new Date().toISOString(),
      filters,
      summaries,
      columns,
      rows,
    };
  }

  private applyDateRange<T extends ObjectLiteral>(query: SelectQueryBuilder<T>, column: string, filters: ReportFilters) {
    if (filters.dateFrom) {
      query.andWhere(`${column} >= :dateFrom`, { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      query.andWhere(`${column} <= :dateTo`, { dateTo: filters.dateTo });
    }
  }

  private sum(rows: ReportRow[], key: string) {
    return rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
  }

  private moneySummary(key: string, label: string, value: number): ReportSummary {
    return { key, label, value: this.round(value), type: 'money' };
  }

  private numberSummary(key: string, label: string, value: number): ReportSummary {
    return { key, label, value, type: 'number' };
  }

  private async buildFilterSummary(filters: ReportFilters, extras: { label: string; value: string }[] = []) {
    const branch = filters.branchId ? await this.branchesRepository.findOne({ where: { id: filters.branchId } }) : null;
    const itemCategory = filters.categoryId
      ? await this.itemCategoriesRepository.findOne({ where: { id: filters.categoryId } })
      : null;

    return [
      { label: 'الفرع', value: branch?.name ?? 'كل الفروع' },
      { label: 'من تاريخ', value: filters.dateFrom ?? 'غير محدد' },
      { label: 'إلى تاريخ', value: filters.dateTo ?? 'غير محدد' },
      ...extras,
      ...(filters.categoryId ? [{ label: 'تصنيف المادة', value: itemCategory?.name ?? filters.categoryId }] : []),
      ...(filters.search ? [{ label: 'بحث', value: filters.search }] : []),
      { label: 'تاريخ التصدير', value: new Date().toLocaleString('ar') },
    ];
  }

  private round(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private async getCurrencySettings() {
    const settings = await this.settingsService.findAll();
    const financeGroup = settings.groups.find((group) => group.key === 'finance');
    const currencySymbolField = financeGroup?.fields.find((field) => field.key === 'currencySymbol');
    const decimalPlacesField = financeGroup?.fields.find((field) => field.key === 'decimalPlaces');
    const currencySymbol =
      String(currencySymbolField?.value ?? currencySymbolField?.defaultValue ?? 'ر.س').trim() || 'ر.س';
    const decimalPlaces = Number(decimalPlacesField?.value ?? decimalPlacesField?.defaultValue ?? 2);

    return {
      currencySymbol,
      decimalPlaces: Number.isFinite(decimalPlaces) ? decimalPlaces : 2,
    };
  }

  private formatMoneyForExport(
    value: string | number | null,
    currencySettings: { currencySymbol: string; decimalPlaces: number },
  ) {
    const numericValue = Number(value ?? 0);
    const decimalPlaces = Math.min(Math.max(Math.trunc(currencySettings.decimalPlaces), 0), 4);
    const formattedValue = new Intl.NumberFormat('ar', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(Number.isFinite(numericValue) ? numericValue : 0);

    return `${formattedValue} ${currencySettings.currencySymbol}`.trim();
  }

  private async dailySales(filters: ReportFilters) {
    const query = this.dailySalesRepository
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.branch', 'branch')
      .orderBy('sale.salesDate', 'DESC');

    if (filters.branchId) query.andWhere('sale.branch_id = :branchId', { branchId: filters.branchId });
    this.applyDateRange(query, 'sale.sales_date', filters);

    const [sales, wholesaleCollectedSales, wholesaleReceivables] = await Promise.all([
      query.getMany(),
      this.wholesaleSalesService.getWholesaleCollectedSalesSummary({
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        branchId: filters.branchId,
      }),
      this.wholesaleSalesService.getWholesaleReceivablesSummary({ branchId: filters.branchId }),
    ]);
    const branchLabel = filters.branchId ? sales[0]?.branch?.name ?? '' : 'كل الفروع';
    const dailyRows = new Map<string, ReportRow>();

    for (const sale of sales) {
      const row = dailyRows.get(sale.salesDate) ?? {
        date: sale.salesDate,
        branch: branchLabel,
        cash: 0,
        bank: 0,
        delivery: 0,
        website: 0,
        tips: 0,
        returns: 0,
        regularNet: 0,
        wholesaleCollected: 0,
        net: 0,
        notes: '',
      };
      row.cash = this.round(Number(row.cash ?? 0) + Number(sale.cashSalesAmount ?? 0));
      row.bank = this.round(Number(row.bank ?? 0) + Number(sale.bankSalesAmount ?? 0));
      row.delivery = this.round(Number(row.delivery ?? 0) + Number(sale.deliverySalesAmount ?? 0));
      row.website = this.round(Number(row.website ?? 0) + Number(sale.websiteSalesAmount ?? 0));
      row.tips = this.round(Number(row.tips ?? 0) + Number(sale.tipsAmount ?? 0));
      row.returns = this.round(Number(row.returns ?? 0) + Number(sale.salesReturnAmount ?? 0));
      row.regularNet = this.round(Number(row.regularNet ?? 0) + Number(sale.netSalesAmount ?? 0));
      row.net = this.round(Number(row.regularNet ?? 0) + Number(row.wholesaleCollected ?? 0));
      row.notes = [row.notes, sale.notes].filter(Boolean).join(' / ');
      dailyRows.set(sale.salesDate, row);
    }

    for (const wholesaleRow of wholesaleCollectedSales.rows) {
      const row = dailyRows.get(wholesaleRow.date) ?? {
        date: wholesaleRow.date,
        branch: branchLabel,
        cash: 0,
        bank: 0,
        delivery: 0,
        website: 0,
        tips: 0,
        returns: 0,
        regularNet: 0,
        wholesaleCollected: 0,
        net: 0,
        notes: '',
      };
      row.wholesaleCollected = this.round(Number(row.wholesaleCollected ?? 0) + Number(wholesaleRow.amount ?? 0));
      row.net = this.round(Number(row.regularNet ?? 0) + Number(row.wholesaleCollected ?? 0));
      dailyRows.set(wholesaleRow.date, row);
    }

    const rows = [...dailyRows.values()].sort((first, second) => String(first.date).localeCompare(String(second.date)));

    const report = this.baseResult(
      'daily-sales',
      'تقرير المبيعات اليومية',
      'ملخص يومي للمبيعات حسب قنوات التحصيل ضمن الفلاتر المختارة.',
      filters,
      [
        { key: 'date', label: 'التاريخ', type: 'date' },
        { key: 'branch', label: 'الفرع' },
        { key: 'cash', label: 'مبيعات نقدية', type: 'money' },
        { key: 'bank', label: 'مبيعات بنكية', type: 'money' },
        { key: 'delivery', label: 'مبيعات التوصيل', type: 'money' },
        { key: 'website', label: 'مبيعات الموقع', type: 'money' },
        { key: 'tips', label: 'إكراميات', type: 'money' },
        { key: 'returns', label: 'مرتجعات', type: 'money' },
        { key: 'regularNet', label: 'صافي المبيعات اليومية', type: 'money' },
        { key: 'wholesaleCollected', label: 'مبيعات الجملة المحصلة', type: 'money' },
        { key: 'net', label: 'إجمالي المبيعات', type: 'money' },
        { key: 'notes', label: 'ملاحظات' },
      ],
      rows,
      [
        this.numberSummary('count', 'عدد الأيام', rows.length),
        this.moneySummary('cash', 'إجمالي النقدي', this.sum(rows, 'cash')),
        this.moneySummary('bank', 'إجمالي البنكي', this.sum(rows, 'bank')),
        this.moneySummary('regularNet', 'إجمالي المبيعات اليومية', this.sum(rows, 'regularNet')),
        this.moneySummary('wholesaleCollected', 'إجمالي مبيعات الجملة المحصلة', this.sum(rows, 'wholesaleCollected')),
        this.moneySummary('net', 'إجمالي المبيعات', this.sum(rows, 'net')),
        this.moneySummary('wholesaleReceivables', 'ذمم عملاء الجملة', wholesaleReceivables.total),
      ],
    );
    report.filterSummary = await this.buildFilterSummary(filters);
    return report;
  }

  private async expenses(filters: ReportFilters) {
    const query = this.expensesRepository
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.branch', 'branch')
      .leftJoinAndSelect('expense.expenseCategory', 'category')
      .orderBy('expense.expenseDate', 'DESC');

    if (filters.branchId) query.andWhere('expense.branch_id = :branchId', { branchId: filters.branchId });
    if (filters.categoryId) query.andWhere('expense.expense_category_id = :categoryId', { categoryId: filters.categoryId });
    if (filters.paymentMethod) query.andWhere('expense.payment_method = :paymentMethod', { paymentMethod: filters.paymentMethod });
    if (filters.search) {
      query.andWhere('(expense.expense_number ILIKE :search OR expense.title ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }
    this.applyDateRange(query, 'expense.expense_date', filters);

    const expenses = await query.getMany();
    const branchLabel = filters.branchId ? expenses[0]?.branch?.name ?? '' : 'كل الفروع';
    const dailyRows = new Map<string, ReportRow>();

    for (const expense of expenses) {
      const row = dailyRows.get(expense.expenseDate) ?? {
        date: expense.expenseDate,
        branch: branchLabel,
        operating: 0,
        miscellaneous: 0,
        cash: 0,
        bank: 0,
        other: 0,
        total: 0,
        count: 0,
        notes: '',
      };
      const amount = Number(expense.amount ?? 0);
      const isOperating = Boolean(expense.isFixed || expense.expenseCategory?.isFixed);
      row.operating = this.round(Number(row.operating ?? 0) + (isOperating ? amount : 0));
      row.miscellaneous = this.round(Number(row.miscellaneous ?? 0) + (isOperating ? 0 : amount));
      row.cash = this.round(Number(row.cash ?? 0) + (expense.paymentMethod === 'cash' ? amount : 0));
      row.bank = this.round(Number(row.bank ?? 0) + (expense.paymentMethod === 'bank' ? amount : 0));
      row.other = this.round(Number(row.other ?? 0) + (!['cash', 'bank'].includes(expense.paymentMethod) ? amount : 0));
      row.total = this.round(Number(row.total ?? 0) + amount);
      row.count = Number(row.count ?? 0) + 1;
      row.notes = [row.notes, expense.title].filter(Boolean).join(' / ');
      dailyRows.set(expense.expenseDate, row);
    }

    const rows = [...dailyRows.values()].sort((first, second) => String(first.date).localeCompare(String(second.date)));

    const report = this.baseResult(
      'expenses',
      'تقرير المصاريف',
      'ملخص يومي للمصاريف حسب التصنيف وطريقة الدفع ضمن الفلاتر المختارة.',
      filters,
      [
        { key: 'date', label: 'التاريخ', type: 'date' },
        { key: 'branch', label: 'الفرع' },
        { key: 'operating', label: 'مصروفات تشغيلية', type: 'money' },
        { key: 'miscellaneous', label: 'مصروفات متفرقة', type: 'money' },
        { key: 'cash', label: 'نقدي', type: 'money' },
        { key: 'bank', label: 'بنكي', type: 'money' },
        { key: 'other', label: 'أخرى', type: 'money' },
        { key: 'total', label: 'إجمالي المصاريف', type: 'money' },
        { key: 'count', label: 'عدد الحركات', type: 'number' },
        { key: 'notes', label: 'تفاصيل مختصرة' },
      ],
      rows,
      [
        this.numberSummary('count', 'عدد الأيام', rows.length),
        this.moneySummary('operating', 'إجمالي التشغيلية', this.sum(rows, 'operating')),
        this.moneySummary('miscellaneous', 'إجمالي المتفرقة', this.sum(rows, 'miscellaneous')),
        this.moneySummary('total', 'إجمالي المصاريف', this.sum(rows, 'total')),
      ],
    );
    report.filterSummary = await this.buildFilterSummary(filters, [
      ...(filters.categoryId ? [{ label: 'التصنيف', value: filters.categoryId }] : []),
      ...(filters.paymentMethod ? [{ label: 'طريقة الدفع', value: filters.paymentMethod }] : []),
    ]);
    return report;
  }

  private async purchases(filters: ReportFilters) {
    const query = this.purchaseInvoicesRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.branch', 'branch')
      .leftJoinAndSelect('invoice.supplier', 'supplier')
      .leftJoinAndSelect('invoice.items', 'invoiceItem')
      .leftJoinAndSelect('invoiceItem.item', 'item')
      .leftJoinAndSelect('item.category', 'itemCategory')
      .orderBy('invoice.invoiceDate', 'DESC');

    if (filters.branchId) query.andWhere('invoice.branch_id = :branchId', { branchId: filters.branchId });
    if (filters.supplierId) query.andWhere('invoice.supplier_id = :supplierId', { supplierId: filters.supplierId });
    if (filters.status) query.andWhere('invoice.status = :status', { status: filters.status });
    if (filters.categoryId) query.andWhere('item.category_id = :categoryId', { categoryId: filters.categoryId });
    if (filters.search) {
      query.andWhere('(invoice.invoice_number ILIKE :search OR invoice.invoice_label ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }
    this.applyDateRange(query, 'invoice.invoice_date', filters);

    const invoices = await query.getMany();
    const rows = invoices.flatMap((invoice) => {
      const relevantItems = filters.categoryId
        ? (invoice.items ?? []).filter((line) => line.item?.categoryId === filters.categoryId)
        : invoice.items ?? [];

      if (filters.categoryId) {
        return relevantItems.map((line) => ({
          number: invoice.invoiceNumber,
          date: invoice.invoiceDate,
          branch: invoice.branch?.name ?? '',
          supplier: invoice.supplier?.name ?? 'متفرقة',
          category: line.item?.category?.name ?? '',
          item: line.item?.name ?? '',
          quantity: line.quantity,
          status: invoice.status,
          total: line.lineTotal,
          paid: invoice.paidAmount,
          remaining: invoice.remainingAmount,
        }));
      }

      return [{
        number: invoice.invoiceNumber,
        date: invoice.invoiceDate,
        branch: invoice.branch?.name ?? '',
        supplier: invoice.supplier?.name ?? 'متفرقة',
        category: [...new Set((invoice.items ?? []).map((line) => line.item?.category?.name).filter(Boolean))].join(' / '),
        item: '',
        quantity: (invoice.items ?? []).reduce((sum, line) => sum + Number(line.quantity ?? 0), 0),
        status: invoice.status,
        total: invoice.totalAmount,
        paid: invoice.paidAmount,
        remaining: invoice.remainingAmount,
      }];
    });

    const report = this.baseResult(
      'purchases',
      'تقرير المشتريات',
      'فواتير الشراء والمدفوع والمتبقي.',
      filters,
      [
        { key: 'number', label: 'رقم الفاتورة' },
        { key: 'date', label: 'التاريخ', type: 'date' },
        { key: 'branch', label: 'الفرع' },
        { key: 'supplier', label: 'المورد' },
        { key: 'category', label: 'تصنيف المواد' },
        { key: 'item', label: 'المادة' },
        { key: 'quantity', label: 'الكمية', type: 'number' },
        { key: 'status', label: 'الحالة', type: 'status' },
        { key: 'total', label: 'الإجمالي', type: 'money' },
        { key: 'paid', label: 'المدفوع', type: 'money' },
        { key: 'remaining', label: 'المتبقي', type: 'money' },
      ],
      rows,
      [
        this.numberSummary('count', 'عدد الفواتير', rows.length),
        this.moneySummary('total', 'إجمالي المشتريات', this.sum(rows, 'total')),
        this.moneySummary('paid', 'إجمالي المدفوع', this.sum(rows, 'paid')),
        this.moneySummary('remaining', 'إجمالي المتبقي', this.sum(rows, 'remaining')),
      ],
    );
    report.filterSummary = await this.buildFilterSummary(filters, [
      ...(filters.supplierId ? [{ label: 'المورد', value: filters.supplierId }] : []),
      ...(filters.status ? [{ label: 'الحالة', value: filters.status }] : []),
    ]);
    return report;
  }

  private async supplierStatement(filters: ReportFilters) {
    if (!filters.supplierId) {
      throw new BadRequestException('supplierId is required for supplier statement report.');
    }

    const invoiceReport = await this.purchases(filters);
    const paymentReport = await this.supplierPayments(filters);
    const invoiceRows = invoiceReport.rows.map((row) => ({
      date: row.date,
      reference: row.number,
      type: 'فاتورة شراء',
      debit: row.total,
      credit: 0,
      balanceImpact: Number(row.total ?? 0),
    }));
    const paymentRows = paymentReport.rows.map((row) => ({
      date: row.date,
      reference: row.number,
      type: 'دفعة مورد',
      debit: 0,
      credit: row.amount,
      balanceImpact: -Number(row.amount ?? 0),
    }));
    let balance = 0;
    const rows = [...invoiceRows, ...paymentRows]
      .sort((first, second) => String(first.date).localeCompare(String(second.date)))
      .map((row) => {
        balance += row.balanceImpact;
        return { date: row.date, reference: row.reference, type: row.type, debit: row.debit, credit: row.credit, balance: this.round(balance) };
      });

    return this.baseResult(
      'supplier-statement',
      'كشف حساب المورد',
      'حركة المورد من الفواتير والدفعات والرصيد.',
      filters,
      [
        { key: 'date', label: 'التاريخ', type: 'date' },
        { key: 'reference', label: 'المرجع' },
        { key: 'type', label: 'نوع الحركة' },
        { key: 'debit', label: 'مدين', type: 'money' },
        { key: 'credit', label: 'دائن', type: 'money' },
        { key: 'balance', label: 'الرصيد', type: 'money' },
      ],
      rows,
      [
        this.moneySummary('debit', 'إجمالي الفواتير', this.sum(rows, 'debit')),
        this.moneySummary('credit', 'إجمالي الدفعات', this.sum(rows, 'credit')),
        this.moneySummary('balance', 'الرصيد الحالي', balance),
      ],
    );
  }

  private async supplierPayments(filters: ReportFilters) {
    const query = this.supplierPaymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.branch', 'branch')
      .leftJoinAndSelect('payment.purchaseInvoice', 'invoice')
      .leftJoinAndSelect('invoice.supplier', 'supplier')
      .orderBy('payment.paymentDate', 'DESC');

    if (filters.branchId) query.andWhere('payment.branch_id = :branchId', { branchId: filters.branchId });
    if (filters.supplierId) query.andWhere('invoice.supplier_id = :supplierId', { supplierId: filters.supplierId });
    if (filters.paymentMethod) query.andWhere('payment.payment_method = :paymentMethod', { paymentMethod: filters.paymentMethod });
    if (filters.search) {
      query.andWhere(
        '(payment.payment_number ILIKE :search OR payment.reference_number ILIKE :search OR invoice.invoice_number ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }
    this.applyDateRange(query, 'payment.payment_date', filters);

    const rows = (await query.getMany()).map((payment) => ({
      number: payment.paymentNumber,
      date: payment.paymentDate,
      branch: payment.branch?.name ?? '',
      supplier: payment.purchaseInvoice?.supplier?.name ?? 'متفرقة',
      invoice: payment.purchaseInvoice?.invoiceNumber ?? '',
      paymentMethod: payment.paymentMethod,
      reference: payment.referenceNumber ?? '',
      amount: payment.amount,
    }));

    return this.baseResult(
      'supplier-payments',
      'تقرير دفعات الموردين',
      'الدفعات المسجلة للموردين حسب طريقة الدفع.',
      filters,
      [
        { key: 'number', label: 'رقم الدفعة' },
        { key: 'date', label: 'التاريخ', type: 'date' },
        { key: 'branch', label: 'الفرع' },
        { key: 'supplier', label: 'المورد' },
        { key: 'invoice', label: 'الفاتورة' },
        { key: 'paymentMethod', label: 'طريقة الدفع', type: 'status' },
        { key: 'reference', label: 'المرجع' },
        { key: 'amount', label: 'المبلغ', type: 'money' },
      ],
      rows,
      [this.numberSummary('count', 'عدد الدفعات', rows.length), this.moneySummary('total', 'إجمالي الدفعات', this.sum(rows, 'amount'))],
    );
  }

  private async drawer(filters: ReportFilters) {
    const sessionsQuery = this.drawerSessionsRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.branch', 'branch')
      .leftJoinAndSelect('session.drawer', 'drawer')
      .orderBy('session.sessionDate', 'DESC');

    if (filters.branchId) sessionsQuery.andWhere('session.branch_id = :branchId', { branchId: filters.branchId });
    if (filters.status) sessionsQuery.andWhere('session.status = :status', { status: filters.status });
    this.applyDateRange(sessionsQuery, 'session.session_date', filters);

    const rows = (await sessionsQuery.getMany()).map((session) => ({
      date: session.sessionDate,
      branch: session.branch?.name ?? '',
      drawer: session.drawer?.name ?? '',
      status: session.status,
      opening: session.openingBalance,
      calculated: session.calculatedBalance,
      closing: session.closingBalance ?? 0,
      difference: session.differenceAmount,
    }));

    return this.baseResult(
      'drawer',
      'تقرير الدرج / الخزنة',
      'جلسات الدرج اليومية وأرصدة الإغلاق والفروقات.',
      filters,
      [
        { key: 'date', label: 'التاريخ', type: 'date' },
        { key: 'branch', label: 'الفرع' },
        { key: 'drawer', label: 'الدرج' },
        { key: 'status', label: 'الحالة', type: 'status' },
        { key: 'opening', label: 'افتتاحي', type: 'money' },
        { key: 'calculated', label: 'محسوب', type: 'money' },
        { key: 'closing', label: 'إغلاق', type: 'money' },
        { key: 'difference', label: 'الفرق', type: 'money' },
      ],
      rows,
      [
        this.numberSummary('count', 'عدد الجلسات', rows.length),
        this.moneySummary('opening', 'إجمالي الافتتاحي', this.sum(rows, 'opening')),
        this.moneySummary('closing', 'إجمالي الإغلاق', this.sum(rows, 'closing')),
        this.moneySummary('difference', 'إجمالي الفرق', this.sum(rows, 'difference')),
      ],
    );
  }

  private async bankTransactions(filters: ReportFilters) {
    const query = this.bankTransactionsRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.branch', 'branch')
      .leftJoinAndSelect('transaction.bankAccount', 'bankAccount')
      .orderBy('transaction.transactionDate', 'DESC');

    if (filters.branchId) query.andWhere('transaction.branch_id = :branchId', { branchId: filters.branchId });
    if (filters.status) query.andWhere('transaction.direction = :status', { status: filters.status });
    if (filters.paymentMethod) query.andWhere('transaction.transaction_type = :paymentMethod', { paymentMethod: filters.paymentMethod });
    this.applyDateRange(query, 'transaction.transaction_date', filters);

    const rows = (await query.getMany()).map((transaction) => ({
      date: transaction.transactionDate,
      branch: transaction.branch?.name ?? '',
      bankAccount: transaction.bankAccount?.name ?? '',
      type: transaction.transactionType,
      direction: transaction.direction,
      reference: transaction.referenceNumber ?? '',
      description: transaction.description,
      amount: Number(transaction.amount),
    }));

    return this.baseResult(
      'bank-transactions',
      'تقرير الحركات البنكية',
      'حركات الحسابات البنكية الواردة والصادرة.',
      filters,
      [
        { key: 'date', label: 'التاريخ', type: 'date' },
        { key: 'branch', label: 'الفرع' },
        { key: 'bankAccount', label: 'الحساب' },
        { key: 'type', label: 'النوع', type: 'status' },
        { key: 'direction', label: 'الاتجاه', type: 'status' },
        { key: 'reference', label: 'المرجع' },
        { key: 'description', label: 'الوصف' },
        { key: 'amount', label: 'المبلغ', type: 'money' },
      ],
      rows,
      [this.numberSummary('count', 'عدد الحركات', rows.length), this.moneySummary('total', 'إجمالي الحركات', this.sum(rows, 'amount'))],
    );
  }

  private async branchTransfers(filters: ReportFilters) {
    const query = this.transfersRepository
      .createQueryBuilder('transfer')
      .leftJoinAndSelect('transfer.fromBranch', 'fromBranch')
      .leftJoinAndSelect('transfer.toBranch', 'toBranch')
      .orderBy('transfer.transferDate', 'DESC');

    if (filters.branchId) {
      query.andWhere('(transfer.from_branch_id = :branchId OR transfer.to_branch_id = :branchId)', { branchId: filters.branchId });
    }
    if (filters.status) query.andWhere('transfer.status = :status', { status: filters.status });
    this.applyDateRange(query, 'transfer.transfer_date', filters);

    const rows = (await query.getMany()).map((transfer) => ({
      number: transfer.transferNumber,
      date: transfer.transferDate,
      fromBranch: transfer.fromBranch?.name ?? '',
      toBranch: transfer.toBranch?.name ?? '',
      status: transfer.status,
      lines: transfer.items?.length ?? 0,
      total: transfer.totalCostAmount,
    }));

    return this.baseResult(
      'branch-transfers',
      'تقرير التحويل بين الفروع',
      'تحويلات المواد بين الفروع وتكلفتها.',
      filters,
      [
        { key: 'number', label: 'رقم التحويل' },
        { key: 'date', label: 'التاريخ', type: 'date' },
        { key: 'fromBranch', label: 'من فرع' },
        { key: 'toBranch', label: 'إلى فرع' },
        { key: 'status', label: 'الحالة', type: 'status' },
        { key: 'lines', label: 'عدد المواد', type: 'number' },
        { key: 'total', label: 'التكلفة', type: 'money' },
      ],
      rows,
      [this.numberSummary('count', 'عدد التحويلات', rows.length), this.moneySummary('total', 'إجمالي التكلفة', this.sum(rows, 'total'))],
    );
  }

  private async stockCounts(filters: ReportFilters) {
    const query = this.stockCountsRepository
      .createQueryBuilder('count')
      .leftJoinAndSelect('count.branch', 'branch')
      .leftJoinAndSelect('count.warehouse', 'warehouse')
      .orderBy('count.countDate', 'DESC');

    if (filters.branchId) query.andWhere('count.branch_id = :branchId', { branchId: filters.branchId });
    if (filters.status) query.andWhere('count.status = :status', { status: filters.status });
    this.applyDateRange(query, 'count.count_date', filters);

    const rows = (await query.getMany()).map((count) => ({
      number: count.countNumber,
      date: count.countDate,
      branch: count.branch?.name ?? '',
      warehouse: count.warehouse?.name ?? '',
      status: count.status,
      lines: count.items?.length ?? 0,
      quantityDifference: this.round((count.items ?? []).reduce((sum, item) => sum + item.differenceQuantity, 0)),
      costDifference: this.round((count.items ?? []).reduce((sum, item) => sum + item.estimatedCostDifference, 0)),
    }));

    return this.baseResult(
      'stock-counts',
      'تقرير الجرد',
      'نتائج الجرد وفروقات الكمية والتكلفة.',
      filters,
      [
        { key: 'number', label: 'رقم الجرد' },
        { key: 'date', label: 'التاريخ', type: 'date' },
        { key: 'branch', label: 'الفرع' },
        { key: 'warehouse', label: 'المستودع' },
        { key: 'status', label: 'الحالة', type: 'status' },
        { key: 'lines', label: 'عدد المواد', type: 'number' },
        { key: 'quantityDifference', label: 'فرق الكمية', type: 'number' },
        { key: 'costDifference', label: 'فرق التكلفة', type: 'money' },
      ],
      rows,
      [
        this.numberSummary('count', 'عدد عمليات الجرد', rows.length),
        this.numberSummary('quantityDifference', 'إجمالي فرق الكمية', this.sum(rows, 'quantityDifference')),
        this.moneySummary('costDifference', 'إجمالي فرق التكلفة', this.sum(rows, 'costDifference')),
      ],
    );
  }

  private async payroll(filters: ReportFilters) {
    const query = this.payrollRepository
      .createQueryBuilder('payroll')
      .leftJoinAndSelect('payroll.employee', 'employee')
      .leftJoinAndSelect('employee.defaultBranch', 'branch')
      .orderBy('payroll.payrollYear', 'DESC')
      .addOrderBy('payroll.payrollMonth', 'DESC');

    if (filters.employeeId) query.andWhere('payroll.employee_id = :employeeId', { employeeId: filters.employeeId });
    if (filters.branchId) query.andWhere('employee.default_branch_id = :branchId', { branchId: filters.branchId });
    if (filters.dateFrom) query.andWhere("make_date(payroll.payroll_year, payroll.payroll_month, 1) >= :dateFrom", { dateFrom: filters.dateFrom });
    if (filters.dateTo) query.andWhere("make_date(payroll.payroll_year, payroll.payroll_month, 1) <= :dateTo", { dateTo: filters.dateTo });

    const rows = (await query.getMany()).map((payroll) => ({
      employee: payroll.employee?.fullName ?? '',
      branch: payroll.employee?.defaultBranch?.name ?? '',
      month: `${payroll.payrollYear}-${String(payroll.payrollMonth).padStart(2, '0')}`,
      baseSalary: payroll.baseSalary,
      allowances: payroll.allowancesAmount,
      advances: payroll.advancesDeductionAmount,
      penalties: payroll.penaltiesDeductionAmount,
      otherDeductions: payroll.otherDeductionAmount,
      netSalary: payroll.netSalary,
      paidAmount: payroll.paidAmount,
      remainingAmount: payroll.remainingAmount,
      paymentStatus: payroll.paymentStatus,
    }));

    return this.baseResult(
      'payroll',
      'تقرير الرواتب',
      'رواتب الموظفين والاستقطاعات وصافي الصرف.',
      filters,
      [
        { key: 'employee', label: 'الموظف' },
        { key: 'branch', label: 'الفرع' },
        { key: 'month', label: 'الشهر' },
        { key: 'baseSalary', label: 'الراتب الأساسي', type: 'money' },
        { key: 'allowances', label: 'البدلات', type: 'money' },
        { key: 'advances', label: 'السلف', type: 'money' },
        { key: 'penalties', label: 'العقوبات', type: 'money' },
        { key: 'otherDeductions', label: 'خصومات أخرى', type: 'money' },
        { key: 'netSalary', label: 'الصافي', type: 'money' },
        { key: 'paidAmount', label: 'المدفوع', type: 'money' },
        { key: 'remainingAmount', label: 'المتبقي', type: 'money' },
        { key: 'paymentStatus', label: 'حالة الدفع', type: 'status' },
      ],
      rows,
      [
        this.numberSummary('count', 'عدد الرواتب', rows.length),
        this.moneySummary('baseSalary', 'إجمالي الأساسي', this.sum(rows, 'baseSalary')),
        this.moneySummary('deductions', 'إجمالي الاستقطاعات', this.sum(rows, 'advances') + this.sum(rows, 'penalties') + this.sum(rows, 'otherDeductions')),
        this.moneySummary('netSalary', 'إجمالي الصافي', this.sum(rows, 'netSalary')),
        this.moneySummary('paidAmount', 'إجمالي المدفوع', this.sum(rows, 'paidAmount')),
        this.moneySummary('remainingAmount', 'إجمالي مستحقات الرواتب', this.sum(rows, 'remainingAmount')),
      ],
    );
  }

  private async advancesPenalties(filters: ReportFilters) {
    const advancesQuery = this.advancesRepository
      .createQueryBuilder('advance')
      .leftJoinAndSelect('advance.employee', 'employee')
      .leftJoinAndSelect('employee.defaultBranch', 'branch')
      .orderBy('advance.advanceDate', 'DESC');
    const penaltiesQuery = this.penaltiesRepository
      .createQueryBuilder('penalty')
      .leftJoinAndSelect('penalty.employee', 'employee')
      .leftJoinAndSelect('employee.defaultBranch', 'branch')
      .orderBy('penalty.penaltyDate', 'DESC');

    if (filters.employeeId) {
      advancesQuery.andWhere('advance.employee_id = :employeeId', { employeeId: filters.employeeId });
      penaltiesQuery.andWhere('penalty.employee_id = :employeeId', { employeeId: filters.employeeId });
    }
    if (filters.branchId) {
      advancesQuery.andWhere('employee.default_branch_id = :branchId', { branchId: filters.branchId });
      penaltiesQuery.andWhere('employee.default_branch_id = :branchId', { branchId: filters.branchId });
    }
    this.applyDateRange(advancesQuery, 'advance.advance_date', filters);
    this.applyDateRange(penaltiesQuery, 'penalty.penalty_date', filters);

    const advances = (await advancesQuery.getMany()).map((advance) => ({
      date: advance.advanceDate,
      employee: advance.employee?.fullName ?? '',
      branch: advance.employee?.defaultBranch?.name ?? '',
      type: 'سلفة',
      reason: '',
      payrollMonth: advance.payrollMonth && advance.payrollYear ? `${advance.payrollYear}-${String(advance.payrollMonth).padStart(2, '0')}` : '',
      amount: advance.amount,
    }));
    const penalties = (await penaltiesQuery.getMany()).map((penalty) => ({
      date: penalty.penaltyDate,
      employee: penalty.employee?.fullName ?? '',
      branch: penalty.employee?.defaultBranch?.name ?? '',
      type: 'عقوبة',
      reason: penalty.reason ?? '',
      payrollMonth: penalty.payrollMonth && penalty.payrollYear ? `${penalty.payrollYear}-${String(penalty.payrollMonth).padStart(2, '0')}` : '',
      amount: penalty.amount,
    }));
    const rows = [...advances, ...penalties].sort((first, second) => String(second.date).localeCompare(String(first.date)));

    return this.baseResult(
      'advances-penalties',
      'تقرير السلف والعقوبات',
      'سلف وعقوبات الموظفين وربطها بشهر الراتب.',
      filters,
      [
        { key: 'date', label: 'التاريخ', type: 'date' },
        { key: 'employee', label: 'الموظف' },
        { key: 'branch', label: 'الفرع' },
        { key: 'type', label: 'النوع' },
        { key: 'reason', label: 'السبب' },
        { key: 'payrollMonth', label: 'شهر الراتب' },
        { key: 'amount', label: 'المبلغ', type: 'money' },
      ],
      rows,
      [
        this.numberSummary('count', 'عدد الحركات', rows.length),
        this.moneySummary('advances', 'إجمالي السلف', advances.reduce((sum, row) => sum + row.amount, 0)),
        this.moneySummary('penalties', 'إجمالي العقوبات', penalties.reduce((sum, row) => sum + row.amount, 0)),
      ],
    );
  }

  private toCsv(report: ReportResult, currencySettings: { currencySymbol: string; decimalPlaces: number }) {
    const escape = (value: string | number | null) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const header = report.columns.map((column) => escape(column.label)).join(',');
    const rows = report.rows.map((row) =>
      report.columns
        .map((column) =>
          escape(column.type === 'money' ? this.formatMoneyForExport(row[column.key], currencySettings) : row[column.key]),
        )
        .join(','),
    );

    return `\uFEFF${header}\n${rows.join('\n')}`;
  }

  private toPrintableHtml(report: ReportResult, currencySettings: { currencySymbol: string; decimalPlaces: number }) {
    const escape = (value: unknown) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${escape(report.title)}</title>
  <style>
    body{font-family:Arial,Tahoma,sans-serif;margin:24px;color:#17212b}
    h1{margin:0 0 6px;font-size:24px} p{margin:0 0 18px;color:#667085}
    table{width:100%;border-collapse:collapse;font-size:12px} th,td{border:1px solid #d9e0e7;padding:8px;text-align:right}
    th{background:#f4f7fb} .summary{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}
    .summary div{border:1px solid #d9e0e7;border-radius:8px;padding:10px 14px}
    .summary span{display:block;color:#667085;font-size:12px}.summary strong{font-size:18px}
  </style>
</head>
<body>
  <h1>${escape(report.title)}</h1>
  <p>${escape(report.description)} - ${escape(new Date(report.generatedAt).toLocaleString('ar'))}</p>
  <section class="summary">${report.summaries.map((item) => `<div><span>${escape(item.label)}</span><strong>${escape(item.type === 'money' ? this.formatMoneyForExport(item.value, currencySettings) : item.value)}</strong></div>`).join('')}</section>
  <table>
    <thead><tr>${report.columns.map((column) => `<th>${escape(column.label)}</th>`).join('')}</tr></thead>
    <tbody>${report.rows.map((row) => `<tr>${report.columns.map((column) => `<td>${escape(column.type === 'money' ? this.formatMoneyForExport(row[column.key], currencySettings) : row[column.key])}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
</body>
</html>`;
  }
}
