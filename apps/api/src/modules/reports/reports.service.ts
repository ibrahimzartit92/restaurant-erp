import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import { BankAccountTransactionEntity } from '../bank-account-transactions/entities/bank-account-transaction.entity';
import { BranchEntity } from '../branches/entities/branch.entity';
import { DailySaleEntity } from '../daily-sales/entities/daily-sale.entity';
import { DrawerDailySessionEntity } from '../drawer-daily-sessions/entities/drawer-daily-session.entity';
import { DrawerTransactionEntity } from '../drawer-transactions/entities/drawer-transaction.entity';
import { EmployeeAdvanceEntity } from '../employee-advances/entities/employee-advance.entity';
import { EmployeeDebtEntity } from '../employee-financial-obligations/entities/employee-debt.entity';
import { EmployeePenaltyEntity } from '../employee-penalties/entities/employee-penalty.entity';
import { ExpenseEntity } from '../expenses/entities/expense.entity';
import { hasExpenseHierarchySchema } from '../expenses/expense-schema.guard';
import { PayrollRecordEntity } from '../payroll/entities/payroll-record.entity';
import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';
import { ItemCategoryEntity } from '../item-categories/entities/item-category.entity';
import { SettingsService } from '../settings/settings.service';
import { ReportExportService } from './report-export.service';
import { StockCountEntity } from '../stock-counts/entities/stock-count.entity';
import { SupplierPaymentEntity } from '../supplier-payments/entities/supplier-payment.entity';
import { TransferEntity } from '../transfers/entities/transfer.entity';
import { VaultTransactionEntity } from '../vaults/entities/vault-transaction.entity';
import { WholesaleSalesService } from '../wholesale-sales/wholesale-sales.service';
import { ReportColumn, ReportFilters, ReportKey, ReportLanguage, ReportResult, ReportRow, ReportSummary } from './reports.types';

type ReportBuilder = (filters: ReportFilters) => Promise<ReportResult>;
type BuiltReportKey = Exclude<ReportKey, 'dashboard'>;

const reportCatalog = [
  { key: 'comprehensive', title: 'التقرير الشامل', titleDe: 'Gesamtbericht', description: 'مؤشرات تشغيلية ومالية رئيسية في تقرير واحد.', descriptionDe: 'Zentrale betriebliche und finanzielle Kennzahlen in einem Bericht.' },
  { key: 'expenses', title: 'تقرير المصاريف', titleDe: 'Ausgabenbericht', description: 'تحليل المصاريف حسب الفترة والفرع وطريقة الدفع.', descriptionDe: 'Auswertung der Ausgaben nach Zeitraum, Filiale und Zahlungsart.' },
  { key: 'purchases', title: 'تقرير المشتريات', titleDe: 'Einkaufsbericht', description: 'فواتير الشراء والمدفوع والمتبقي حسب المورد والحالة.', descriptionDe: 'Einkaufsrechnungen, bezahlte und offene Beträge nach Lieferant und Status.' },
  { key: 'wholesale-sales', title: 'تقرير بيع الجملة', titleDe: 'Großhandelsumsatzbericht', description: 'فواتير بيع الجملة والتحصيل والذمم المفتوحة.', descriptionDe: 'Großhandelsrechnungen, Zahlungseingänge und offene Forderungen.' },
  { key: 'payroll', title: 'تقرير الرواتب', titleDe: 'Lohnbericht', description: 'رواتب الموظفين والاستقطاعات وصافي الصرف.', descriptionDe: 'Löhne, Abzüge und Nettoauszahlungen der Mitarbeiter.' },
  { key: 'financial-movements', title: 'تقرير الحركات المالية', titleDe: 'Finanzbewegungsbericht', description: 'حركات الدرج والخزنة والبنك الداخلة والخارجة.', descriptionDe: 'Ein- und Ausgänge in Kasse, Tresor und Bank.' },
  { key: 'employee-obligations', title: 'تقرير التزامات الموظفين', titleDe: 'Mitarbeiterverpflichtungsbericht', description: 'السلف والعهد والديون والعقوبات والمتبقي منها.', descriptionDe: 'Vorschüsse, Schulden, Strafen und offene Mitarbeiterverpflichtungen.' },
  { key: 'daily-sales', title: 'تقرير المبيعات اليومية', titleDe: 'Tagesumsatzbericht', description: 'ملخص مبيعات الفروع حسب التاريخ وطريقة التحصيل.', descriptionDe: 'Tagesumsätze der Filialen nach Datum und Zahlungsweg.' },
  { key: 'supplier-statement', title: 'كشف حساب المورد', titleDe: 'Lieferantenkontoauszug', description: 'رصيد المورد من الفواتير والدفعات والحركات.', descriptionDe: 'Lieferantensaldo aus Rechnungen, Zahlungen und Bewegungen.' },
  { key: 'supplier-payments', title: 'تقرير دفعات الموردين', titleDe: 'Lieferantenzahlungsbericht', description: 'دفعات الموردين النقدية والبنكية مع المراجع.', descriptionDe: 'Bar- und Bankzahlungen an Lieferanten mit Referenzen.' },
  { key: 'drawer', title: 'تقرير الدرج / الخزنة', titleDe: 'Kassenabschlussbericht', description: 'جلسات الدرج وأرصدة الإغلاق والفروقات.', descriptionDe: 'Kassensitzungen, Abschlussbestände und Differenzen.' },
  { key: 'bank-transactions', title: 'تقرير الحركات البنكية', titleDe: 'Bankbewegungsbericht', description: 'حركات الحسابات البنكية الواردة والصادرة.', descriptionDe: 'Ein- und ausgehende Bankbewegungen.' },
  { key: 'branch-transfers', title: 'تقرير التحويل بين الفروع', titleDe: 'Filialtransferbericht', description: 'تحويلات المواد بين الفروع والتكلفة.', descriptionDe: 'Warenbewegungen zwischen Filialen und deren Kosten.' },
  { key: 'stock-counts', title: 'تقرير الجرد', titleDe: 'Inventurbericht', description: 'نتائج الجرد وفروقات الكميات والتكلفة.', descriptionDe: 'Inventurergebnisse sowie Mengen- und Kostendifferenzen.' },
  { key: 'advances-penalties', title: 'تقرير السلف والعقوبات', titleDe: 'Vorschuss- und Strafbericht', description: 'سلف وعقوبات الموظفين المرتبطة بالرواتب.', descriptionDe: 'Mitarbeitervorschüsse und Strafen mit Lohnbezug.' },
] as const;

