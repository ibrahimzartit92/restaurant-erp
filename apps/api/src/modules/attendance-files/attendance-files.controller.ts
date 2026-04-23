import { Controller } from '@nestjs/common';
import { AttendanceFilesService } from './attendance-files.service';

@Controller('attendance-files')
export class AttendanceFilesController {
  constructor(private readonly attendanceFilesService: AttendanceFilesService) {}
}
