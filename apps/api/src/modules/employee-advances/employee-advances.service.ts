import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  BankAccountTransactionDirection,
  BankAccountTransactionEntity,
  BankAccountTransactionType,
} from '../bank-account-transactions/entities/bank-account-transaction.entity';
import { BankAccountEntity } from '../bank-accounts/entities/bank-account.entity';
import {
  DrawerTransactionDirection,
  DrawerTransactionEntity,
  DrawerTransactionType,
} from '../drawer-transactions/entities/drawer-transaction.entity';
import { DrawerEntity } from '../drawers/entities/drawer.entity';
import { EmployeesService } from '../employees/employees.service';
import { PayrollPaymentStatus, PayrollRecordEntity } from '../payroll/entities/payroll-record.entity';
import { UndoActionEntity } from '../undo-actions/entities/undo-action.entity';
import { UndoActionsService } from '../undo-actions/undo-actions.service';
import { VaultTransactionDirection, VaultTransactionType } from '../vaults/entities/vault-transaction.entity';
import { VaultsService } from '../vaults/vaults.service';
import { CreateEmployeeAdvanceDto } from './dto/create-employee-advance.dto';
import { UpdateEmployeeAdvanceDto } from './dto/update-employee-advance.dto';
import { EmployeeAdvanceEntity } from './entities/employee-advance.entity';

