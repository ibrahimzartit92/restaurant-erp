import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { BankAccountEntity } from '../modules/bank-accounts/entities/bank-account.entity';
import { BankAccountTransactionEntity } from '../modules/bank-account-transactions/entities/bank-account-transaction.entity';
import { BranchEntity } from '../modules/branches/entities/branch.entity';
import { DailySaleEntity } from '../modules/daily-sales/entities/daily-sale.entity';
import { DrawerDailySessionEntity } from '../modules/drawer-daily-sessions/entities/drawer-daily-session.entity';
import { DrawerTransactionEntity } from '../modules/drawer-transactions/entities/drawer-transaction.entity';
import { DrawerEntity } from '../modules/drawers/entities/drawer.entity';
import { EmployeeAdvanceEntity } from '../modules/employee-advances/entities/employee-advance.entity';
import { EmployeePenaltyEntity } from '../modules/employee-penalties/entities/employee-penalty.entity';
import { EmployeeEntity } from '../modules/employees/entities/employee.entity';
import { ExpenseCategoryEntity } from '../modules/expense-categories/entities/expense-category.entity';
import { ExpenseTemplateEntity } from '../modules/expense-templates/entities/expense-template.entity';
import { ExpenseEntity } from '../modules/expenses/entities/expense.entity';
import { ItemCategoryEntity } from '../modules/item-categories/entities/item-category.entity';
import { ItemEntity } from '../modules/items/entities/item.entity';
import { AttendanceFileEntity } from '../modules/attendance-files/entities/attendance-file.entity';
import { PurchaseInvoiceItemEntity } from '../modules/purchase-invoice-items/entities/purchase-invoice-item.entity';
import { PurchaseInvoiceEntity } from '../modules/purchase-invoices/entities/purchase-invoice.entity';
import { PermissionEntity } from '../modules/permissions/entities/permission.entity';
import { PayrollRecordEntity } from '../modules/payroll/entities/payroll-record.entity';
import { RoleEntity } from '../modules/roles/entities/role.entity';
import { SupplierRepresentativeEntity } from '../modules/supplier-representatives/entities/supplier-representative.entity';
import { SupplierPaymentEntity } from '../modules/supplier-payments/entities/supplier-payment.entity';
import { SupplierEntity } from '../modules/suppliers/entities/supplier.entity';
import { StockCountItemEntity } from '../modules/stock-counts/entities/stock-count-item.entity';
import { StockCountEntity } from '../modules/stock-counts/entities/stock-count.entity';
import { UnitEntity } from '../modules/units/entities/unit.entity';
import { UserEntity } from '../modules/users/entities/user.entity';
import { WarehouseEntity } from '../modules/warehouses/entities/warehouse.entity';
import { BranchTransferItemEntity } from '../modules/transfers/entities/transfer-item.entity';
import { TransferEntity } from '../modules/transfers/entities/transfer.entity';

export const databaseEntities = [
  BankAccountEntity,
  BankAccountTransactionEntity,
  AttendanceFileEntity,
  BranchEntity,
  DailySaleEntity,
  DrawerDailySessionEntity,
  DrawerTransactionEntity,
  DrawerEntity,
  EmployeeEntity,
  EmployeeAdvanceEntity,
  EmployeePenaltyEntity,
  ExpenseCategoryEntity,
  ExpenseEntity,
  ExpenseTemplateEntity,
  ItemCategoryEntity,
  ItemEntity,
  PayrollRecordEntity,
  PermissionEntity,
  PurchaseInvoiceEntity,
  PurchaseInvoiceItemEntity,
  RoleEntity,
  SupplierEntity,
  SupplierPaymentEntity,
  SupplierRepresentativeEntity,
  StockCountEntity,
  StockCountItemEntity,
  TransferEntity,
  BranchTransferItemEntity,
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
