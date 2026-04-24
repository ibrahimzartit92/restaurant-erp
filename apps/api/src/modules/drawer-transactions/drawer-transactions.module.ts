import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchEntity } from '../branches/entities/branch.entity';
import { DrawerEntity } from '../drawers/entities/drawer.entity';
import { DrawerTransactionEntity } from './entities/drawer-transaction.entity';
import { DrawerTransactionsController } from './drawer-transactions.controller';
import { DrawerTransactionsService } from './drawer-transactions.service';

@Module({
  imports: [TypeOrmModule.forFeature([BranchEntity, DrawerEntity, DrawerTransactionEntity])],
  controllers: [DrawerTransactionsController],
  providers: [DrawerTransactionsService],
  exports: [DrawerTransactionsService],
})
export class DrawerTransactionsModule {}
