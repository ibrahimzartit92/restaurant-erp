import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { BankAccountEntity } from '../modules/bank-accounts/entities/bank-account.entity';
import { BranchEntity } from '../modules/branches/entities/branch.entity';
import { DailySaleEntity } from '../modules/daily-sales/entities/daily-sale.entity';
import { DrawerDailySessionEntity } from '../modules/drawer-daily-sessions/entities/drawer-daily-session.entity';
import { DrawerTransactionEntity } from '../modules/drawer-transactions/entities/drawer-transaction.entity';
import { DrawerEntity } from '../modules/drawers/entities/drawer.entity';
import { ExpenseCategoryEntity } from '../modules/expense-categories/entities/expense-category.entity';
import { ExpenseTemplateEntity } from '../modules/expense-templates/entities/expense-template.entity';
import { ExpenseEntity } from '../modules/expenses/entities/expense.entity';
import { ItemCategoryEntity } from '../modules/item-categories/entities/item-category.entity';
import { ItemEntity } from '../modules/items/entities/item.entity';
import { PurchaseInvoiceItemEntity } from '../modules/purchase-invoice-items/entities/purchase-invoice-item.entity';
import { PurchaseInvoiceEntity } from '../modules/purchase-invoices/entities/purchase-invoice.entity';
import { PermissionEntity } from '../modules/permissions/entities/permission.entity';
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
  DailySaleEntity,
  DrawerDailySessionEntity,
  DrawerTransactionEntity,
  DrawerEntity,
  ExpenseCategoryEntity,
  ExpenseEntity,
  ExpenseTemplateEntity,
  ItemCategoryEntity,
  ItemEntity,
  PermissionEntity,
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
