export type AuthenticatedBranchAccess = {
  scope: 'all' | 'single';
  branchIds: string[] | null;
};

export type AuthenticatedUser = {
  id: string;
  fullName: string;
  username: string;
  email: string | null;
  role: {
    id: string;
    code: string;
    name: string;
  };
  branchId: string | null;
  branchAccess: AuthenticatedBranchAccess;
  permissions: string[];
  isActive: boolean;
};
