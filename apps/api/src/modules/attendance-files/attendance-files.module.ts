import { Module } from '@nestjs/common';
import { AttendanceFilesController } from './attendance-files.controller';
import { AttendanceFilesService } from './attendance-files.service';

@Module({
  controllers: [AttendanceFilesController],
  providers: [AttendanceFilesService],
  exports: [AttendanceFilesService],
})
export class AttendanceFilesModule {}
