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
  accountName: string;
};
