import { AppDataSource } from '../data-source';
import { RoleEntity, RoleName } from '../../modules/roles/entities/role.entity';

const roles: Array<Pick<RoleEntity, 'name' | 'description'>> = [
  {
    name: RoleName.Admin,
    description: 'Full system access across all branches.',
  },
  {
    name: RoleName.Accountant,
    description: 'Accounting access across all branches.',
  },
  {
    name: RoleName.BranchManager,
    description: 'Management access restricted to one branch.',
  },
];

async function seedRoles() {
  await AppDataSource.initialize();
  const roleRepository = AppDataSource.getRepository(RoleEntity);

  for (const role of roles) {
    await roleRepository.upsert(role, ['name']);
  }

  await AppDataSource.destroy();
}

seedRoles().catch((error) => {
  console.error(error);
  process.exit(1);
});
