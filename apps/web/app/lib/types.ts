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
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseCategoryOption = {
  id: string;
  name: string;
  isFixed: boolean;
};

export type ExpenseTemplateOption = {
  id: string;
  name: string;
};

export type DrawerOption = {
  id: string;
  name: string;
  branchId?: string;
  branch?: BranchOption | null;
};

export type BankAccountOption = {
  id: string;
  name: string;
};

export type BankAccountSummary = {
  id: string;
  code: string;
  name: string;
  bankName: string;
  iban?: string | null;
  accountNumber?: string | null;
  currency: string;
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
  costPrice?: number;
  isActive: boolean;
  unit?: {
    id: string;
    name: string;
  } | null;
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
