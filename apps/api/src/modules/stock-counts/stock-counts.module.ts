import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchesModule } from '../branches/branches.module';
import { ItemsModule } from '../items/items.module';
import { WarehousesModule } from '../warehouses/warehouses.module';
import { StockCountItemEntity } from './entities/stock-count-item.entity';
import { StockCountEntity } from './entities/stock-count.entity';
import { StockCountsController } from './stock-counts.controller';
import { StockCountsService } from './stock-counts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([StockCountEntity, StockCountItemEntity]),
    BranchesModule,
    WarehousesModule,
    ItemsModule,
  ],
  controllers: [StockCountsController],
  providers: [StockCountsService],
  exports: [StockCountsService],
})
export class StockCountsModule {}
