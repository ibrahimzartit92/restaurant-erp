import type { BranchOption, PermissionSummary, RoleSummary, UserSummary } from './types';

export const mockBranches: BranchOption[] = [
  { id: 'branch-main', name: 'الفرع الرئيسي' },
  { id: 'branch-north', name: 'فرع الشمال' },
];

export const mockPermissions: PermissionSummary[] = [
  { id: 'perm-view-users', code: 'view_users', name: 'عرض المستخدمين', module: 'users', notes: 'عرض قائمة المستخدمين' },
  { id: 'perm-create-users', code: 'create_users', name: 'إضافة مستخدم', module: 'users', notes: 'إنشاء مستخدم جديد' },
  { id: 'perm-edit-users', code: 'edit_users', name: 'تعديل مستخدم', module: 'users', notes: 'تعديل بيانات المستخدمين' },
  { id: 'perm-manage-roles', code: 'manage_roles', name: 'إدارة الأدوار', module: 'roles', notes: 'إضافة وتعديل الأدوار' },
  { id: 'perm-manage-permissions', code: 'manage_permissions', name: 'إدارة الصلاحيات', module: 'permissions', notes: 'إدارة كتالوج الصلاحيات' },
  { id: 'perm-view-reports', code: 'view_reports', name: 'عرض التقارير', module: 'reports', notes: 'عرض تقارير النظام' },
];

export const mockRoles: RoleSummary[] = [
  {
    id: 'role-admin',
    code: 'admin',
    name: 'مدير النظام',
    notes: 'صلاحية كاملة على جميع أقسام النظام',
    permissions: mockPermissions,
  },
  {
    id: 'role-accountant',
    code: 'accountant',
    name: 'محاسب',
    notes: 'صلاحيات تشغيلية ومالية واسعة',
    permissions: mockPermissions.filter((permission) => permission.code !== 'manage_permissions'),
  },
  {
    id: 'role-branch-manager',
    code: 'branch_manager',
    name: 'مدير فرع',
    notes: 'صلاحيات تشغيلية مع إمكانية تقييده بفرع واحد',
    permissions: mockPermissions.filter((permission) => permission.module !== 'permissions'),
  },
];

export const mockUsers: UserSummary[] = [
  {
    id: 'user-admin',
    fullName: 'مدير النظام',
    username: 'admin',
    email: 'admin@example.com',
    role: mockRoles[0],
    branchId: null,
    branch: null,
    branchAccess: { scope: 'all', branchIds: null },
    permissions: mockRoles[0].permissions?.map((permission) => permission.code) ?? [],
    isActive: true,
    notes: 'حساب تجريبي لعرض الواجهة',
    createdAt: new Date('2026-04-01').toISOString(),
    updatedAt: new Date('2026-04-10').toISOString(),
  },
  {
    id: 'user-manager-main',
    fullName: 'مدير الفرع الرئيسي',
    username: 'manager_main',
    email: 'manager@example.com',
    role: mockRoles[2],
    branchId: mockBranches[0].id,
    branch: mockBranches[0],
    branchAccess: { scope: 'single', branchIds: [mockBranches[0].id] },
    permissions: mockRoles[2].permissions?.map((permission) => permission.code) ?? [],
    isActive: true,
    notes: 'مثال على مستخدم مقيد بفرع واحد',
    createdAt: new Date('2026-04-05').toISOString(),
    updatedAt: new Date('2026-04-12').toISOString(),
  },
];

export function withMockFallback<T>(data: T[], fallback: T[]) {
  return data.length > 0 ? data : fallback;
}

export function findMockUser(id: string) {
  return mockUsers.find((user) => user.id === id) ?? null;
}

export function findMockRole(id: string) {
  return mockRoles.find((role) => role.id === id) ?? null;
}