@Injectable()
export class EmployeeAdvancesService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(EmployeeAdvanceEntity)
    private readonly advanceRepository: Repository<EmployeeAdvanceEntity>,
    @InjectRepository(DrawerEntity)
    private readonly drawerRepository: Repository<DrawerEntity>,
    @InjectRepository(BankAccountEntity)
    private readonly bankAccountRepository: Repository<BankAccountEntity>,
    private readonly employeesService: EmployeesService,
    private readonly undoActionsService: UndoActionsService,
    private readonly vaultsService: VaultsService,
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
    await this.validatePayrollPeriod(createDto.payrollMonth, createDto.payrollYear);
    const source = await this.resolvePaymentSource(createDto);

    const advance = this.advanceRepository.create({
      employeeId: employee.id,
      advanceDate: createDto.advanceDate,
      amount: Number(createDto.amount),
      drawerId: source.drawerId,
      bankAccountId: source.bankAccountId,
      vaultId: source.vaultId,
      payrollMonth: createDto.payrollMonth!,
      payrollYear: createDto.payrollYear!,
      notes: this.normalizeOptionalText(createDto.notes),
    });

    return this.dataSource.transaction(async (manager) => {
      const savedAdvance = await manager.getRepository(EmployeeAdvanceEntity).save(advance);
      await this.recreateFinancialMovement(savedAdvance, manager);
      await this.syncExistingPayroll(savedAdvance, manager);
      return savedAdvance;
    });
  }

  async update(id: string, updateDto: UpdateEmployeeAdvanceDto) {
    const advance = await this.findByIdOrFail(id);
    const previousPayrollRecordId = advance.payrollRecordId;

    if (updateDto.employeeId) {
      await this.employeesService.findByIdOrFail(updateDto.employeeId);
    }
    const payrollMonth = updateDto.payrollMonth !== undefined ? updateDto.payrollMonth : advance.payrollMonth;
    const payrollYear = updateDto.payrollYear !== undefined ? updateDto.payrollYear : advance.payrollYear;
    await this.validatePayrollPeriod(payrollMonth, payrollYear);
    const source = await this.resolvePaymentSource({
      drawerId: updateDto.drawerId !== undefined ? updateDto.drawerId : advance.drawerId,
      bankAccountId: updateDto.bankAccountId !== undefined ? updateDto.bankAccountId : advance.bankAccountId,
      vaultId: updateDto.vaultId !== undefined ? updateDto.vaultId : advance.vaultId,
    });

    Object.assign(advance, {
      employeeId: updateDto.employeeId ?? advance.employeeId,
      advanceDate: updateDto.advanceDate ?? advance.advanceDate,
      amount: updateDto.amount !== undefined ? Number(updateDto.amount) : advance.amount,
      drawerId: source.drawerId,
      bankAccountId: source.bankAccountId,
      vaultId: source.vaultId,
      payrollMonth,
      payrollYear,
      payrollRecordId: null,
      notes: updateDto.notes !== undefined ? this.normalizeOptionalText(updateDto.notes) : advance.notes,
    });

    return this.dataSource.transaction(async (manager) => {
      const savedAdvance = await manager.getRepository(EmployeeAdvanceEntity).save(advance);
      if (previousPayrollRecordId) {
        await this.recalculatePayrollById(previousPayrollRecordId, manager);
      }
      await this.recreateFinancialMovement(savedAdvance, manager);
      await this.syncExistingPayroll(savedAdvance, manager);
      return savedAdvance;
    });
  }

  async remove(id: string, reverseFinancialEffect = false, vaultId?: string | null) {
    const advance = await this.findByIdOrFail(id);
    const previousPayrollRecordId = advance.payrollRecordId;

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(DrawerTransactionEntity).delete({ sourceType: 'employee_advance', sourceId: advance.id });
      await manager.getRepository(BankAccountTransactionEntity).delete({ sourceType: 'employee_advance', sourceId: advance.id });
      await this.vaultsService.deleteFinancialMovement('employee_advance', advance.id, manager);

      if (reverseFinancialEffect && advance.amount > 0) {
        await this.vaultsService.recordFinancialReturnToVault(
          {
            vaultId,
            amount: advance.amount,
            branchId: advance.drawer?.branchId ?? advance.bankAccount?.branchId ?? advance.vault?.branchId ?? advance.employee?.defaultBranchId ?? null,
            sourceType: 'employee_advance_vault_reversal',
            sourceId: advance.id,
            description: `استرجاع سلفة موظف إلى الخزنة ${advance.employee?.fullName ?? advance.employeeId}`,
            notes: advance.notes,
          },
          manager,
        );
      }

      await manager.getRepository(EmployeeAdvanceEntity).remove(advance);
      if (previousPayrollRecordId) {
        await this.recalculatePayrollById(previousPayrollRecordId, manager);
      }
      await this.recordUndoSafely({
        actionType: reverseFinancialEffect ? 'delete_with_vault_reversal' : 'delete_only',
        entityType: 'employee_advance',
        entityId: advance.id,
        recordSummary: `سلفة ${advance.employee?.fullName ?? advance.employeeId}`,
        snapshot: this.toSnapshot(advance),
        reverseToVault: reverseFinancialEffect,
        vaultTransactionSourceType: reverseFinancialEffect ? 'employee_advance_vault_reversal' : null,
        vaultTransactionSourceId: reverseFinancialEffect ? advance.id : null,
      });
    });

    return { id };
  }

  async restoreFromUndo(action: UndoActionEntity) {
    const restoredAdvance = this.advanceRepository.create(action.snapshot as Partial<EmployeeAdvanceEntity>);

    return this.dataSource.transaction(async (manager) => {
      await this.vaultsService.deleteFinancialMovement('employee_advance_vault_reversal', restoredAdvance.id, manager);
      const saved = await manager.getRepository(EmployeeAdvanceEntity).save(restoredAdvance);
      await this.recreateFinancialMovement(saved, manager);
      await this.syncExistingPayroll(saved, manager);
      return saved;
    });
  }

  private async resolvePaymentSource(source: { drawerId?: string | null; bankAccountId?: string | null; vaultId?: string | null }) {
    const sourceCount = [source.drawerId, source.bankAccountId, source.vaultId].filter(Boolean).length;
    if (sourceCount !== 1) {
      throw new BadRequestException('يجب اختيار مصدر دفع واحد فقط للسلفة: درج أو حساب بنكي أو خزنة.');
    }

    if (source.drawerId) {
      const drawer = await this.drawerRepository.findOne({ where: { id: source.drawerId } });

      if (!drawer) {
        throw new NotFoundException('Drawer was not found.');
      }

      return { drawerId: drawer.id, bankAccountId: null, vaultId: null };
    }

    if (source.bankAccountId) {
      const bankAccount = await this.bankAccountRepository.findOne({ where: { id: source.bankAccountId } });
      if (!bankAccount) throw new NotFoundException('Bank account was not found.');
      return { drawerId: null, bankAccountId: bankAccount.id, vaultId: null };
    }

    await this.vaultsService.findEntityByIdOrFail(source.vaultId!);
    return { drawerId: null, bankAccountId: null, vaultId: source.vaultId! };
  }

  private async recreateFinancialMovement(advance: EmployeeAdvanceEntity, manager = this.dataSource.manager) {
    await manager
      .getRepository(DrawerTransactionEntity)
      .delete({ sourceType: 'employee_advance', sourceId: advance.id });
    await manager
      .getRepository(BankAccountTransactionEntity)
      .delete({ sourceType: 'employee_advance', sourceId: advance.id });
    await this.vaultsService.deleteFinancialMovement('employee_advance', advance.id, manager);

    const description = `سلفة موظف ${advance.employee?.fullName ?? ''}`.trim();

    if (advance.drawerId) {
      const drawer = await manager.getRepository(DrawerEntity).findOne({ where: { id: advance.drawerId } });
      if (!drawer) return;
      await manager.getRepository(DrawerTransactionEntity).save({
        drawerId: advance.drawerId,
        branchId: drawer.branchId,
        transactionDate: advance.advanceDate,
        transactionType: DrawerTransactionType.EmployeeAdvanceCash,
        direction: DrawerTransactionDirection.Out,
        amount: advance.amount,
        sourceType: 'employee_advance',
        sourceId: advance.id,
        description,
        notes: advance.notes,
      });
    }

    if (advance.bankAccountId) {
      const bankAccount = await manager.getRepository(BankAccountEntity).findOne({ where: { id: advance.bankAccountId } });
      if (!bankAccount) return;
      await manager.getRepository(BankAccountTransactionEntity).save({
        bankAccountId: bankAccount.id,
        branchId: bankAccount.branchId ?? advance.employee?.defaultBranchId ?? null,
        transactionDate: advance.advanceDate,
        transactionType: BankAccountTransactionType.EmployeeAdvanceBank,
        direction: BankAccountTransactionDirection.Outgoing,
        amount: advance.amount,
        sourceType: 'employee_advance',
        sourceId: advance.id,
        referenceNumber: null,
        description,
        notes: advance.notes,
      });
    }

    if (advance.vaultId) {
      await this.vaultsService.recordTransaction(
        {
          vaultId: advance.vaultId,
          transactionDate: advance.advanceDate,
          transactionType: VaultTransactionType.EmployeeAdvance,
          direction: VaultTransactionDirection.Out,
          amount: advance.amount,
          branchId: advance.vault?.branchId ?? advance.employee?.defaultBranchId ?? null,
          sourceType: 'employee_advance',
          sourceId: advance.id,
          referenceNumber: null,
          description,
          notes: advance.notes,
        },
        manager,
      );
    }
  }

  private async validatePayrollPeriod(payrollMonth?: number | null, payrollYear?: number | null) {
    if (!payrollMonth || !payrollYear) {
      throw new BadRequestException('يجب ربط السلفة بشهر وسنة راتب محددين حتى يتم خصمها بشكل واضح.');
    }
  }

  private async syncExistingPayroll(advance: EmployeeAdvanceEntity, manager = this.dataSource.manager) {
    if (!advance.payrollMonth || !advance.payrollYear) return;

    const payroll = await manager.getRepository(PayrollRecordEntity).findOne({
      where: {
        employeeId: advance.employeeId,
        payrollMonth: advance.payrollMonth,
        payrollYear: advance.payrollYear,
      },
    });

    if (!payroll) return;

    await manager
      .getRepository(EmployeeAdvanceEntity)
      .createQueryBuilder()
      .update(EmployeeAdvanceEntity)
      .set({ payrollRecordId: payroll.id })
      .where('employee_id = :employeeId', { employeeId: advance.employeeId })
      .andWhere('payroll_month = :payrollMonth', { payrollMonth: advance.payrollMonth })
      .andWhere('payroll_year = :payrollYear', { payrollYear: advance.payrollYear })
      .andWhere('(payroll_record_id IS NULL OR payroll_record_id = :payrollId)', { payrollId: payroll.id })
      .execute();

    await this.recalculatePayroll(payroll, manager);
  }

  private async recalculatePayrollById(payrollId: string, manager = this.dataSource.manager) {
    const payroll = await manager.getRepository(PayrollRecordEntity).findOne({ where: { id: payrollId } });
    if (payroll) await this.recalculatePayroll(payroll, manager);
  }

  private async recalculatePayroll(payroll: PayrollRecordEntity, manager = this.dataSource.manager) {
    const linkedAdvances = await manager.getRepository(EmployeeAdvanceEntity).find({ where: { payrollRecordId: payroll.id } });
    payroll.advancesDeductionAmount = this.roundMoney(linkedAdvances.reduce((sum, item) => sum + item.amount, 0));
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

  private normalizeOptionalText(value?: string | null) {
    const normalizedValue = value?.trim();
    return normalizedValue ? normalizedValue : null;
  }

  private toSnapshot(advance: EmployeeAdvanceEntity) {
    return {
      id: advance.id,
      employeeId: advance.employeeId,
      advanceDate: advance.advanceDate,
      amount: advance.amount,
      drawerId: advance.drawerId,
      bankAccountId: advance.bankAccountId,
      vaultId: advance.vaultId,
      payrollMonth: advance.payrollMonth,
      payrollYear: advance.payrollYear,
      payrollRecordId: advance.payrollRecordId,
      notes: advance.notes,
    };
  }

  private async recordUndoSafely(action: Parameters<UndoActionsService['record']>[0]) {
    try {
      await this.undoActionsService.record(action);
    } catch {
      // Delete must remain usable even if the optional undo log table has not been migrated yet.
    }
  }
}
