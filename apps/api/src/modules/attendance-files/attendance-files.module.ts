import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchesModule } from '../branches/branches.module';
import { EmployeesModule } from '../employees/employees.module';
import { AttendanceFilesController } from './attendance-files.controller';
import { AttendanceFilesService } from './attendance-files.service';
import { AttendanceFileEntity } from './entities/attendance-file.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AttendanceFileEntity]), EmployeesModule, BranchesModule],
  controllers: [AttendanceFilesController],
  providers: [AttendanceFilesService],
  exports: [AttendanceFilesService],
})
export class AttendanceFilesModule {}
