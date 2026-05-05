import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemEntity } from '../items/entities/item.entity';
import { UnitEntity } from './entities/unit.entity';
import { UnitsController } from './units.controller';
import { UnitsService } from './units.service';

@Module({
  imports: [TypeOrmModule.forFeature([UnitEntity, ItemEntity])],
  controllers: [UnitsController],
  providers: [UnitsService],
  exports: [UnitsService],
})
export class UnitsModule {}
