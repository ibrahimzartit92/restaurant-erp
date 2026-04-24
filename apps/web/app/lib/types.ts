export type BranchOption = {
  id: string;
  name: string;
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
