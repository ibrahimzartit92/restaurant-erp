import { Module } from '@nestjs/common';
import { DrawersController } from './drawers.controller';
import { DrawersService } from './drawers.service';

@Module({
  controllers: [DrawersController],
  providers: [DrawersService],
  exports: [DrawersService],
})
export class DrawersModule {}
