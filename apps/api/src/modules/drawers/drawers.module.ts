import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchEntity } from '../branches/entities/branch.entity';
import { DrawersController } from './drawers.controller';
import { DrawersService } from './drawers.service';
import { DrawerEntity } from './entities/drawer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BranchEntity, DrawerEntity])],
  controllers: [DrawersController],
  providers: [DrawersService],
  exports: [DrawersService],
})
export class DrawersModule {}
