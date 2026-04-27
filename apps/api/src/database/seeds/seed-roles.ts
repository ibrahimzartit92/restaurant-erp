import { AppDataSource } from '../data-source';
import { RoleEntity } from '../../modules/roles/entities/role.entity';
import { roleCatalog } from './access-control-catalog';

const roles: Array<Pick<RoleEntity, 'code' | 'name' | 'notes'>> = roleCatalog;

async function seedRoles() {
  await AppDataSource.initialize();
  const roleRepository = AppDataSource.getRepository(RoleEntity);

  for (const role of roles) {
    await roleRepository.upsert(role, ['code']);
  }

  await AppDataSource.destroy();
}

seedRoles().catch((error) => {
  console.error(error);
  process.exit(1);
});
