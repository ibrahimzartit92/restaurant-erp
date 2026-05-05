import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchesModule } from '../branches/branches.module';
import { ItemsModule } from '../items/items.module';
import { StockMovementsModule } from '../stock-movements/stock-movements.module';
import { WarehousesModule } from '../warehouses/warehouses.module';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';
import { BranchTransferItemEntity } from './entities/transfer-item.entity';
import { TransferEntity } from './entities/transfer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransferEntity, BranchTransferItemEntity]),
    BranchesModule,
    WarehousesModule,
    ItemsModule,
    StockMovementsModule,
  ],
  controllers: [TransfersController],
  providers: [TransfersService],
  exports: [TransfersService],
})
export class TransfersModule {}