const labelTranslations: Record<string, { ar: string; de: string }> = {
  date: { ar: 'التاريخ', de: 'Datum' },
  branch: { ar: 'الفرع', de: 'Filiale' },
  count: { ar: 'العدد', de: 'Anzahl' },
  total: { ar: 'الإجمالي', de: 'Gesamt' },
  net: { ar: 'الصافي', de: 'Netto' },
  type: { ar: 'النوع', de: 'Art' },
  metric: { ar: 'المؤشر', de: 'Kennzahl' },
  status: { ar: 'الحالة', de: 'Status' },
  paymentStatus: { ar: 'حالة الدفع', de: 'Zahlungsstatus' },
  source: { ar: 'المصدر', de: 'Quelle' },
  account: { ar: 'الحساب', de: 'Konto' },
  reference: { ar: 'المرجع', de: 'Referenz' },
  description: { ar: 'الوصف', de: 'Beschreibung' },
  amount: { ar: 'المبلغ', de: 'Betrag' },
  direction: { ar: 'الاتجاه', de: 'Richtung' },
  number: { ar: 'الرقم', de: 'Nummer' },
  supplier: { ar: 'المورد', de: 'Lieferant' },
  customer: { ar: 'العميل', de: 'Kunde' },
  employee: { ar: 'الموظف', de: 'Mitarbeiter' },
  category: { ar: 'التصنيف', de: 'Kategorie' },
  item: { ar: 'المادة', de: 'Artikel' },
  quantity: { ar: 'الكمية', de: 'Menge' },
  paid: { ar: 'المدفوع', de: 'Bezahlt' },
  remaining: { ar: 'المتبقي', de: 'Offen' },
  cash: { ar: 'نقدي', de: 'Bar' },
  bank: { ar: 'بنكي', de: 'Bank' },
  vault: { ar: 'خزنة', de: 'Tresor' },
  drawer: { ar: 'درج', de: 'Kasse' },
  opening: { ar: 'افتتاحي', de: 'Anfangsbestand' },
  closing: { ar: 'إغلاق', de: 'Endbestand' },
  difference: { ar: 'الفرق', de: 'Differenz' },
  operationalSales: { ar: 'المبيعات التشغيلية', de: 'Betriebliche Umsätze' },
  wholesaleCollections: { ar: 'تحصيلات الجملة', de: 'Großhandelseingänge' },
  totalIncome: { ar: 'إجمالي الدخل', de: 'Gesamteinnahmen' },
  totalExpenses: { ar: 'إجمالي المصاريف', de: 'Gesamtausgaben' },
  totalPurchases: { ar: 'إجمالي المشتريات', de: 'Gesamteinkäufe' },
  totalPayroll: { ar: 'إجمالي الرواتب', de: 'Gesamtlohn' },
  estimatedProfit: { ar: 'الربح التقديري', de: 'Geschätzter Gewinn' },
  netCashMovement: { ar: 'صافي حركة النقد', de: 'Netto-Kassenbewegung' },
  netBankMovement: { ar: 'صافي حركة البنك', de: 'Netto-Bankbewegung' },
  openReceivables: { ar: 'الذمم المفتوحة', de: 'Offene Forderungen' },
  employeeObligations: { ar: 'التزامات الموظفين', de: 'Mitarbeiterverpflichtungen' },
};

