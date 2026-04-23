import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchEntity } from '../branches/entities/branch.entity';
import { ItemEntity } from '../items/entities/item.entity';
import { PurchaseInvoiceItemEntity } from '../purchase-invoice-items/entities/purchase-invoice-item.entity';
import { SupplierRepresentativeEntity } from '../supplier-representatives/entities/supplier-representative.entity';
import { SupplierPaymentsModule } from '../supplier-payments/supplier-payments.module';
import { SupplierEntity } from '../suppliers/entities/supplier.entity';
import { WarehouseEntity } from '../warehouses/entities/warehouse.entity';
import { PurchaseInvoiceEntity } from './entities/purchase-invoice.entity';
import { PurchaseInvoicesController } from './purchase-invoices.controller';
import { PurchaseInvoicesService } from './purchase-invoices.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BranchEntity,
      ItemEntity,
      PurchaseInvoiceEntity,
      PurchaseInvoiceItemEntity,
      SupplierEntity,
      SupplierRepresentativeEntity,
      WarehouseEntity,
    ]),
    SupplierPaymentsModule,
  ],
  controllers: [PurchaseInvoicesController],
  providers: [PurchaseInvoicesService],
  exports: [PurchaseInvoicesService],
})
export class PurchaseInvoicesModule {}
