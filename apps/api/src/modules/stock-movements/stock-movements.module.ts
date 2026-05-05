import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemEntity } from '../items/entities/item.entity';
import { WarehouseEntity } from '../warehouses/entities/warehouse.entity';
import { StockMovementEntity } from './entities/stock-movement.entity';
import { StockMovementsController } from './stock-movements.controller';
import { StockMovementsService } from './stock-movements.service';

@Module({
  imports: [TypeOrmModule.forFeature([StockMovementEntity, ItemEntity, WarehouseEntity])],
  controllers: [StockMovementsController],
  providers: [StockMovementsService],
  exports: [StockMovementsService],
})
export class StockMovementsModule {}
