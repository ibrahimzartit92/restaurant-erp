import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeesService } from '../employees/employees.service';
import { CreateEmployeeAdvanceDto } from './dto/create-employee-advance.dto';
import { UpdateEmployeeAdvanceDto } from './dto/update-employee-advance.dto';
import { EmployeeAdvanceEntity } from './entities/employee-advance.entity';

@Injectable()
export class EmployeeAdvancesService {
  constructor(
    @InjectRepository(EmployeeAdvanceEntity)
    private readonly advanceRepository: Repository<EmployeeAdvanceEntity>,
    private readonly employeesService: EmployeesService,
  ) {}

  async findAll(filters: {
    search?: string;
    employeeId?: string;
    payrollMonth?: string;
    payrollYear?: string;
  }) {
    const query = this.advanceRepository
      .createQueryBuilder('advance')
      .leftJoinAndSelect('advance.employee', 'employee')
      .orderBy('advance.advance_date', 'DESC')
      .addOrderBy('advance.created_at', 'DESC');

    if (filters.search?.trim()) {
      query.andWhere('(employee.full_name ILIKE :search OR employee.employee_number ILIKE :search)', {
        search: `%${filters.search.trim()}%`,
      });
    }

    if (filters.employeeId) {
      query.andWhere('advance.employee_id = :employeeId', { employeeId: filters.employeeId });
    }

    if (filters.payrollMonth) {
      query.andWhere('advance.payroll_month = :payrollMonth', { payrollMonth: Number(filters.payrollMonth) });
    }

    if (filters.payrollYear) {
      query.andWhere('advance.payroll_year = :payrollYear', { payrollYear: Number(filters.payrollYear) });
    }

    return query.getMany();
  }

  async findByIdOrFail(id: string) {
    const advance = await this.advanceRepository.findOne({ where: { id } });

    if (!advance) {
      throw new NotFoundException('Employee advance was not found.');
    }

    return advance;
  }

  async create(createDto: CreateEmployeeAdvanceDto) {
    const employee = await this.employeesService.findByIdOrFail(createDto.employeeId);

    const advance = this.advanceRepository.create({
      employeeId: employee.id,
      advanceDate: createDto.advanceDate,
      amount: Number(createDto.amount),
      payrollMonth: createDto.payrollMonth ?? null,
      payrollYear: createDto.payrollYear ?? null,
      notes: this.normalizeOptionalText(createDto.notes),
    });

    return this.advanceRepository.save(advance);
  }

  async update(id: string, updateDto: UpdateEmployeeAdvanceDto) {
    const advance = await this.findByIdOrFail(id);

    if (updateDto.employeeId) {
      await this.employeesService.findByIdOrFail(updateDto.employeeId);
    }

    Object.assign(advance, {
      employeeId: updateDto.employeeId ?? advance.employeeId,
      advanceDate: updateDto.advanceDate ?? advance.advanceDate,
      amount: updateDto.amount !== undefined ? Number(updateDto.amount) : advance.amount,
      payrollMonth: updateDto.payrollMonth !== undefined ? updateDto.payrollMonth : advance.payrollMonth,
      payrollYear: updateDto.payrollYear !== undefined ? updateDto.payrollYear : advance.payrollYear,
      notes: updateDto.notes !== undefined ? this.normalizeOptionalText(updateDto.notes) : advance.notes,
    });

    return this.advanceRepository.save(advance);
  }

  private normalizeOptionalText(value?: string | null) {
    const normalizedValue = value?.trim();
    return normalizedValue ? normalizedValue : null;
  }
}
