import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { EmployeeAdvanceEntity } from '../employee-advances/entities/employee-advance.entity';
import { EmployeePenaltyEntity } from '../employee-penalties/entities/employee-penalty.entity';
import { EmployeesService } from '../employees/employees.service';
import { CreatePayrollRecordDto } from './dto/create-payroll-record.dto';
import { UpdatePayrollRecordDto } from './dto/update-payroll-record.dto';
import { PayrollRecordEntity } from './entities/payroll-record.entity';

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(PayrollRecordEntity)
    private readonly payrollRepository: Repository<PayrollRecordEntity>,
    @InjectRepository(EmployeeAdvanceEntity)
    private readonly employeeAdvanceRepository: Repository<EmployeeAdvanceEntity>,
    @InjectRepository(EmployeePenaltyEntity)
    private readonly employeePenaltyRepository: Repository<EmployeePenaltyEntity>,
    private readonly employeesService: EmployeesService,
  ) {}

  async findAll(filters: { search?: string; employeeId?: string; payrollMonth?: string; payrollYear?: string }) {
    const query = this.payrollRepository
      .createQueryBuilder('payroll')
      .leftJoinAndSelect('payroll.employee', 'employee')
      .orderBy('payroll.payroll_year', 'DESC')
      .addOrderBy('payroll.payroll_month', 'DESC')
      .addOrderBy('employee.full_name', 'ASC');

    if (filters.search?.trim()) {
      query.andWhere('(employee.full_name ILIKE :search OR employee.employee_number ILIKE :search)', {
        search: `%${filters.search.trim()}%`,
      });
    }

    if (filters.employeeId) {
      query.andWhere('payroll.employee_id = :employeeId', { employeeId: filters.employeeId });
    }

    if (filters.payrollMonth) {
      query.andWhere('payroll.payroll_month = :payrollMonth', { payrollMonth: Number(filters.payrollMonth) });
    }

    if (filters.payrollYear) {
      query.andWhere('payroll.payroll_year = :payrollYear', { payrollYear: Number(filters.payrollYear) });
    }

    return query.getMany();
  }

  async findByIdOrFail(id: string) {
    const payroll = await this.payrollRepository.findOne({ where: { id } });

    if (!payroll) {
      throw new NotFoundException('Payroll record was not found.');
    }

    return payroll;
  }

  async create(createDto: CreatePayrollRecordDto) {
    await this.employeesService.findByIdOrFail(createDto.employeeId);
    await this.ensureUniquePayroll(createDto.employeeId, createDto.payrollMonth, createDto.payrollYear);
    const automaticDeductions = await this.calculateAutomaticDeductions(
      createDto.employeeId,
      createDto.payrollMonth,
      createDto.payrollYear,
    );
    const advancesDeductionAmount = this.roundMoney(automaticDeductions.advances);
    const penaltiesDeductionAmount = this.roundMoney(automaticDeductions.penalties);
    const otherDeductionAmount = Number(createDto.otherDeductionAmount ?? 0);

    const payroll = this.payrollRepository.create({
      employeeId: createDto.employeeId,
      payrollMonth: createDto.payrollMonth,
      payrollYear: createDto.payrollYear,
      baseSalary: Number(createDto.baseSalary),
      allowancesAmount: Number(createDto.allowancesAmount ?? 0),
      advancesDeductionAmount,
      penaltiesDeductionAmount,
      otherDeductionAmount,
      netSalary: this.calculateNetSalary({
        baseSalary: Number(createDto.baseSalary),
        allowancesAmount: Number(createDto.allowancesAmount ?? 0),
        advancesDeductionAmount,
        penaltiesDeductionAmount,
        otherDeductionAmount,
      }),
      notes: this.normalizeOptionalText(createDto.notes),
    });

    return this.payrollRepository.save(payroll);
  }

  async update(id: string, updateDto: UpdatePayrollRecordDto) {
    const payroll = await this.findByIdOrFail(id);
    const employeeId = updateDto.employeeId ?? payroll.employeeId;
    const payrollMonth = updateDto.payrollMonth ?? payroll.payrollMonth;
    const payrollYear = updateDto.payrollYear ?? payroll.payrollYear;

    if (updateDto.employeeId) {
      await this.employeesService.findByIdOrFail(updateDto.employeeId);
    }

    await this.ensureUniquePayroll(employeeId, payrollMonth, payrollYear, id);
    const automaticDeductions = await this.calculateAutomaticDeductions(employeeId, payrollMonth, payrollYear);
    const baseSalary = updateDto.baseSalary !== undefined ? Number(updateDto.baseSalary) : payroll.baseSalary;
    const allowancesAmount =
      updateDto.allowancesAmount !== undefined ? Number(updateDto.allowancesAmount) : payroll.allowancesAmount;
    const advancesDeductionAmount = this.roundMoney(automaticDeductions.advances);
    const penaltiesDeductionAmount = this.roundMoney(automaticDeductions.penalties);
    const otherDeductionAmount =
      updateDto.otherDeductionAmount !== undefined ? Number(updateDto.otherDeductionAmount) : payroll.otherDeductionAmount;

    Object.assign(payroll, {
      employeeId,
      payrollMonth,
      payrollYear,
      baseSalary,
      allowancesAmount,
      advancesDeductionAmount,
      penaltiesDeductionAmount,
      otherDeductionAmount,
      netSalary: this.calculateNetSalary({
        baseSalary,
        allowancesAmount,
        advancesDeductionAmount,
        penaltiesDeductionAmount,
        otherDeductionAmount,
      }),
      notes: updateDto.notes !== undefined ? this.normalizeOptionalText(updateDto.notes) : payroll.notes,
    });

    return this.payrollRepository.save(payroll);
  }

  private async ensureUniquePayroll(employeeId: string, payrollMonth: number, payrollYear: number, currentId?: string) {
    const existingPayroll = await this.payrollRepository.findOne({
      where: {
        employeeId,
        payrollMonth,
        payrollYear,
        ...(currentId ? { id: Not(currentId) } : {}),
      },
    });

    if (existingPayroll) {
      throw new ConflictException('Payroll for this employee, month, and year already exists.');
    }
  }

  private normalizeOptionalText(value?: string | null) {
    const normalizedValue = value?.trim();
    return normalizedValue ? normalizedValue : null;
  }

  private async calculateAutomaticDeductions(employeeId: string, payrollMonth: number, payrollYear: number) {
    const [advances, penalties] = await Promise.all([
      this.employeeAdvanceRepository.find({ where: { employeeId, payrollMonth, payrollYear } }),
      this.employeePenaltyRepository.find({ where: { employeeId, payrollMonth, payrollYear } }),
    ]);

    return {
      advances: advances.reduce((sum, advance) => sum + advance.amount, 0),
      penalties: penalties.reduce((sum, penalty) => sum + penalty.amount, 0),
    };
  }

  private calculateNetSalary(values: {
    baseSalary: number;
    allowancesAmount: number;
    advancesDeductionAmount: number;
    penaltiesDeductionAmount: number;
    otherDeductionAmount: number;
  }) {
    return this.roundMoney(
      values.baseSalary +
        values.allowancesAmount -
        values.advancesDeductionAmount -
        values.penaltiesDeductionAmount -
        values.otherDeductionAmount,
    );
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
