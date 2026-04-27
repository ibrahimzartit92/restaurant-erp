import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemEntity } from '../items/entities/item.entity';
import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';
import { PurchaseInvoiceItemEntity } from './entities/purchase-invoice-item.entity';
import { PurchaseInvoiceItemsController } from './purchase-invoice-items.controller';
import { PurchaseInvoiceItemsService } from './purchase-invoice-items.service';

@Module({
  imports: [TypeOrmModule.forFeature([ItemEntity, PurchaseInvoiceEntity, PurchaseInvoiceItemEntity])],
  controllers: [PurchaseInvoiceItemsController],
  providers: [PurchaseInvoiceItemsService],
  exports: [PurchaseInvoiceItemsService],
})
export class PurchaseInvoiceItemsModule {}