const valueTranslations: Record<string, { ar: string; de: string }> = {
  draft: { ar: 'مسودة', de: 'Entwurf' },
  open: { ar: 'مفتوحة', de: 'Offen' },
  approved: { ar: 'معتمدة', de: 'Genehmigt' },
  partially_paid: { ar: 'مدفوعة جزئيا', de: 'Teilweise bezahlt' },
  paid: { ar: 'مدفوعة', de: 'Bezahlt' },
  unpaid: { ar: 'غير مدفوعة', de: 'Unbezahlt' },
  cancelled: { ar: 'ملغاة', de: 'Storniert' },
  closed: { ar: 'مغلقة', de: 'Geschlossen' },
  completed: { ar: 'مكتملة', de: 'Abgeschlossen' },
  active: { ar: 'نشطة', de: 'Aktiv' },
  settled: { ar: 'مسددة', de: 'Beglichen' },
  partially_recovered: { ar: 'مستردة جزئيا', de: 'Teilweise zurückgezahlt' },
  cash: { ar: 'نقدي', de: 'Bar' },
  bank: { ar: 'بنكي', de: 'Bank' },
  vault: { ar: 'خزنة', de: 'Tresor' },
  other: { ar: 'أخرى', de: 'Sonstige' },
  in: { ar: 'داخل', de: 'Eingang' },
  out: { ar: 'خارج', de: 'Ausgang' },
  incoming: { ar: 'داخل', de: 'Eingang' },
  outgoing: { ar: 'خارج', de: 'Ausgang' },
  deposit: { ar: 'إيداع', de: 'Einzahlung' },
  withdrawal: { ar: 'سحب', de: 'Auszahlung' },
  transfer: { ar: 'تحويل', de: 'Umbuchung' },
  settlement: { ar: 'تسوية', de: 'Abgleich' },
  expense_cash: { ar: 'مصروف نقدي', de: 'Barausgabe' },
  expense_bank: { ar: 'مصروف بنكي', de: 'Bankausgabe' },
  expense_payment: { ar: 'دفع مصروف', de: 'Ausgabenzahlung' },
  supplier_payment: { ar: 'دفعة مورد', de: 'Lieferantenzahlung' },
  supplier_payment_cash: { ar: 'دفعة مورد نقدية', de: 'Lieferantenzahlung bar' },
  supplier_payment_cash_reversal: { ar: 'عكس دفعة مورد نقدية', de: 'Gegenbuchung Lieferantenzahlung bar' },
  supplier_payment_bank: { ar: 'دفعة مورد بنكية', de: 'Lieferantenzahlung per Bank' },
  supplier_payment_bank_reversal: { ar: 'عكس دفعة مورد بنكية', de: 'Gegenbuchung Lieferantenzahlung per Bank' },
  payroll_payment: { ar: 'صرف راتب', de: 'Lohnzahlung' },
  payroll_payment_cash: { ar: 'صرف راتب نقدي', de: 'Lohnzahlung bar' },
  payroll_payment_bank: { ar: 'صرف راتب بنكي', de: 'Lohnzahlung per Bank' },
  employee_advance: { ar: 'سلفة موظف', de: 'Mitarbeitervorschuss' },
  employee_advance_cash: { ar: 'سلفة موظف نقدية', de: 'Mitarbeitervorschuss bar' },
  employee_advance_bank: { ar: 'سلفة موظف بنكية', de: 'Mitarbeitervorschuss per Bank' },
  employee_debt: { ar: 'دين موظف', de: 'Mitarbeiterschuld' },
  employee_debt_cash: { ar: 'دين موظف نقدي', de: 'Mitarbeiterschuld bar' },
  employee_debt_bank: { ar: 'دين موظف بنكي', de: 'Mitarbeiterschuld per Bank' },
  penalty: { ar: 'عقوبة', de: 'Strafe' },
  employee_obligation_repayment: { ar: 'سداد التزام موظف', de: 'Rückzahlung Mitarbeiterverpflichtung' },
  employee_obligation_repayment_cash: { ar: 'سداد التزام موظف نقدي', de: 'Rückzahlung Mitarbeiterverpflichtung bar' },
  employee_obligation_repayment_bank: { ar: 'سداد التزام موظف بنكي', de: 'Rückzahlung Mitarbeiterverpflichtung per Bank' },
  employee_obligation_reversal_cash: { ar: 'عكس التزام موظف نقدي', de: 'Gegenbuchung Mitarbeiterverpflichtung bar' },
  employee_obligation_reversal_bank: { ar: 'عكس التزام موظف بنكي', de: 'Gegenbuchung Mitarbeiterverpflichtung per Bank' },
  daily_cash_sales: { ar: 'مبيعات يومية نقدية', de: 'Tagesumsatz bar' },
  wholesale_sales_cash_collection: { ar: 'تحصيل بيع جملة نقدي', de: 'Großhandelseingang bar' },
  wholesale_sales_receipt_bank: { ar: 'تحصيل بيع جملة بنكي', de: 'Großhandelseingang Bank' },
  sales_receipt_bank: { ar: 'قبض مبيعات بنكي', de: 'Umsatzeingang Bank' },
  sales_return_cash: { ar: 'مرتجع نقدي', de: 'Barrückgabe' },
  expense_cash_reversal: { ar: 'عكس مصروف نقدي', de: 'Gegenbuchung Barausgabe' },
  expense_bank_reversal: { ar: 'عكس مصروف بنكي', de: 'Gegenbuchung Bankausgabe' },
  refund_bank: { ar: 'مرتجع بنكي', de: 'Bankrückgabe' },
  financial_reversal: { ar: 'عكس مالي', de: 'Finanzielle Gegenbuchung' },
  manual_deposit: { ar: 'إيداع يدوي', de: 'Manuelle Einzahlung' },
  manual_withdrawal: { ar: 'سحب يدوي', de: 'Manuelle Auszahlung' },
  admin_withdrawal: { ar: 'سحب إداري', de: 'Administrative Auszahlung' },
  deposit_from_drawer: { ar: 'إيداع من الدرج', de: 'Einzahlung aus Kasse' },
  deposit_from_bank: { ar: 'إيداع من البنك', de: 'Einzahlung von Bank' },
  deposit_from_vault: { ar: 'إيداع من الخزنة', de: 'Einzahlung aus Tresor' },
  withdrawal_to_bank: { ar: 'تحويل إلى البنك', de: 'Umbuchung zur Bank' },
  withdrawal_to_vault: { ar: 'تحويل إلى الخزنة', de: 'Umbuchung zum Tresor' },
  transfer_to_vault: { ar: 'تحويل إلى الخزنة', de: 'Umbuchung zum Tresor' },
};

