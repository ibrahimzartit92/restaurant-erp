import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccountEntity } from '../bank-accounts/entities/bank-account.entity';
import { BranchEntity } from '../branches/entities/branch.entity';
import { DrawerEntity } from '../drawers/entities/drawer.entity';
import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';
import { SupplierPaymentEntity } from './entities/supplier-payment.entity';
import { SupplierPaymentsController } from './supplier-payments.controller';
import { SupplierPaymentsService } from './supplier-payments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BankAccountEntity,
      BranchEntity,
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
