import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UndoActionEntity } from './entities/undo-action.entity';
import { UndoActionsController } from './undo-actions.controller';
import { UndoActionsService } from './undo-actions.service';

@Module({
  imports: [TypeOrmModule.forFeature([UndoActionEntity])],
  controllers: [UndoActionsController],
  providers: [UndoActionsService],
  exports: [UndoActionsService],
})
export class UndoActionsModule {}
