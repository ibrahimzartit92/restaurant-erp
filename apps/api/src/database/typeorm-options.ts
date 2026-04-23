import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { BranchEntity } from '../modules/branches/entities/branch.entity';
import { RoleEntity } from '../modules/roles/entities/role.entity';
import { UserEntity } from '../modules/users/entities/user.entity';

export const databaseEntities = [BranchEntity, RoleEntity, UserEntity];

export function createTypeOrmOptions(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: databaseEntities,
    synchronize: false,
  };
}
