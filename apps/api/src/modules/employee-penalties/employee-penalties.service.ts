import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Repository } from 'typeorm';
import { EmployeesService } from '../employees/employees.service';
import { PayrollPaymentStatus, PayrollRecordEntity } from '../payroll/entities/payroll-record.entity';
import { UndoActionEntity } from '../undo-actions/entities/undo-action.entity';
import { UndoActionsService } from '../undo-actions/undo-actions.service';
import { CreateEmployeePenaltyDto } from './dto/create-employee-penalty.dto';
import { UpdateEmployeePenaltyDto } from './dto/update-employee-penalty.dto';
import { EmployeePenaltyEntity, EmployeePenaltyStatus, EmployeePenaltyType } from './entities/employee-penalty.entity';

@Injectable()
export class EmployeePenaltiesService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(EmployeePenaltyEntity)
    private readonly penaltyRepository: Repository<EmployeePenaltyEntity>,
    private readonly employeesService: EmployeesService,
    private readonly undoActionsService: UndoActionsService,
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
      penaltyType: (createDto.penaltyType ?? EmployeePenaltyType.Financial) as EmployeePenaltyType,
      recoveredAmount: 0,
      remainingAmount: createDto.penaltyType === EmployeePenaltyType.NonFinancial ? 0 : Number(createDto.amount),
      status: EmployeePenaltyStatus.Active,
      reason: this.normalizeOptionalText(createDto.reason),
      payrollMonth: createDto.payrollMonth ?? null,
      payrollYear: createDto.payrollYear ?? null,
      notes: this.normalizeOptionalText(createDto.notes),
    });

    return this.dataSource.transaction(async (manager) => {
      const savedPenalty = await manager.getRepository(EmployeePenaltyEntity).save(penalty);
      return savedPenalty;
    });
  }

  async remove(id: string) {
    const penalty = await this.findByIdOrFail(id);
    const previousPayrollRecordId = penalty.payrollRecordId;

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(EmployeePenaltyEntity).remove(penalty);
      if (previousPayrollRecordId) {
        await this.recalculatePayrollById(previousPayrollRecordId, manager);
      }
    });
    await this.recordUndoSafely({
      actionType: 'delete_only',
      entityType: 'employee_penalty',
      entityId: penalty.id,
      recordSummary: `عقوبة ${penalty.employee?.fullName ?? penalty.employeeId}`,
      snapshot: this.toSnapshot(penalty),
      reverseToVault: false,
    });

    return { id };
  }

  async restoreFromUndo(action: UndoActionEntity) {
    const penalty = this.penaltyRepository.create(action.snapshot as Partial<EmployeePenaltyEntity>);
    const previousPayrollRecordId = penalty.payrollRecordId;
    penalty.payrollRecordId = null;

    return this.dataSource.transaction(async (manager) => {
      const savedPenalty = await manager.getRepository(EmployeePenaltyEntity).save(penalty);
      if (previousPayrollRecordId) {
        await this.recalculatePayrollById(previousPayrollRecordId, manager);
      }
      await this.syncExistingPayroll(savedPenalty, manager);
      return savedPenalty;
    });
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
      penaltyType: (updateDto.penaltyType ?? penalty.penaltyType) as EmployeePenaltyType,
      remainingAmount:
        updateDto.amount !== undefined
          ? Math.max(this.roundMoney(Number(updateDto.amount) - Number(penalty.recoveredAmount ?? 0)), 0)
          : penalty.remainingAmount,
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

  private toSnapshot(penalty: EmployeePenaltyEntity) {
    return {
      id: penalty.id,
      employeeId: penalty.employeeId,
      penaltyDate: penalty.penaltyDate,
      amount: penalty.amount,
      penaltyType: penalty.penaltyType,
      recoveredAmount: penalty.recoveredAmount,
      remainingAmount: penalty.remainingAmount,
      status: penalty.status,
      reason: penalty.reason,
      payrollMonth: penalty.payrollMonth,
      payrollYear: penalty.payrollYear,
      payrollRecordId: penalty.payrollRecordId,
      notes: penalty.notes,
    };
  }

  private async syncExistingPayroll(penalty: EmployeePenaltyEntity, manager = this.dataSource.manager) {
    if (!penalty.payrollMonth || !penalty.payrollYear) return;

    const payroll = await manager.getRepository(PayrollRecordEntity).findOne({
      where: {
        employeeId: penalty.employeeId,
        payrollMonth: penalty.payrollMonth,
        payrollYear: penalty.payrollYear,
      },
    });

    if (!payroll) return;

    await manager
      .getRepository(EmployeePenaltyEntity)
      .createQueryBuilder()
      .update(EmployeePenaltyEntity)
      .set({ payrollRecordId: payroll.id })
      .where('employee_id = :employeeId', { employeeId: penalty.employeeId })
      .andWhere('payroll_month = :payrollMonth', { payrollMonth: penalty.payrollMonth })
      .andWhere('payroll_year = :payrollYear', { payrollYear: penalty.payrollYear })
      .andWhere('(payroll_record_id IS NULL OR payroll_record_id = :payrollId)', { payrollId: payroll.id })
      .execute();

    await this.recalculatePayroll(payroll, manager);
  }

  private async recalculatePayrollById(payrollId: string, manager = this.dataSource.manager) {
    const payroll = await manager.getRepository(PayrollRecordEntity).findOne({ where: { id: payrollId } });
    if (payroll) await this.recalculatePayroll(payroll, manager);
  }

  private async recalculatePayroll(payroll: PayrollRecordEntity, manager = this.dataSource.manager) {
    const linkedPenalties = await manager.getRepository(EmployeePenaltyEntity).find({ where: { payrollRecordId: payroll.id } });
    payroll.penaltiesDeductionAmount = this.roundMoney(linkedPenalties.reduce((sum, item) => sum + item.amount, 0));
    payroll.netSalary = this.roundMoney(
      payroll.baseSalary +
        Number(payroll.extraHoursAmount ?? 0) +
        payroll.allowancesAmount -
        payroll.advancesDeductionAmount -
        payroll.penaltiesDeductionAmount -
        payroll.otherDeductionAmount,
    );
    payroll.remainingAmount = this.roundMoney(payroll.netSalary - payroll.paidAmount);
    payroll.paymentStatus =
      payroll.paidAmount <= 0
        ? PayrollPaymentStatus.Unpaid
        : payroll.paidAmount >= payroll.netSalary
          ? PayrollPaymentStatus.Paid
          : PayrollPaymentStatus.PartiallyPaid;
    await manager.getRepository(PayrollRecordEntity).save(payroll);
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private async recordUndoSafely(action: Parameters<UndoActionsService['record']>[0]) {
    try {
      await this.undoActionsService.record(action);
    } catch {
      // Delete must remain usable even if the optional undo log table has not been migrated yet.
    }
  }
}
