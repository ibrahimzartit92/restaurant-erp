import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchEntity } from '../branches/entities/branch.entity';
import { DailySalesController } from './daily-sales.controller';
import { DailySalesService } from './daily-sales.service';
import { DailySaleEntity } from './entities/daily-sale.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BranchEntity, DailySaleEntity])],
  controllers: [DailySalesController],
  providers: [DailySalesService],
  exports: [DailySalesService],
})
export class DailySalesModule {}
