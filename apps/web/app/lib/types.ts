export type BranchOption = {
  id: string;
  name: string;
};

export type BranchAccess = {
  scope: 'all' | 'single';
  branchIds: string[] | null;
};

export type PermissionSummary = {
  id: string;
  code: string;
  name: string;
  module: string;
  notes?: string | null;
};

export type RoleSummary = {
  id: string;
  code: string;
  name: string;
  notes?: string | null;
  permissions?: PermissionSummary[];
  createdAt?: string;
  updatedAt?: string;
};

export type UserSummary = {
  id: string;
  fullName: string;
  username: string;
  email: string | null;
  role: RoleSummary;
  branchId: string | null;
  branch?: BranchOption | null;
  branchAccess: BranchAccess;
  permissions: string[];
  isActive: boolean;
  mustChangePassword?: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseCategoryOption = {
  id: string;
  name: string;
  isFixed: boolean;
  classification?: 'operating' | 'miscellaneous';
  isActive?: boolean;
  notes?: string | null;
};

export type ExpenseTypeOption = {
  id: string;
  categoryId: string;
  category?: ExpenseCategoryOption | null;
  name: string;
  code: string;
  isActive?: boolean;
  notes?: string | null;
};

export type ItemCategoryOption = {
  id: string;
  code: string;
  name: string;
  color?: string;
  isActive?: boolean;
};

export type UnitOption = {
  id: string;
  code: string;
  name: string;
  isActive?: boolean;
};

export type SupplierOption = {
  id: string;
  code: string;
  name: string;
};

export type CustomerOption = {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  isActive?: boolean;
  notes?: string | null;
};

export type PurchaseInvoiceOption = {
  id: string;
  invoiceNumber: string;
  branchId: string;
  remainingAmount: number;
  supplier?: SupplierOption | null;
};

export type DrawerOption = {
  id: string;
  name: string;
  branchId?: string;
  branch?: BranchOption | null;
  defaultOpeningBalance?: number;
  defaultCashFloat?: number;
};

export type BankAccountOption = {
  id: string;
  name: string;
};

export type VaultOption = {
  id: string;
  code: string;
  name: string;
  openingBalance?: number;
  currentBalance?: number;
  branchId?: string | null;
  branch?: BranchOption | null;
  isActive?: boolean;
};

export type WholesaleSalesInvoiceSummary = {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer: CustomerOption;
  branchId: string;
  branch: BranchOption;
  warehouseId: string;
  warehouse: WarehouseOption;
  invoiceDate: string;
  dueDate?: string | null;
  documentStatus: 'draft' | 'approved' | 'cancelled';
  paymentStatus: 'unpaid' | 'partially_paid' | 'paid';
  latestPaymentDate?: string | null;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  cashTransferredAmount?: number;
  notes?: string | null;
  items?: {
    id: string;
    invoiceId: string;
    itemId: string;
    item: ItemOption;
    unitId?: string | null;
    unit?: UnitOption | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    notes?: string | null;
  }[];
  payments?: {
    id: string;
    paymentNumber: string;
    invoiceId: string;
    branchId: string;
    paymentDate: string;
    paymentMethod: 'cash' | 'vault' | 'bank';
    drawerId?: string | null;
    drawer?: DrawerOption | null;
    vaultId?: string | null;
    vault?: VaultOption | null;
    bankAccountId?: string | null;
    bankAccount?: BankAccountOption | null;
    amount: number;
    referenceNumber?: string | null;
    notes?: string | null;
  }[];
  stockWarnings?: {
    itemId: string;
    itemName: string;
    requestedQuantity: number;
    availableQuantity: number;
  }[];
};

export type UndoActionSummary = {
  id: string;
  actionType: string;
  entityType: string;
  entityId: string;
  recordSummary: string;
  reverseToVault: boolean;
  status: 'pending' | 'undone';
  createdAt: string;
  undoneAt?: string | null;
};

export type BankAccountSummary = {
  id: string;
  code: string;
  name: string;
  bankName: string;
  iban?: string | null;
  accountNumber?: string | null;
  currency: string;
  branchId?: string | null;
  branch?: BranchOption | null;
  openingBalance?: number;
  openingBalanceDate?: string | null;
  isActive: boolean;
  notes?: string | null;
  currentBalance?: number;
  transactionTotals?: {
    deposits: number;
    withdrawals: number;
    transfers: number;
  };
};

export type BankAccountTransactionSummary = {
  id: string;
  bankAccountId: string;
  bankAccount: BankAccountSummary;
  transactionDate: string;
  transactionType: string;
  direction: string;
  amount: number;
  branchId?: string | null;
  branch?: BranchOption | null;
  sourceType?: string | null;
  sourceId?: string | null;
  referenceNumber?: string | null;
  description: string;
  notes?: string | null;
};

export type WarehouseOption = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

export type ItemOption = {
  id: string;
  code: string;
  name: string;
  purchasePrice?: number;
  initialPrice?: number;
  costPrice?: number;
  salePrice?: number;
  isActive: boolean;
  unit?: {
    id: string;
    name: string;
    code?: string;
  } | null;
  category?: ItemCategoryOption | null;
};

export type BranchTransferItemSummary = {
  id?: string;
  branchTransferId?: string;
  itemId: string;
  item: ItemOption;
  quantity: number;
  unitCost: number;
  lineTotal: number;
  notes?: string | null;
};

export type BranchTransferSummary = {
  id: string;
  transferNumber: string;
  transferDate: string;
  fromBranchId: string;
  fromBranch: BranchOption;
  toBranchId: string;
  toBranch: BranchOption;
  fromWarehouseId: string;
  fromWarehouse: WarehouseOption;
  toWarehouseId: string;
  toWarehouse: WarehouseOption;
  status: 'draft' | 'completed' | 'cancelled';
  totalCostAmount: number;
  notes?: string | null;
  items: BranchTransferItemSummary[];
  createdAt?: string;
  updatedAt?: string;
};

export type StockCountItemSummary = {
  id?: string;
  stockCountId?: string;
  itemId: string;
  item: ItemOption;
  systemQuantity: number;
  countedQuantity: number;
  differenceQuantity: number;
  estimatedCostDifference: number;
  notes?: string | null;
};

export type StockCountSummary = {
  id: string;
  countNumber: string;
  branchId: string;
  branch: BranchOption;
  warehouseId: string;
  warehouse: WarehouseOption;
  countDate: string;
  status: 'draft' | 'completed' | 'cancelled';
  notes?: string | null;
  items: StockCountItemSummary[];
  createdAt?: string;
  updatedAt?: string;
};

export type EmployeeSummary = {
  id: string;
  employeeNumber: string;
  fullName: string;
  phone?: string | null;
  jobTitle?: string | null;
  defaultBranchId?: string | null;
  defaultBranch?: BranchOption | null;
  hireDate?: string | null;
  payrollMode?: 'fixed_monthly' | 'hourly';
  baseMonthlySalary?: number;
  hourlyRate?: number;
  isActive: boolean;
  notes?: string | null;
};

export type EmployeeAdvanceSummary = {
  id: string;
  employeeId: string;
  employee: EmployeeSummary;
  advanceDate: string;
  amount: number;
  drawerId?: string | null;
  drawer?: DrawerOption | null;
  bankAccountId?: string | null;
  bankAccount?: BankAccountOption | null;
  vaultId?: string | null;
  vault?: VaultOption | null;
  payrollMonth?: number | null;
  payrollYear?: number | null;
  payrollRecordId?: string | null;
  recoveredAmount?: number;
  remainingAmount?: number;
  status?: 'active' | 'partially_recovered' | 'settled' | 'cancelled';
  notes?: string | null;
};

export type DailySalesClosingSummaryValues = {
  expensesAmount: number;
  purchasesAmount: number;
  drawerPaidExpensesAmount?: number;
  bankPaidExpensesAmount?: number;
  drawerPaidExpenses?: DailySalesClosingSummaryLine[];
  bankPaidExpenses?: DailySalesClosingSummaryLine[];
  drawerPaidPurchases?: DailySalesClosingSummaryLine[];
  bankPaidPurchasesAmount?: number;
  bankPaidPurchases?: DailySalesClosingSummaryLine[];
  cashRetailSales: number;
  wholesaleCashCollections: number;
  wholesaleCashCollectionLines?: DailySalesClosingSummaryLine[];
  wholesaleBankCollections?: number;
  wholesaleBankCollectionLines?: DailySalesClosingSummaryLine[];
  wholesaleCollectionsTotal?: number;
  websiteCashSales: number;
  cashExpensesFromDrawer: number;
  cashPurchasesFromDrawer: number;
  employeeCashOutflowsFromDrawer: number;
  otherDrawerCashEffects: number;
  expectedSystemCash: number;
  handedCashAmount: number;
  cashDifference: number;
  normalBankSalesAmount?: number;
  totalBankInflowsAmount?: number;
  normalDailySalesAmount?: number;
  totalDailyActivityAmount?: number;
  reconciledTotalDailySales?: number;
  deliverySalesAmount: number;
  websiteBankSalesAmount: number;
  inStoreCardSalesAmount?: number;
  vaultTransferAmount: number;
};

export type DailySalesClosingSummaryLine = {
  id: string;
  description: string;
  amount: number;
  date?: string | null;
  reference?: string | null;
  secondary?: string | null;
};

export type DailySalesClosingSummary = {
  id: string;
  branchId: string;
  branch?: BranchOption | null;
  closingDate: string;
  status: 'draft' | 'finalized' | 'updated_after_close' | 'cancelled';
  drawerId?: string | null;
  drawer?: DrawerOption | null;
  bankAccountId?: string | null;
  bankAccount?: BankAccountOption | null;
  currentStep: number;
  draftData?: Record<string, unknown> | null;
  summaryValues?: DailySalesClosingSummaryValues | null;
  handedCashAmount?: number;
  expectedCashAmount?: number;
  cashDifferenceAmount?: number;
  generatedDailySaleId?: string | null;
  originalSummaryValues?: DailySalesClosingSummaryValues | null;
  postCloseUpdatedAt?: string | null;
  postCloseChanges?: {
    id: string;
    operationType: string;
    actionType: 'created' | 'edited' | 'cancelled' | 'deleted';
    effectiveDate: string;
    recordedAt: string;
    amount?: number | null;
    reference?: string | null;
    operationId?: string | null;
  }[] | null;
  notes?: string | null;
};

export type EmployeePenaltySummary = {
  id: string;
  employeeId: string;
  employee: EmployeeSummary;
  penaltyDate: string;
  amount: number;
  reason?: string | null;
  payrollMonth?: number | null;
  payrollYear?: number | null;
  payrollRecordId?: string | null;
  penaltyType?: 'financial' | 'non_financial';
  recoveredAmount?: number;
  remainingAmount?: number;
  status?: 'active' | 'partially_recovered' | 'settled' | 'cancelled';
  notes?: string | null;
};

export type EmployeeFinancialObligationSummary = {
  id: string;
  obligationType: 'advance' | 'debt' | 'financial_penalty';
  employeeId: string;
  employee: EmployeeSummary;
  branchId?: string | null;
  date: string;
  originalAmount: number;
  recoveredAmount: number;
  remainingAmount: number;
  status: 'active' | 'partially_recovered' | 'settled' | 'cancelled';
  debtRepaymentMode?: 'installment' | 'manual' | null;
  notes?: string | null;
};

export type PayrollSummary = {
  id: string;
  employeeId: string;
  employee: EmployeeSummary;
  payrollMonth: number;
  payrollYear: number;
  baseSalary: number;
  payrollMode?: 'fixed_monthly' | 'hourly';
  workHours?: number;
  hourlyRate?: number;
  extraHours?: number;
  extraHourRate?: number;
  extraHoursAmount?: number;
  allowancesAmount: number;
  advancesDeductionAmount: number;
  debtDeductionAmount?: number;
  penaltiesDeductionAmount: number;
  otherDeductionAmount: number;
  netSalary: number;
  paidAmount?: number;
  remainingAmount?: number;
  paymentStatus?: 'unpaid' | 'partially_paid' | 'paid';
  paymentAllocations?: {
    paymentMethod: 'cash' | 'bank' | 'vault';
    drawerId?: string | null;
    bankAccountId?: string | null;
    vaultId?: string | null;
    amount: number | string;
    paymentDate?: string | null;
    referenceNumber?: string | null;
    notes?: string | null;
  }[] | null;
  notes?: string | null;
};

export type AttendanceFileSummary = {
  id: string;
  employeeId?: string | null;
  employee?: EmployeeSummary | null;
  branchId?: string | null;
  branch?: BranchOption | null;
  month: number;
  year: number;
  fileName: string;
  filePath: string;
  fileType: string;
  notes?: string | null;
};

export type AttachmentEntityType =
  | 'purchase_invoice'
  | 'expense'
  | 'payroll'
  | 'attendance_file'
  | 'branch_transfer'
  | 'stock_count';

export type AttachmentSummary = {
  id: string;
  entityType: AttachmentEntityType;
  entityId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize?: number | null;
  uploadedBy?: string | null;
  notes?: string | null;
  createdAt: string;
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

export type ReportRow = Record<string, string | number | null>;

export type ReportCatalogItem = {
  key: string;
  title: string;
  description: string;
};

export type ReportResult = {
  key: string;
  title: string;
  description: string;
  generatedAt: string;
  summaries: ReportSummary[];
  columns: ReportColumn[];
  rows: ReportRow[];
};
