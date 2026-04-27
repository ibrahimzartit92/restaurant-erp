import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchEntity } from '../branches/entities/branch.entity';
import { DrawerTransactionsModule } from '../drawer-transactions/drawer-transactions.module';
import { DrawerTransactionEntity } from '../drawer-transactions/entities/drawer-transaction.entity';
import { DrawerEntity } from '../drawers/entities/drawer.entity';
import { DrawerDailySessionsController } from './drawer-daily-sessions.controller';
import { DrawerDailySessionsService } from './drawer-daily-sessions.service';
import { DrawerDailySessionEntity } from './entities/drawer-daily-session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BranchEntity, DrawerDailySessionEntity, DrawerEntity, DrawerTransactionEntity]),
    DrawerTransactionsModule,
  ],
  controllers: [DrawerDailySessionsController],
  providers: [DrawerDailySessionsService],
  exports: [DrawerDailySessionsService],
})
export class DrawerDailySessionsModule {}
