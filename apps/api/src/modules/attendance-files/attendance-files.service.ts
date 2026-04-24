import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BranchesService } from '../branches/branches.service';
import { EmployeesService } from '../employees/employees.service';
import { CreateAttendanceFileDto } from './dto/create-attendance-file.dto';
import { UpdateAttendanceFileDto } from './dto/update-attendance-file.dto';
import { AttendanceFileEntity } from './entities/attendance-file.entity';

@Injectable()
export class AttendanceFilesService {
  constructor(
    @InjectRepository(AttendanceFileEntity)
    private readonly attendanceFileRepository: Repository<AttendanceFileEntity>,
    private readonly employeesService: EmployeesService,
    private readonly branchesService: BranchesService,
  ) {}

  async findAll(filters: {
    search?: string;
    employeeId?: string;
    branchId?: string;
    month?: string;
    year?: string;
  }) {
    const query = this.attendanceFileRepository
      .createQueryBuilder('attendanceFile')
      .leftJoinAndSelect('attendanceFile.employee', 'employee')
      .leftJoinAndSelect('attendanceFile.branch', 'branch')
      .orderBy('attendanceFile.year', 'DESC')
      .addOrderBy('attendanceFile.month', 'DESC')
      .addOrderBy('attendanceFile.created_at', 'DESC');

    if (filters.search?.trim()) {
      query.andWhere(
        '(attendanceFile.file_name ILIKE :search OR employee.full_name ILIKE :search OR branch.name ILIKE :search)',
        { search: `%${filters.search.trim()}%` },
      );
    }

    if (filters.employeeId) {
      query.andWhere('attendanceFile.employee_id = :employeeId', { employeeId: filters.employeeId });
    }

    if (filters.branchId) {
      query.andWhere('attendanceFile.branch_id = :branchId', { branchId: filters.branchId });
    }

    if (filters.month) {
      query.andWhere('attendanceFile.month = :month', { month: Number(filters.month) });
    }

    if (filters.year) {
      query.andWhere('attendanceFile.year = :year', { year: Number(filters.year) });
    }

    return query.getMany();
  }

  async findByIdOrFail(id: string) {
    const attendanceFile = await this.attendanceFileRepository.findOne({ where: { id } });

    if (!attendanceFile) {
      throw new NotFoundException('Attendance file was not found.');
    }

    return attendanceFile;
  }

  async create(createDto: CreateAttendanceFileDto, fileName: string, filePath: string, fileType: string) {
    const employeeId = await this.resolveEmployeeId(createDto.employeeId);
    const branchId = await this.resolveBranchId(createDto.branchId);

    const attendanceFile = this.attendanceFileRepository.create({
      employeeId,
      branchId,
      month: createDto.month,
      year: createDto.year,
      fileName,
      filePath,
      fileType,
      notes: this.normalizeOptionalText(createDto.notes),
    });

    return this.attendanceFileRepository.save(attendanceFile);
  }

  async update(id: string, updateDto: UpdateAttendanceFileDto) {
    const attendanceFile = await this.findByIdOrFail(id);

    const employeeId =
      updateDto.employeeId !== undefined ? await this.resolveEmployeeId(updateDto.employeeId) : attendanceFile.employeeId;
    const branchId =
      updateDto.branchId !== undefined ? await this.resolveBranchId(updateDto.branchId) : attendanceFile.branchId;

    Object.assign(attendanceFile, {
      employeeId,
      branchId,
      month: updateDto.month ?? attendanceFile.month,
      year: updateDto.year ?? attendanceFile.year,
      notes: updateDto.notes !== undefined ? this.normalizeOptionalText(updateDto.notes) : attendanceFile.notes,
    });

    return this.attendanceFileRepository.save(attendanceFile);
  }

  private async resolveEmployeeId(employeeId?: string | null) {
    if (!employeeId) {
      return null;
    }

    const employee = await this.employeesService.findByIdOrFail(employeeId);
    return employee.id;
  }

  private async resolveBranchId(branchId?: string | null) {
    if (!branchId) {
      return null;
    }

    const branch = await this.branchesService.findById(branchId);

    if (!branch) {
      throw new NotFoundException('The selected branch was not found.');
    }

    return branch.id;
  }

  private normalizeOptionalText(value?: string | null) {
    const normalizedValue = value?.trim();
    return normalizedValue ? normalizedValue : null;
  }
}
