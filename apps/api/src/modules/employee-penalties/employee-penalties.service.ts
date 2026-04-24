import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeesService } from '../employees/employees.service';
import { CreateEmployeePenaltyDto } from './dto/create-employee-penalty.dto';
import { UpdateEmployeePenaltyDto } from './dto/update-employee-penalty.dto';
import { EmployeePenaltyEntity } from './entities/employee-penalty.entity';

@Injectable()
export class EmployeePenaltiesService {
  constructor(
    @InjectRepository(EmployeePenaltyEntity)
    private readonly penaltyRepository: Repository<EmployeePenaltyEntity>,
    private readonly employeesService: EmployeesService,
  ) {}

  async findAll(filters: {
    search?: string;
    employeeId?: string;
    payrollMonth?: string;
    payrollYear?: string;
  }) {
    const query = this.penaltyRepository
      .createQueryBuilder('penalty')
      .leftJoinAndSelect('penalty.employee', 'employee')
      .orderBy('penalty.penalty_date', 'DESC')
      .addOrderBy('penalty.created_at', 'DESC');

    if (filters.search?.trim()) {
      query.andWhere(
        '(employee.full_name ILIKE :search OR employee.employee_number ILIKE :search OR penalty.reason ILIKE :search)',
        { search: `%${filters.search.trim()}%` },
      );
    }

    if (filters.employeeId) {
      query.andWhere('penalty.employee_id = :employeeId', { employeeId: filters.employeeId });
    }

    if (filters.payrollMonth) {
      query.andWhere('penalty.payroll_month = :payrollMonth', { payrollMonth: Number(filters.payrollMonth) });
    }

    if (filters.payrollYear) {
      query.andWhere('penalty.payroll_year = :payrollYear', { payrollYear: Number(filters.payrollYear) });
    }

    return query.getMany();
  }

  async findByIdOrFail(id: string) {
    const penalty = await this.penaltyRepository.findOne({ where: { id } });

    if (!penalty) {
      throw new NotFoundException('Employee penalty was not found.');
    }

    return penalty;
  }

  async create(createDto: CreateEmployeePenaltyDto) {
    const employee = await this.employeesService.findByIdOrFail(createDto.employeeId);

    const penalty = this.penaltyRepository.create({
      employeeId: employee.id,
      penaltyDate: createDto.penaltyDate,
      amount: Number(createDto.amount),
      reason: this.normalizeOptionalText(createDto.reason),
      payrollMonth: createDto.payrollMonth ?? null,
      payrollYear: createDto.payrollYear ?? null,
      notes: this.normalizeOptionalText(createDto.notes),
    });

    return this.penaltyRepository.save(penalty);
  }

  async update(id: string, updateDto: UpdateEmployeePenaltyDto) {
    const penalty = await this.findByIdOrFail(id);

    if (updateDto.employeeId) {
      await this.employeesService.findByIdOrFail(updateDto.employeeId);
    }

    Object.assign(penalty, {
      employeeId: updateDto.employeeId ?? penalty.employeeId,
      penaltyDate: updateDto.penaltyDate ?? penalty.penaltyDate,
      amount: updateDto.amount !== undefined ? Number(updateDto.amount) : penalty.amount,
      reason: updateDto.reason !== undefined ? this.normalizeOptionalText(updateDto.reason) : penalty.reason,
      payrollMonth: updateDto.payrollMonth !== undefined ? updateDto.payrollMonth : penalty.payrollMonth,
      payrollYear: updateDto.payrollYear !== undefined ? updateDto.payrollYear : penalty.payrollYear,
      notes: updateDto.notes !== undefined ? this.normalizeOptionalText(updateDto.notes) : penalty.notes,
    });

    return this.penaltyRepository.save(penalty);
  }

  private normalizeOptionalText(value?: string | null) {
    const normalizedValue = value?.trim();
    return normalizedValue ? normalizedValue : null;
  }
}
