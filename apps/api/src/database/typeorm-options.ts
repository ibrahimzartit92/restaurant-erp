import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { BranchEntity } from '../modules/branches/entities/branch.entity';
import { ItemCategoryEntity } from '../modules/item-categories/entities/item-category.entity';
import { ItemEntity } from '../modules/items/entities/item.entity';
import { RoleEntity } from '../modules/roles/entities/role.entity';
import { SupplierRepresentativeEntity } from '../modules/supplier-representatives/entities/supplier-representative.entity';
import { SupplierEntity } from '../modules/suppliers/entities/supplier.entity';
import { UnitEntity } from '../modules/units/entities/unit.entity';
import { UserEntity } from '../modules/users/entities/user.entity';

export const databaseEntities = [
  BranchEntity,
  ItemCategoryEntity,
  ItemEntity,
  RoleEntity,
  SupplierEntity,
  SupplierRepresentativeEntity,
  UnitEntity,
  UserEntity,
];

export function createTypeOrmOptions(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: databaseEntities,
    synchronize: false,
  };
}
