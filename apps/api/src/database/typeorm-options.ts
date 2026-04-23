import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { BankAccountEntity } from '../modules/bank-accounts/entities/bank-account.entity';
import { BranchEntity } from '../modules/branches/entities/branch.entity';
import { DrawerEntity } from '../modules/drawers/entities/drawer.entity';
import { ItemCategoryEntity } from '../modules/item-categories/entities/item-category.entity';
import { ItemEntity } from '../modules/items/entities/item.entity';
import { PurchaseInvoiceItemEntity } from '../modules/purchase-invoice-items/entities/purchase-invoice-item.entity';
import { PurchaseInvoiceEntity } from '../modules/purchase-invoices/entities/purchase-invoice.entity';
import { RoleEntity } from '../modules/roles/entities/role.entity';
import { SupplierRepresentativeEntity } from '../modules/supplier-representatives/entities/supplier-representative.entity';
import { SupplierPaymentEntity } from '../modules/supplier-payments/entities/supplier-payment.entity';
import { SupplierEntity } from '../modules/suppliers/entities/supplier.entity';
import { UnitEntity } from '../modules/units/entities/unit.entity';
import { UserEntity } from '../modules/users/entities/user.entity';
import { WarehouseEntity } from '../modules/warehouses/entities/warehouse.entity';

export const databaseEntities = [
  BankAccountEntity,
  BranchEntity,
  DrawerEntity,
  ItemCategoryEntity,
  ItemEntity,
  PurchaseInvoiceEntity,
  PurchaseInvoiceItemEntity,
  RoleEntity,
  SupplierEntity,
  SupplierPaymentEntity,
  SupplierRepresentativeEntity,
  UnitEntity,
  UserEntity,
  WarehouseEntity,
];

export function createTypeOrmOptions(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: databaseEntities,
    synchronize: false,
  };
}
