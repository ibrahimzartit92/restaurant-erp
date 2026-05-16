export type ReportKey =
  | 'comprehensive'
  | 'dashboard'
  | 'daily-sales'
  | 'expenses'
  | 'purchases'
  | 'wholesale-sales'
  | 'supplier-statement'
  | 'supplier-payments'
  | 'drawer'
  | 'bank-transactions'
  | 'financial-movements'
  | 'branch-transfers'
  | 'stock-counts'
  | 'payroll'
  | 'employee-obligations'
  | 'advances-penalties';

export type ReportLanguage = 'ar' | 'de';

export type ReportFilters = {
  branchId?: string;
  supplierId?: string;
  employeeId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  categoryId?: string;
  expenseTypeId?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  vaultId?: string;
  bankAccountId?: string;
  search?: string;
  language?: ReportLanguage;
  columnKeys?: string;
  summaryKeys?: string;
};

export type ReportColumn = {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'money' | 'number' | 'status';
};

export type ReportSummary = {
  key: string;
  label: string;
  value: number | string;
  type?: 'money' | 'number' | 'text';
};

export type ReportFilterSummary = {
  label: string;
  value: string;
};

export type ReportRow = Record<string, string | number | null>;

export type ReportResult = {
  key: ReportKey;
  title: string;
  description: string;
  generatedAt: string;
  language?: ReportLanguage;
  filters: ReportFilters;
  filterSummary?: ReportFilterSummary[];
  availableSummaries?: ReportSummary[];
  availableColumns?: ReportColumn[];
  summaries: ReportSummary[];
  columns: ReportColumn[];
  rows: ReportRow[];
};
