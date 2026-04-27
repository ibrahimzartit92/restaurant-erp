export const SYSTEM_ROLE_CODES = {
  admin: 'admin',
  accountant: 'accountant',
  branchManager: 'branch_manager',
} as const;

export type SystemRoleCode = (typeof SYSTEM_ROLE_CODES)[keyof typeof SYSTEM_ROLE_CODES];
