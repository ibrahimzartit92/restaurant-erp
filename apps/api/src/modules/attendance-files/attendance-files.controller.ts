import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { mkdirSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { CreateAttendanceFileDto } from './dto/create-attendance-file.dto';
import { UpdateAttendanceFileDto } from './dto/update-attendance-file.dto';
import { AttendanceFilesService } from './attendance-files.service';

const allowedMimeTypes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

@Controller('attendance-files')
export class AttendanceFilesController {
  constructor(private readonly attendanceFilesService: AttendanceFilesService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('employee_id') employeeId?: string,
    @Query('branch_id') branchId?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.attendanceFilesService.findAll({
      search,
      employeeId,
      branchId,
      month,
      year,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.attendanceFilesService.findByIdOrFail(id);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @UploadedFile() file: { originalname: string; mimetype: string; buffer: Buffer } | undefined,
    @Body() createDto: CreateAttendanceFileDto,
  ) {
    if (!file) {
      throw new BadRequestException('Attendance file is required.');
    }

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF and Excel files are allowed.');
    }

    const uploadDirectory = join(process.cwd(), 'uploads', 'attendance-files');
    mkdirSync(uploadDirectory, { recursive: true });

    const safeFileName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const storedPath = join(uploadDirectory, safeFileName);
    writeFileSync(storedPath, file.buffer);

    return this.attendanceFilesService.create(
      createDto,
      file.originalname,
      storedPath,
      extname(file.originalname).replace('.', '').toLowerCase() || file.mimetype,
    );
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateAttendanceFileDto) {
    return this.attendanceFilesService.update(id, updateDto);
  }
}
