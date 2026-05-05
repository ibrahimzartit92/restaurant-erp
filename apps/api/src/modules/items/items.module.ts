import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemCategoriesModule } from '../item-categories/item-categories.module';
import { PurchaseInvoiceItemEntity } from '../purchase-invoice-items/entities/purchase-invoice-item.entity';
import { StockCountItemEntity } from '../stock-counts/entities/stock-count-item.entity';
import { BranchTransferItemEntity } from '../transfers/entities/transfer-item.entity';
import { UnitsModule } from '../units/units.module';
import { ItemEntity } from './entities/item.entity';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ItemEntity, PurchaseInvoiceItemEntity, BranchTransferItemEntity, StockCountItemEntity]),
    ItemCategoriesModule,
    UnitsModule,
  ],
  controllers: [ItemsController],
  providers: [ItemsService],
  exports: [ItemsService],
})
export class ItemsModule {}
