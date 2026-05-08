import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { AttendanceFileEntity } from '../attendance-files/entities/attendance-file.entity';
import { BranchesService } from '../branches/branches.service';
import { EmployeeAdvanceEntity } from '../employee-advances/entities/employee-advance.entity';
import { EmployeePenaltyEntity } from '../employee-penalties/entities/employee-penalty.entity';
import { PayrollRecordEntity } from '../payroll/entities/payroll-record.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeEntity, EmployeePayrollMode } from './entities/employee.entity';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(EmployeeEntity)
    private readonly employeeRepository: Repository<EmployeeEntity>,
    @InjectRepository(PayrollRecordEntity)
    private readonly payrollRepository: Repository<PayrollRecordEntity>,
    @InjectRepository(EmployeeAdvanceEntity)
    private readonly employeeAdvanceRepository: Repository<EmployeeAdvanceEntity>,
    @InjectRepository(EmployeePenaltyEntity)
    private readonly employeePenaltyRepository: Repository<EmployeePenaltyEntity>,
    @InjectRepository(AttendanceFileEntity)
    private readonly attendanceFileRepository: Repository<AttendanceFileEntity>,
    private readonly branchesService: BranchesService,
  ) {}

  findAll(filters: { search?: string; branchId?: string; isActive?: string }) {
    const query = this.employeeRepository
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.defaultBranch', 'defaultBranch')
      .orderBy('employee.full_name', 'ASC');

    if (filters.search?.trim()) {
      query.andWhere(
        '(employee.full_name ILIKE :search OR employee.employee_number ILIKE :search OR employee.phone ILIKE :search)',
        { search: `%${filters.search.trim()}%` },
      );
    }

    if (filters.branchId) {
      query.andWhere('employee.default_branch_id = :branchId', { branchId: filters.branchId });
    }

    if (filters.isActive === 'true' || filters.isActive === 'false') {
      query.andWhere('employee.is_active = :isActive', { isActive: filters.isActive === 'true' });
    }

    return query.getMany();
  }

  async findByIdOrFail(id: string) {
    const employee = await this.employeeRepository.findOne({ where: { id } });

    if (!employee) {
      throw new NotFoundException('Employee was not found.');
    }

    return employee;
  }

  async create(createDto: CreateEmployeeDto) {
    const employeeNumber = createDto.employeeNumber.trim().toUpperCase();
    await this.ensureEmployeeNumberIsAvailable(employeeNumber);
    const defaultBranchId = await this.resolveBranchId(createDto.defaultBranchId);

    const employee = this.employeeRepository.create({
      employeeNumber,
      fullName: createDto.fullName.trim(),
      phone: this.normalizeOptionalText(createDto.phone),
      jobTitle: this.normalizeOptionalText(createDto.jobTitle),
      defaultBranchId,
      hireDate: createDto.hireDate ?? null,
      payrollMode: (createDto.payrollMode ?? EmployeePayrollMode.FixedMonthly) as EmployeePayrollMode,
      baseMonthlySalary: Number(createDto.baseMonthlySalary ?? 0),
      hourlyRate: Number(createDto.hourlyRate ?? 0),
      isActive: createDto.isActive ?? true,
      notes: this.normalizeOptionalText(createDto.notes),
    });

    return this.employeeRepository.save(employee);
  }

  async remove(id: string) {
    const employee = await this.findByIdOrFail(id);
    const linkedRecords = await this.countLinkedRecords(id);

    if (linkedRecords === 0) {
      await this.employeeRepository.remove(employee);
      return { id, deleted: true, deactivated: false, linkedRecords };
    }

    employee.isActive = false;
    await this.employeeRepository.save(employee);

    return { id, deleted: false, deactivated: true, linkedRecords };
  }

  async update(id: string, updateDto: UpdateEmployeeDto) {
    const employee = await this.findByIdOrFail(id);
    const employeeNumber = updateDto.employeeNumber?.trim().toUpperCase();

    if (employeeNumber) {
      await this.ensureEmployeeNumberIsAvailable(employeeNumber, id);
    }

    const defaultBranchId =
      updateDto.defaultBranchId !== undefined ? await this.resolveBranchId(updateDto.defaultBranchId) : employee.defaultBranchId;

    Object.assign(employee, {
      employeeNumber: employeeNumber ?? employee.employeeNumber,
      fullName: updateDto.fullName?.trim() ?? employee.fullName,
      phone: updateDto.phone !== undefined ? this.normalizeOptionalText(updateDto.phone) : employee.phone,
      jobTitle: updateDto.jobTitle !== undefined ? this.normalizeOptionalText(updateDto.jobTitle) : employee.jobTitle,
      defaultBranchId,
      hireDate: updateDto.hireDate !== undefined ? updateDto.hireDate ?? null : employee.hireDate,
      payrollMode: (updateDto.payrollMode ?? employee.payrollMode) as EmployeePayrollMode,
      baseMonthlySalary:
        updateDto.baseMonthlySalary !== undefined ? Number(updateDto.baseMonthlySalary) : employee.baseMonthlySalary,
      hourlyRate: updateDto.hourlyRate !== undefined ? Number(updateDto.hourlyRate) : employee.hourlyRate,
      isActive: updateDto.isActive ?? employee.isActive,
      notes: updateDto.notes !== undefined ? this.normalizeOptionalText(updateDto.notes) : employee.notes,
    });

    return this.employeeRepository.save(employee);
  }

  private async ensureEmployeeNumberIsAvailable(employeeNumber: string, currentId?: string) {
    const existingEmployee = await this.employeeRepository.findOne({
      where: { employeeNumber, ...(currentId ? { id: Not(currentId) } : {}) },
    });

    if (existingEmployee) {
      throw new ConflictException('An employee with this number already exists.');
    }
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

  private async countLinkedRecords(employeeId: string) {
    const [payrolls, advances, penalties, attendanceFiles] = await Promise.all([
      this.payrollRepository.count({ where: { employeeId } }),
      this.employeeAdvanceRepository.count({ where: { employeeId } }),
      this.employeePenaltyRepository.count({ where: { employeeId } }),
      this.attendanceFileRepository.count({ where: { employeeId } }),
    ]);

    return payrolls + advances + penalties + attendanceFiles;
  }
}
