import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { UndoActionsService } from './undo-actions.service';

@Controller('undo-actions')
export class UndoActionsController {
  constructor(private readonly undoActionsService: UndoActionsService) {}

  @Get()
  findRecent(@Query('limit') limit?: string) {
    return this.undoActionsService.findRecent(Number(limit ?? 5));
  }

  @Post(':id/undo')
  undo(@Param('id') id: string) {
    return this.undoActionsService.undo(id);
  }
}
