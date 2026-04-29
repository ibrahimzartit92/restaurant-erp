export type DashboardFilters = {
  branchId?: string;
  period?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type DashboardMetricKey =
  | 'total_sales'
  | 'total_purchases'
  | 'total_operating_expenses'
  | 'total_miscellaneous_expenses'
  | 'total_payroll'
  | 'operating_net'
  | 'net_after_purchases'
  | 'bank_balance'
  | 'supplier_due';

export type DashboardMetric = {
  key: DashboardMetricKey;
  label: string;
  value: number;
  previousValue: number;
  changeAmount: number;
  changePercent: number | null;
  type: 'money' | 'number';
};

export type DashboardPoint = {
  date: string;
  sales: number;
  purchases: number;
  operatingExpenses: number;
  miscellaneousExpenses: number;
  payroll: number;
  netAfterPurchases: number;
};

export type DashboardNamedValue = {
  label: string;
  value: number;
};

export type DashboardBranchComparison = {
  branchId: string;
  branchName: string;
  sales: number;
  netAfterPurchases: number;
};

export type DashboardOpenInvoice = {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  branchName: string;
  invoiceDate: string;
  dueDate: string | null;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
};

export type DashboardResult = {
  generatedAt: string;
  filters: Required<Pick<DashboardFilters, 'dateFrom' | 'dateTo'>> & {
    branchId: string | null;
    period: string;
  };
  previousPeriod: {
    dateFrom: string;
    dateTo: string;
  };
  metrics: DashboardMetric[];
  charts: {
    timeSeries: DashboardPoint[];
    salesDistribution: DashboardNamedValue[];
    costStructure: DashboardNamedValue[];
    branchComparison: DashboardBranchComparison[];
  };
  openInvoices: DashboardOpenInvoice[];
};
