import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccountTransactionEntity } from '../bank-account-transactions/entities/bank-account-transaction.entity';
import { BankAccountEntity } from '../bank-accounts/entities/bank-account.entity';
import { BranchEntity } from '../branches/entities/branch.entity';
import { CustomerEntity } from '../customers/entities/customer.entity';
import { DrawerTransactionEntity } from '../drawer-transactions/entities/drawer-transaction.entity';
import { DrawerEntity } from '../drawers/entities/drawer.entity';
import { ItemEntity } from '../items/entities/item.entity';
import { StockMovementsModule } from '../stock-movements/stock-movements.module';
import { VaultsModule } from '../vaults/vaults.module';
import { WarehouseEntity } from '../warehouses/entities/warehouse.entity';
import { WholesaleSalesInvoiceItemEntity } from './entities/wholesale-sales-invoice-item.entity';
import { WholesaleSalesInvoiceEntity } from './entities/wholesale-sales-invoice.entity';
import { WholesaleSalesPaymentEntity } from './entities/wholesale-sales-payment.entity';
import { WholesaleSalesController } from './wholesale-sales.controller';
import { WholesaleSalesService } from './wholesale-sales.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WholesaleSalesInvoiceEntity,
      WholesaleSalesInvoiceItemEntity,
      WholesaleSalesPaymentEntity,
      CustomerEntity,
      BranchEntity,
      WarehouseEntity,
      ItemEntity,
      DrawerEntity,
      BankAccountEntity,
      DrawerTransactionEntity,
      BankAccountTransactionEntity,
    ]),
    StockMovementsModule,
    VaultsModule,
  ],
  controllers: [WholesaleSalesController],
  providers: [WholesaleSalesService],
  exports: [WholesaleSalesService],
})
export class WholesaleSalesModule {}
