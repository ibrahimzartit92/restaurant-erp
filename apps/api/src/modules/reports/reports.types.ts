export type ReportKey =
  | 'dashboard'
  | 'daily-sales'
  | 'expenses'
  | 'purchases'
  | 'supplier-statement'
  | 'supplier-payments'
  | 'drawer'
  | 'bank-transactions'
  | 'branch-transfers'
  | 'stock-counts'
  | 'payroll'
  | 'advances-penalties';

export type ReportFilters = {
  branchId?: string;
  supplierId?: string;
  employeeId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  categoryId?: string;
  paymentMethod?: string;
  search?: string;
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
  filters: ReportFilters;
  filterSummary?: ReportFilterSummary[];
  summaries: ReportSummary[];
  columns: ReportColumn[];
  rows: ReportRow[];
};