@Injectable()
export class ReportsService {
  private readonly builders: Record<BuiltReportKey, ReportBuilder> = {
    comprehensive: (filters) => this.comprehensive(filters),
    'daily-sales': (filters) => this.dailySales(filters),
    expenses: (filters) => this.expenses(filters),
    purchases: (filters) => this.purchases(filters),
    'wholesale-sales': (filters) => this.wholesaleSales(filters),
    'supplier-statement': (filters) => this.supplierStatement(filters),
    'supplier-payments': (filters) => this.supplierPayments(filters),
    drawer: (filters) => this.drawer(filters),
    'bank-transactions': (filters) => this.bankTransactions(filters),
    'financial-movements': (filters) => this.financialMovements(filters),
    'branch-transfers': (filters) => this.branchTransfers(filters),
    'stock-counts': (filters) => this.stockCounts(filters),
    payroll: (filters) => this.payroll(filters),
    'employee-obligations': (filters) => this.employeeObligations(filters),
    'advances-penalties': (filters) => this.advancesPenalties(filters),
  };

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
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
    @InjectRepository(DrawerTransactionEntity)
    private readonly drawerTransactionsRepository: Repository<DrawerTransactionEntity>,
    @InjectRepository(BankAccountTransactionEntity)
    private readonly bankTransactionsRepository: Repository<BankAccountTransactionEntity>,
    @InjectRepository(VaultTransactionEntity)
    private readonly vaultTransactionsRepository: Repository<VaultTransactionEntity>,
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
    @InjectRepository(EmployeeDebtEntity)
    private readonly employeeDebtsRepository: Repository<EmployeeDebtEntity>,
    private readonly settingsService: SettingsService,
    private readonly reportExportService: ReportExportService,
    private readonly wholesaleSalesService: WholesaleSalesService,
  ) {}

  getCatalog() {
    return reportCatalog.map(({ key, title, description }) => ({ key, title, description }));

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

    const cleanedFilters = this.cleanFilters(filters);
    const report = await builder(cleanedFilters);
    return this.prepareReport(report, cleanedFilters);
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

  private prepareReport(report: ReportResult, filters: ReportFilters): ReportResult {
    const language = filters.language === 'de' ? 'de' : 'ar';
    const catalogItem = reportCatalog.find((item) => item.key === report.key);
    const localized: ReportResult = {
      ...report,
      language,
      title: language === 'de' ? catalogItem?.titleDe ?? report.title : catalogItem?.title ?? report.title,
      description:
        language === 'de' ? catalogItem?.descriptionDe ?? report.description : catalogItem?.description ?? report.description,
      filterSummary: this.localizedFilterSummary(report.filterSummary, language),
      availableSummaries: report.summaries.map((summary) => this.localizedSummary(summary, language)),
      availableColumns: report.columns.map((column) => this.localizedColumn(column, language)),
      summaries: report.summaries.map((summary) => this.localizedSummary(summary, language)),
      columns: report.columns.map((column) => this.localizedColumn(column, language)),
      rows: report.rows.map((row) => this.localizedRow(row, report.columns, language)),
    };

    return this.applySelectedFields(localized, filters);
  }

  private applySelectedFields(report: ReportResult, filters: ReportFilters): ReportResult {
    const selectedColumns = this.parseSelection(filters.columnKeys);
    const selectedSummaries = this.parseSelection(filters.summaryKeys);
    const columns = selectedColumns.size ? report.columns.filter((column) => selectedColumns.has(column.key)) : report.columns;
    const summaries = selectedSummaries.size
      ? report.summaries.filter((summary) => selectedSummaries.has(summary.key))
      : report.summaries;

    return {
      ...report,
      columns: columns.length ? columns : report.columns,
      summaries: summaries.length ? summaries : report.summaries,
    };
  }

  private parseSelection(value?: string) {
    return new Set(
      String(value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    );
  }

  private localizedColumn(column: ReportColumn, language: ReportLanguage): ReportColumn {
    return { ...column, label: this.translateLabel(column.key, column.label, language) };
  }

  private localizedSummary(summary: ReportSummary, language: ReportLanguage): ReportSummary {
    return { ...summary, label: this.translateLabel(summary.key, summary.label, language) };
  }

  private localizedFilterSummary(
    filterSummary: ReportResult['filterSummary'],
    language: ReportLanguage,
  ): ReportResult['filterSummary'] {
    const germanFallbackLabels = ['Filiale', 'Von Datum', 'Bis Datum'];
    return (filterSummary ?? []).map((item) => ({
      label:
        language === 'de'
          ? this.translateFreeLabel(item.label, language) === item.label
            ? germanFallbackLabels[(filterSummary ?? []).indexOf(item)] ?? 'Filter'
            : this.translateFreeLabel(item.label, language)
          : this.translateFreeLabel(item.label, language),
      value: this.translateReportValue(item.value, language),
    }));
  }

  private localizedRow(row: ReportRow, columns: ReportColumn[], language: ReportLanguage): ReportRow {
    return Object.fromEntries(
      Object.entries(row).map(([key, value]) => {
        const column = columns.find((item) => item.key === key);
        if (key === 'metric' && typeof value === 'string') {
          return [key, this.translateFreeLabel(value, language)];
        }
        if (typeof value === 'string' && (column?.type === 'status' || this.isEnumLike(value))) {
          return [key, this.translateReportValue(value, language)];
        }
        return [key, value];
      }),
    );
  }

  private translateLabel(key: string, fallback: string, language: ReportLanguage) {
    return labelTranslations[key]?.[language] ?? (language === 'de' ? this.translateFreeLabel(fallback, language) : fallback);
  }

  private translateFreeLabel(value: string, language: ReportLanguage) {
    if (language === 'ar') return value;

    const normalized = value.trim();
    const translated = Object.values(labelTranslations).find((entry) => entry.ar === normalized)?.de;
    return translated ?? normalized;
  }

  private translateReportValue(value: string, language: ReportLanguage) {
    const normalized = value.trim();
    return valueTranslations[normalized]?.[language] ?? normalized;
  }

  private isEnumLike(value: string) {
    return /^[a-z0-9_/-]+$/.test(value);
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

  private async comprehensive(filters: ReportFilters) {
    const [salesReport, expensesReport, purchasesReport, payrollReport, financialReport, obligationsReport] =
      await Promise.all([
        this.dailySales(filters),
        this.expenses(filters),
        this.purchases(filters),
        this.payroll(filters),
        this.financialMovements(filters),
        this.employeeObligations(filters),
      ]);
    const wholesaleCollections = Number(salesReport.summaries.find((summary) => summary.key === 'wholesaleCollected')?.value ?? 0);
    const operationalSales = Number(salesReport.summaries.find((summary) => summary.key === 'regularNet')?.value ?? 0);
    const totalIncome = operationalSales + wholesaleCollections;
    const totalExpenses = Number(expensesReport.summaries.find((summary) => summary.key === 'total')?.value ?? 0);
    const totalPurchases = Number(purchasesReport.summaries.find((summary) => summary.key === 'total')?.value ?? 0);
    const totalPayroll = Number(payrollReport.summaries.find((summary) => summary.key === 'netSalary')?.value ?? 0);
    const netCashMovement = Number(financialReport.summaries.find((summary) => summary.key === 'netCashMovement')?.value ?? 0);
    const netBankMovement = Number(financialReport.summaries.find((summary) => summary.key === 'netBankMovement')?.value ?? 0);
    const openReceivables = Number(salesReport.summaries.find((summary) => summary.key === 'wholesaleReceivables')?.value ?? 0);
    const employeeObligations = Number(obligationsReport.summaries.find((summary) => summary.key === 'remaining')?.value ?? 0);
    const summaries = [
      this.moneySummary('operationalSales', 'المبيعات التشغيلية', operationalSales),
      this.moneySummary('wholesaleCollections', 'تحصيلات الجملة', wholesaleCollections),
      this.moneySummary('totalIncome', 'إجمالي الدخل', totalIncome),
      this.moneySummary('totalExpenses', 'إجمالي المصاريف', totalExpenses),
      this.moneySummary('totalPurchases', 'إجمالي المشتريات', totalPurchases),
      this.moneySummary('totalPayroll', 'إجمالي الرواتب', totalPayroll),
      this.moneySummary('estimatedProfit', 'الربح التقديري', totalIncome - totalExpenses - totalPurchases - totalPayroll),
      this.moneySummary('netCashMovement', 'صافي حركة النقد', netCashMovement),
      this.moneySummary('netBankMovement', 'صافي حركة البنك', netBankMovement),
      this.moneySummary('openReceivables', 'الذمم المفتوحة', openReceivables),
      this.moneySummary('employeeObligations', 'التزامات الموظفين', employeeObligations),
    ];
    const rows = summaries.map((summary) => ({
      metric: summary.label,
      value: Number(summary.value ?? 0),
    }));
    const report = this.baseResult(
      'comprehensive',
      'التقرير الشامل',
      'ملخص مركزي لأهم مؤشرات التشغيل والمال ضمن الفترة المختارة.',
      filters,
      [
        { key: 'metric', label: 'المؤشر' },
        { key: 'value', label: 'القيمة', type: 'money' },
      ],
      rows,
      summaries,
    );
    report.filterSummary = await this.buildFilterSummary(filters);
    return report;
  }

  private async wholesaleSales(filters: ReportFilters) {
    const invoices = await this.wholesaleSalesService.findAll({
      branchId: filters.branchId,
      documentStatus: filters.status,
      paymentStatus: filters.paymentStatus,
      invoiceDateFrom: filters.dateFrom,
      invoiceDateTo: filters.dateTo,
      search: filters.search,
    });
    const rows = invoices.map((invoice) => ({
      number: invoice.invoiceNumber,
      date: invoice.invoiceDate,
      branch: invoice.branch?.name ?? '',
      customer: invoice.customer?.name ?? '',
      status: invoice.documentStatus,
      paymentStatus: invoice.paymentStatus,
      total: invoice.totalAmount,
      paid: invoice.paidAmount,
      remaining: invoice.remainingAmount,
    }));
    const report = this.baseResult(
      'wholesale-sales',
      'تقرير بيع الجملة',
      'فواتير بيع الجملة والتحصيل والذمم المفتوحة.',
      filters,
      [
        { key: 'number', label: 'رقم الفاتورة' },
        { key: 'date', label: 'التاريخ', type: 'date' },
        { key: 'branch', label: 'الفرع' },
        { key: 'customer', label: 'العميل' },
        { key: 'status', label: 'حالة المستند', type: 'status' },
        { key: 'paymentStatus', label: 'حالة الدفع', type: 'status' },
        { key: 'total', label: 'الإجمالي', type: 'money' },
        { key: 'paid', label: 'المحصل', type: 'money' },
        { key: 'remaining', label: 'المتبقي', type: 'money' },
      ],
      rows,
      [
        this.numberSummary('count', 'عدد الفواتير', rows.length),
        this.moneySummary('total', 'إجمالي بيع الجملة', this.sum(rows, 'total')),
        this.moneySummary('paid', 'إجمالي المحصل', this.sum(rows, 'paid')),
        this.moneySummary('remaining', 'إجمالي الذمم المفتوحة', this.sum(rows, 'remaining')),
      ],
    );
    report.filterSummary = await this.buildFilterSummary(filters);
    return report;
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
    if (!(await hasExpenseHierarchySchema(this.dataSource))) {
      return this.expensesLegacy(filters);
    }

    const query = this.expensesRepository
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.branch', 'branch')
      .leftJoinAndSelect('expense.expenseCategory', 'category')
      .leftJoinAndSelect('expense.expenseType', 'expenseType')
      .orderBy('expense.expenseDate', 'DESC');

    if (filters.branchId) query.andWhere('expense.branch_id = :branchId', { branchId: filters.branchId });
    if (filters.categoryId) query.andWhere('expense.expense_category_id = :categoryId', { categoryId: filters.categoryId });
    if (filters.expenseTypeId) query.andWhere('expense.expense_type_id = :expenseTypeId', { expenseTypeId: filters.expenseTypeId });
    if (filters.paymentMethod) query.andWhere('expense.payment_method = :paymentMethod', { paymentMethod: filters.paymentMethod });
    if (filters.paymentStatus) query.andWhere('expense.payment_status = :paymentStatus', { paymentStatus: filters.paymentStatus });
    if (filters.vaultId) {
      query.andWhere(
        "(expense.vault_id = :vaultId OR expense.payment_allocations @> jsonb_build_array(jsonb_build_object('vaultId', :vaultId::text)))",
        { vaultId: filters.vaultId },
      );
    }
    if (filters.bankAccountId) {
      query.andWhere(
        "(expense.bank_account_id = :bankAccountId OR expense.payment_allocations @> jsonb_build_array(jsonb_build_object('bankAccountId', :bankAccountId::text)))",
        { bankAccountId: filters.bankAccountId },
      );
    }
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
        vault: 0,
        other: 0,
        paid: 0,
        remaining: 0,
        total: 0,
        count: 0,
        notes: '',
      };
      const amount = Number(expense.amount ?? 0);
      const paidAmount = Number(expense.paidAmount ?? 0);
      const remainingAmount = Number(expense.remainingAmount ?? Math.max(amount - paidAmount, 0));
      const isOperating = Boolean(expense.isFixed || expense.expenseCategory?.isFixed);
      row.operating = this.round(Number(row.operating ?? 0) + (isOperating ? paidAmount : 0));
      row.miscellaneous = this.round(Number(row.miscellaneous ?? 0) + (isOperating ? 0 : paidAmount));
      row.cash = this.round(Number(row.cash ?? 0) + (expense.paymentMethod === 'cash' ? paidAmount : 0));
      row.bank = this.round(Number(row.bank ?? 0) + (expense.paymentMethod === 'bank' ? paidAmount : 0));
      row.vault = this.round(Number(row.vault ?? 0) + (expense.paymentMethod === 'vault' ? paidAmount : 0));
      row.other = this.round(Number(row.other ?? 0) + (!['cash', 'bank', 'vault'].includes(expense.paymentMethod) ? paidAmount : 0));
      row.paid = this.round(Number(row.paid ?? 0) + paidAmount);
      row.remaining = this.round(Number(row.remaining ?? 0) + remainingAmount);
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

  private async expensesLegacy(filters: ReportFilters) {
    const conditions: string[] = [];
    const parameters: unknown[] = [];
    const addParameter = (value: unknown) => {
      parameters.push(value);
      return `$${parameters.length}`;
    };

    if (filters.branchId) conditions.push(`expense.branch_id = ${addParameter(filters.branchId)}`);
    if (filters.categoryId) conditions.push(`expense.expense_category_id = ${addParameter(filters.categoryId)}`);
    if (filters.paymentMethod) conditions.push(`expense.payment_method = ${addParameter(filters.paymentMethod)}`);
    if (filters.dateFrom) conditions.push(`expense.expense_date >= ${addParameter(filters.dateFrom)}`);
    if (filters.dateTo) conditions.push(`expense.expense_date <= ${addParameter(filters.dateTo)}`);
    if (filters.search) {
      const searchParameter = addParameter(`%${filters.search}%`);
      conditions.push(`(expense.expense_number ILIKE ${searchParameter} OR expense.title ILIKE ${searchParameter})`);
    }

    const expenses = await this.dataSource.query(
      `
        SELECT
          expense.expense_date AS "expenseDate",
          expense.title,
          expense.amount,
          expense.payment_method AS "paymentMethod",
          expense.is_fixed AS "isFixed",
          COALESCE(category.is_fixed, false) AS "categoryIsFixed",
          COALESCE(
            (
              SELECT SUM(COALESCE((payment ->> 'amount')::numeric, 0))
              FROM jsonb_array_elements(COALESCE(expense.payment_allocations, '[]'::jsonb)) payment
            ),
            CASE WHEN expense.payment_method IN ('cash', 'bank', 'vault') THEN expense.amount ELSE 0 END
          ) AS "paidAmount"
        FROM expenses expense
        LEFT JOIN expense_categories category ON category.id = expense.expense_category_id
        ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
        ORDER BY expense.expense_date DESC
      `,
      parameters,
    );
    const dailyRows = new Map<string, ReportRow>();

    for (const expense of expenses) {
      const row = dailyRows.get(expense.expenseDate) ?? {
        date: expense.expenseDate,
        branch: filters.branchId ? '' : 'كل الفروع',
        operating: 0,
        miscellaneous: 0,
        cash: 0,
        bank: 0,
        other: 0,
        total: 0,
        count: 0,
        notes: '',
      };
      const amount = Number(expense.paidAmount ?? expense.amount ?? 0);
      const isOperating = Boolean(expense.isFixed || expense.categoryIsFixed);
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
      'ملخص مؤقت للمصاريف قبل اكتمال ترحيل تسلسل المصاريف.',
      filters,
      [
        { key: 'date', label: 'التاريخ', type: 'date' },
        { key: 'branch', label: 'الفرع' },
        { key: 'operating', label: 'مصاريف تشغيلية مدفوعة', type: 'money' },
        { key: 'miscellaneous', label: 'مصاريف متفرقة مدفوعة', type: 'money' },
        { key: 'cash', label: 'نقدي', type: 'money' },
        { key: 'bank', label: 'بنكي', type: 'money' },
        { key: 'other', label: 'أخرى', type: 'money' },
        { key: 'total', label: 'إجمالي المدفوع فعليًا', type: 'money' },
        { key: 'count', label: 'عدد الحركات', type: 'number' },
        { key: 'notes', label: 'تفاصيل مختصرة' },
      ],
      rows,
      [
        this.numberSummary('count', 'عدد الأيام', rows.length),
        this.moneySummary('operating', 'إجمالي التشغيلية المدفوعة', this.sum(rows, 'operating')),
        this.moneySummary('miscellaneous', 'إجمالي المتفرقة المدفوعة', this.sum(rows, 'miscellaneous')),
        this.moneySummary('total', 'إجمالي المدفوع فعليًا', this.sum(rows, 'total')),
      ],
    );
    report.filterSummary = await this.buildFilterSummary(filters);
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

  private async financialMovements(filters: ReportFilters) {
    const drawerQuery = this.drawerTransactionsRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.branch', 'branch')
      .leftJoinAndSelect('transaction.drawer', 'drawer')
      .orderBy('transaction.transactionDate', 'DESC');
    const vaultQuery = this.vaultTransactionsRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.branch', 'branch')
      .leftJoinAndSelect('transaction.vault', 'vault')
      .orderBy('transaction.transactionDate', 'DESC');
    const bankQuery = this.bankTransactionsRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.branch', 'branch')
      .leftJoinAndSelect('transaction.bankAccount', 'bankAccount')
      .orderBy('transaction.transactionDate', 'DESC');

    if (filters.branchId) {
      drawerQuery.andWhere('transaction.branch_id = :branchId', { branchId: filters.branchId });
      vaultQuery.andWhere('transaction.branch_id = :branchId', { branchId: filters.branchId });
      bankQuery.andWhere('transaction.branch_id = :branchId', { branchId: filters.branchId });
    }
    this.applyDateRange(drawerQuery, 'transaction.transaction_date', filters);
    this.applyDateRange(vaultQuery, 'transaction.transaction_date', filters);
    this.applyDateRange(bankQuery, 'transaction.transaction_date', filters);

    const [drawerTransactions, vaultTransactions, bankTransactions] = await Promise.all([
      drawerQuery.getMany(),
      vaultQuery.getMany(),
      bankQuery.getMany(),
    ]);
    const rows: ReportRow[] = [
      ...drawerTransactions.map((transaction) => ({
        date: transaction.transactionDate,
        branch: transaction.branch?.name ?? '',
        source: 'drawer',
        account: transaction.drawer?.name ?? '',
        type: transaction.transactionType,
        direction: transaction.direction,
        description: transaction.description,
        amount: transaction.amount,
      })),
      ...vaultTransactions.map((transaction) => ({
        date: transaction.transactionDate,
        branch: transaction.branch?.name ?? '',
        source: 'vault',
        account: transaction.vault?.name ?? '',
        type: transaction.transactionType,
        direction: transaction.direction,
        description: transaction.description,
        amount: transaction.amount,
      })),
      ...bankTransactions.map((transaction) => ({
        date: transaction.transactionDate,
        branch: transaction.branch?.name ?? '',
        source: 'bank',
        account: transaction.bankAccount?.name ?? '',
        type: transaction.transactionType,
        direction: transaction.direction === 'incoming' ? 'in' : 'out',
        description: transaction.description,
        amount: transaction.amount,
      })),
    ].sort((first, second) => String(second.date).localeCompare(String(first.date)));
    const incoming = rows.filter((row) => row.direction === 'in');
    const outgoing = rows.filter((row) => row.direction === 'out');
    const cashRows = rows.filter((row) => row.source === 'drawer' || row.source === 'vault');
    const bankRows = rows.filter((row) => row.source === 'bank');
    const net = (items: ReportRow[]) =>
      this.round(items.reduce((total, row) => total + (row.direction === 'in' ? 1 : -1) * Number(row.amount ?? 0), 0));

    const report = this.baseResult(
      'financial-movements',
      'تقرير الحركات المالية',
      'حركات الدرج والخزنة والبنك الداخلة والخارجة ضمن الفترة المختارة.',
      filters,
      [
        { key: 'date', label: 'التاريخ', type: 'date' },
        { key: 'branch', label: 'الفرع' },
        { key: 'source', label: 'المصدر', type: 'status' },
        { key: 'account', label: 'الحساب / الدرج / الخزنة' },
        { key: 'type', label: 'نوع الحركة', type: 'status' },
        { key: 'direction', label: 'الاتجاه', type: 'status' },
        { key: 'description', label: 'الوصف' },
        { key: 'amount', label: 'المبلغ', type: 'money' },
      ],
      rows,
      [
        this.numberSummary('count', 'عدد الحركات', rows.length),
        this.moneySummary('incoming', 'إجمالي الداخل', this.sum(incoming, 'amount')),
        this.moneySummary('outgoing', 'إجمالي الخارج', this.sum(outgoing, 'amount')),
        this.moneySummary('netCashMovement', 'صافي حركة النقد', net(cashRows)),
        this.moneySummary('netBankMovement', 'صافي حركة البنك', net(bankRows)),
      ],
    );
    report.filterSummary = await this.buildFilterSummary(filters);
    return report;
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

  private async employeeObligations(filters: ReportFilters) {
    const debtsQuery = this.employeeDebtsRepository
      .createQueryBuilder('debt')
      .leftJoinAndSelect('debt.employee', 'employee')
      .leftJoinAndSelect('employee.defaultBranch', 'branch')
      .orderBy('debt.debtDate', 'DESC');
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
      debtsQuery.andWhere('debt.employee_id = :employeeId', { employeeId: filters.employeeId });
      advancesQuery.andWhere('advance.employee_id = :employeeId', { employeeId: filters.employeeId });
      penaltiesQuery.andWhere('penalty.employee_id = :employeeId', { employeeId: filters.employeeId });
    }
    if (filters.branchId) {
      debtsQuery.andWhere('employee.default_branch_id = :branchId', { branchId: filters.branchId });
      advancesQuery.andWhere('employee.default_branch_id = :branchId', { branchId: filters.branchId });
      penaltiesQuery.andWhere('employee.default_branch_id = :branchId', { branchId: filters.branchId });
    }
    this.applyDateRange(debtsQuery, 'debt.debt_date', filters);
    this.applyDateRange(advancesQuery, 'advance.advance_date', filters);
    this.applyDateRange(penaltiesQuery, 'penalty.penalty_date', filters);

    const [debts, advances, penalties] = await Promise.all([
      debtsQuery.getMany(),
      advancesQuery.getMany(),
      penaltiesQuery.getMany(),
    ]);
    const rows: ReportRow[] = [
      ...debts.map((debt) => ({
        date: debt.debtDate,
        employee: debt.employee?.fullName ?? '',
        branch: debt.employee?.defaultBranch?.name ?? '',
        type: 'employee_debt',
        status: debt.status,
        amount: debt.amount,
        paid: debt.recoveredAmount,
        remaining: debt.remainingAmount,
      })),
      ...advances.map((advance) => ({
        date: advance.advanceDate,
        employee: advance.employee?.fullName ?? '',
        branch: advance.employee?.defaultBranch?.name ?? '',
        type: 'employee_advance',
        status: advance.status,
        amount: advance.amount,
        paid: advance.recoveredAmount,
        remaining: advance.remainingAmount,
      })),
      ...penalties.map((penalty) => ({
        date: penalty.penaltyDate,
        employee: penalty.employee?.fullName ?? '',
        branch: penalty.employee?.defaultBranch?.name ?? '',
        type: 'penalty',
        status: penalty.status,
        amount: penalty.amount,
        paid: 0,
        remaining: penalty.amount,
      })),
    ].sort((first, second) => String(second.date).localeCompare(String(first.date)));

    const report = this.baseResult(
      'employee-obligations',
      'تقرير التزامات الموظفين',
      'السلف والديون والعقوبات والمتبقي على الموظفين.',
      filters,
      [
        { key: 'date', label: 'التاريخ', type: 'date' },
        { key: 'employee', label: 'الموظف' },
        { key: 'branch', label: 'الفرع' },
        { key: 'type', label: 'نوع الالتزام', type: 'status' },
        { key: 'status', label: 'الحالة', type: 'status' },
        { key: 'amount', label: 'المبلغ', type: 'money' },
        { key: 'paid', label: 'المسترد / المسدد', type: 'money' },
        { key: 'remaining', label: 'المتبقي', type: 'money' },
      ],
      rows,
      [
        this.numberSummary('count', 'عدد الالتزامات', rows.length),
        this.moneySummary('total', 'إجمالي الالتزامات', this.sum(rows, 'amount')),
        this.moneySummary('paid', 'إجمالي المسترد / المسدد', this.sum(rows, 'paid')),
        this.moneySummary('remaining', 'إجمالي المتبقي', this.sum(rows, 'remaining')),
      ],
    );
    report.filterSummary = await this.buildFilterSummary(filters);
    return report;
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
