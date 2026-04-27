import { PermissionEntity } from '../../modules/permissions/entities/permission.entity';
import { RoleEntity } from '../../modules/roles/entities/role.entity';
import { AppDataSource } from '../data-source';
import { defaultRolePermissions, permissionCatalog, roleCatalog } from './access-control-catalog';

async function seedAccessControl() {
  await AppDataSource.initialize();
  const roleRepository = AppDataSource.getRepository(RoleEntity);
  const permissionRepository = AppDataSource.getRepository(PermissionEntity);

  for (const role of roleCatalog) {
    await roleRepository.upsert(role, ['code']);
  }

  for (const permission of permissionCatalog) {
    await permissionRepository.upsert(permission, ['code']);
  }

  const roles = await roleRepository.find();
  const permissions = await permissionRepository.find();
  const permissionByCode = new Map(permissions.map((permission) => [permission.code, permission]));

  for (const role of roles) {
    const permissionCodes = defaultRolePermissions[role.code] ?? [];
    role.permissions = permissionCodes
      .map((permissionCode) => permissionByCode.get(permissionCode))
      .filter((permission): permission is PermissionEntity => Boolean(permission));
    await roleRepository.save(role);
  }

  await AppDataSource.destroy();
}

seedAccessControl().catch((error) => {
  console.error(error);
  process.exit(1);
});
