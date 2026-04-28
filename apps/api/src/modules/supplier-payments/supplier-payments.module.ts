import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccountEntity } from '../bank-accounts/entities/bank-account.entity';
import { BankAccountTransactionEntity } from '../bank-account-transactions/entities/bank-account-transaction.entity';
import { BranchEntity } from '../branches/entities/branch.entity';
import { DrawerTransactionEntity } from '../drawer-transactions/entities/drawer-transaction.entity';
import { DrawerEntity } from '../drawers/entities/drawer.entity';
import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';
import { SupplierPaymentEntity } from './entities/supplier-payment.entity';
import { SupplierPaymentsController } from './supplier-payments.controller';
import { SupplierPaymentsService } from './supplier-payments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BankAccountEntity,
      BankAccountTransactionEntity,
      BranchEntity,
      DrawerTransactionEntity,
      DrawerEntity,
      PurchaseInvoiceEntity,
      SupplierPaymentEntity,
    ]),
  ],
  controllers: [SupplierPaymentsController],
  providers: [SupplierPaymentsService],
  exports: [SupplierPaymentsService],
})
export class SupplierPaymentsModule {}
