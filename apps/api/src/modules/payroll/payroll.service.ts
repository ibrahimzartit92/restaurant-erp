import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Not, Repository } from 'typeorm';
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
import { EmployeeAdvanceEntity } from '../employee-advances/entities/employee-advance.entity';
import { EmployeePenaltyEntity } from '../employee-penalties/entities/employee-penalty.entity';
import { EmployeesService } from '../employees/employees.service';
import { FinancialPaymentMethod, PaymentAllocationDto } from '../shared/payment-allocation.dto';
import { UndoActionEntity } from '../undo-actions/entities/undo-action.entity';
import { UndoActionsService } from '../undo-actions/undo-actions.service';
import { VaultTransactionDirection, VaultTransactionType } from '../vaults/entities/vault-transaction.entity';
import { VaultsService } from '../vaults/vaults.service';
import { CreatePayrollRecordDto } from './dto/create-payroll-record.dto';
import { UpdatePayrollRecordDto } from './dto/update-payroll-record.dto';
import { PayrollPaymentAllocation, PayrollPaymentStatus, PayrollRecordEntity } from './entities/payroll-record.entity';

@Injectable()
export class PayrollService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(PayrollRecordEntity)
    private readonly payrollRepository: Repository<PayrollRecordEntity>,
    @InjectRepository(DrawerEntity)
    private readonly drawerRepository: Repository<DrawerEntity>,
    @InjectRepository(BankAccountEntity)
    private readonly bankAccountRepository: Repository<BankAccountEntity>,
    @InjectRepository(EmployeeAdvanceEntity)
    private readonly employeeAdvanceRepository: Repository<EmployeeAdvanceEntity>,
    @InjectRepository(EmployeePenaltyEntity)
    private readonly employeePenaltyRepository: Repository<EmployeePenaltyEntity>,
    private readonly employeesService: EmployeesService,
    private readonly vaultsService: VaultsService,
    private readonly undoActionsService: UndoActionsService,
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

    const netSalary = this.calculateNetSalary({
      baseSalary: Number(createDto.baseSalary),
      allowancesAmount: Number(createDto.allowancesAmount ?? 0),
      advancesDeductionAmount,
      penaltiesDeductionAmount,
      otherDeductionAmount,
    });
    const paymentAllocations = await this.resolvePaymentAllocations(createDto.payments, netSalary);
    const paidAmount = this.roundMoney(paymentAllocations.reduce((sum, payment) => sum + payment.amount, 0));
    const payroll = this.payrollRepository.create({
      employeeId: createDto.employeeId,
      payrollMonth: createDto.payrollMonth,
      payrollYear: createDto.payrollYear,
      baseSalary: Number(createDto.baseSalary),
      allowancesAmount: Number(createDto.allowancesAmount ?? 0),
      advancesDeductionAmount,
      penaltiesDeductionAmount,
      otherDeductionAmount,
      netSalary,
      paidAmount,
      remainingAmount: this.roundMoney(netSalary - paidAmount),
      paymentStatus: this.resolvePaymentStatus(netSalary, paidAmount),
      paymentAllocations,
      notes: this.normalizeOptionalText(createDto.notes),
    });

    return this.dataSource.transaction(async (manager) => {
      const saved = await manager.getRepository(PayrollRecordEntity).save(payroll);
      await this.syncDeductionLinks(saved, manager);
      await this.recreateFinancialMovement(saved, manager);
      return saved;
    });
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
    const automaticDeductions = await this.calculateAutomaticDeductions(employeeId, payrollMonth, payrollYear, id);
    const baseSalary = updateDto.baseSalary !== undefined ? Number(updateDto.baseSalary) : payroll.baseSalary;
    const allowancesAmount =
      updateDto.allowancesAmount !== undefined ? Number(updateDto.allowancesAmount) : payroll.allowancesAmount;
    const advancesDeductionAmount = this.roundMoney(automaticDeductions.advances);
    const penaltiesDeductionAmount = this.roundMoney(automaticDeductions.penalties);
    const otherDeductionAmount =
      updateDto.otherDeductionAmount !== undefined ? Number(updateDto.otherDeductionAmount) : payroll.otherDeductionAmount;

    const netSalary = this.calculateNetSalary({
      baseSalary,
      allowancesAmount,
      advancesDeductionAmount,
      penaltiesDeductionAmount,
      otherDeductionAmount,
    });
    const paymentAllocations = await this.resolvePaymentAllocations(
      updateDto.payments ?? payroll.paymentAllocations ?? undefined,
      netSalary,
    );
    const paidAmount = this.roundMoney(paymentAllocations.reduce((sum, payment) => sum + payment.amount, 0));

    Object.assign(payroll, {
      employeeId,
      payrollMonth,
      payrollYear,
      baseSalary,
      allowancesAmount,
      advancesDeductionAmount,
      penaltiesDeductionAmount,
      otherDeductionAmount,
      netSalary,
      paidAmount,
      remainingAmount: this.roundMoney(netSalary - paidAmount),
      paymentStatus: this.resolvePaymentStatus(netSalary, paidAmount),
      paymentAllocations,
      notes: updateDto.notes !== undefined ? this.normalizeOptionalText(updateDto.notes) : payroll.notes,
    });

    return this.dataSource.transaction(async (manager) => {
      const saved = await manager.getRepository(PayrollRecordEntity).save(payroll);
      await this.syncDeductionLinks(saved, manager);
      await this.recreateFinancialMovement(saved, manager);
      return saved;
    });
  }

  async remove(id: string, reverseFinancialEffect = false, vaultId?: string | null) {
    const payroll = await this.findByIdOrFail(id);

    await this.dataSource.transaction(async (manager) => {
      await this.deleteFinancialMovement(payroll.id, manager);

      if (reverseFinancialEffect && payroll.paidAmount > 0) {
        await this.vaultsService.recordFinancialReturnToVault(
          {
            vaultId,
            amount: payroll.paidAmount,
            branchId: payroll.employee?.defaultBranchId ?? null,
            sourceType: 'payroll_vault_reversal',
            sourceId: payroll.id,
            description: `استرجاع دفعة راتب إلى الخزنة ${payroll.employee?.fullName ?? payroll.employeeId}`,
            notes: payroll.notes,
          },
          manager,
        );
      }

      await Promise.all([
        manager
          .getRepository(EmployeeAdvanceEntity)
          .createQueryBuilder()
          .update(EmployeeAdvanceEntity)
          .set({ payrollRecordId: null })
          .where('payroll_record_id = :payrollId', { payrollId: payroll.id })
          .execute(),
        manager
          .getRepository(EmployeePenaltyEntity)
          .createQueryBuilder()
          .update(EmployeePenaltyEntity)
          .set({ payrollRecordId: null })
          .where('payroll_record_id = :payrollId', { payrollId: payroll.id })
          .execute(),
      ]);
      await manager.getRepository(PayrollRecordEntity).remove(payroll);
      await this.undoActionsService.record({
        actionType: reverseFinancialEffect ? 'delete_with_vault_reversal' : 'delete_only',
        entityType: 'payroll',
        entityId: payroll.id,
        recordSummary: `راتب ${payroll.employee?.fullName ?? payroll.employeeId} ${payroll.payrollMonth}/${payroll.payrollYear}`,
        snapshot: this.toSnapshot(payroll),
        reverseToVault: reverseFinancialEffect,
        vaultTransactionSourceType: reverseFinancialEffect ? 'payroll_vault_reversal' : null,
        vaultTransactionSourceId: reverseFinancialEffect ? payroll.id : null,
      });
    });

    return { id };
  }

  async restoreFromUndo(action: UndoActionEntity) {
    const payroll = this.payrollRepository.create(action.snapshot as Partial<PayrollRecordEntity>);

    return this.dataSource.transaction(async (manager) => {
      await this.vaultsService.deleteFinancialMovement('payroll_vault_reversal', payroll.id, manager);
      const saved = await manager.getRepository(PayrollRecordEntity).save(payroll);
      await this.syncDeductionLinks(saved, manager);
      await this.recreateFinancialMovement(saved, manager);
      return saved;
    });
  }

  private async resolvePaymentAllocations(payments: PaymentAllocationDto[] | PayrollPaymentAllocation[] | undefined, netSalary: number) {
    const allocations = (payments ?? [])
      .map((payment) => ({
        paymentMethod: payment.paymentMethod,
        drawerId: payment.paymentMethod === FinancialPaymentMethod.Cash ? payment.drawerId ?? null : null,
        bankAccountId: payment.paymentMethod === FinancialPaymentMethod.Bank ? payment.bankAccountId ?? null : null,
        vaultId: payment.paymentMethod === FinancialPaymentMethod.Vault ? payment.vaultId ?? null : null,
        amount: this.roundMoney(Number(payment.amount ?? 0)),
        paymentDate: payment.paymentDate ?? new Date().toISOString().slice(0, 10),
        referenceNumber: payment.referenceNumber ?? null,
        notes: payment.notes ?? null,
      }))
      .filter((payment) => payment.amount > 0);

    const paidTotal = this.roundMoney(allocations.reduce((sum, payment) => sum + payment.amount, 0));
    if (paidTotal > this.roundMoney(netSalary)) {
      throw new ConflictException('Payroll payments cannot exceed the net salary.');
    }

    for (const allocation of allocations) {
      if (allocation.paymentMethod === FinancialPaymentMethod.Cash) {
        if (!allocation.drawerId) throw new NotFoundException('Drawer is required for cash payroll payments.');
        const drawer = await this.drawerRepository.findOne({ where: { id: allocation.drawerId } });
        if (!drawer) throw new NotFoundException('Drawer was not found.');
      }
      if (allocation.paymentMethod === FinancialPaymentMethod.Bank) {
        if (!allocation.bankAccountId) throw new NotFoundException('Bank account is required for payroll payments.');
        const bankAccount = await this.bankAccountRepository.findOne({ where: { id: allocation.bankAccountId } });
        if (!bankAccount) throw new NotFoundException('Bank account was not found.');
      }
      if (allocation.paymentMethod === FinancialPaymentMethod.Vault) {
        if (!allocation.vaultId) throw new NotFoundException('Vault is required for payroll payments.');
        await this.vaultsService.findEntityByIdOrFail(allocation.vaultId);
      }
    }

    return allocations;
  }

  private async recreateFinancialMovement(payroll: PayrollRecordEntity, manager = this.dataSource.manager) {
    await this.deleteFinancialMovement(payroll.id, manager);

    for (const allocation of payroll.paymentAllocations ?? []) {
      const description = `دفعة راتب ${payroll.employee?.fullName ?? payroll.employeeId} ${payroll.payrollMonth}/${payroll.payrollYear}`;

      if (allocation.paymentMethod === FinancialPaymentMethod.Cash && allocation.drawerId) {
        const drawer = await manager.getRepository(DrawerEntity).findOne({ where: { id: allocation.drawerId } });
        if (!drawer) throw new NotFoundException('Drawer was not found.');
        await manager.getRepository(DrawerTransactionEntity).save({
          drawerId: allocation.drawerId,
          branchId: drawer.branchId,
          transactionDate: allocation.paymentDate ?? new Date().toISOString().slice(0, 10),
          transactionType: DrawerTransactionType.PayrollPaymentCash,
          direction: DrawerTransactionDirection.Out,
          amount: allocation.amount,
          sourceType: 'payroll_payment',
          sourceId: payroll.id,
          description,
          notes: allocation.notes ?? null,
        });
      }

      if (allocation.paymentMethod === FinancialPaymentMethod.Bank && allocation.bankAccountId) {
        await manager.getRepository(BankAccountTransactionEntity).save({
          bankAccountId: allocation.bankAccountId,
          transactionDate: allocation.paymentDate ?? new Date().toISOString().slice(0, 10),
          transactionType: BankAccountTransactionType.PayrollPaymentBank,
          direction: BankAccountTransactionDirection.Outgoing,
          amount: allocation.amount,
          branchId: payroll.employee?.defaultBranchId ?? null,
          sourceType: 'payroll_payment',
          sourceId: payroll.id,
          referenceNumber: allocation.referenceNumber ?? null,
          description,
          notes: allocation.notes ?? null,
        });
      }

      if (allocation.paymentMethod === FinancialPaymentMethod.Vault && allocation.vaultId) {
        await this.vaultsService.recordTransaction(
          {
            vaultId: allocation.vaultId,
            transactionDate: allocation.paymentDate ?? new Date().toISOString().slice(0, 10),
            transactionType: VaultTransactionType.PayrollPayment,
            direction: VaultTransactionDirection.Out,
            amount: allocation.amount,
            branchId: payroll.employee?.defaultBranchId ?? null,
            sourceType: 'payroll_payment',
            sourceId: payroll.id,
            referenceNumber: allocation.referenceNumber ?? null,
            description,
            notes: allocation.notes ?? null,
          },
          manager,
        );
      }
    }
  }

  private async deleteFinancialMovement(payrollId: string, manager = this.dataSource.manager) {
    await Promise.all([
      manager.getRepository(DrawerTransactionEntity).delete({ sourceType: 'payroll_payment', sourceId: payrollId }),
      manager.getRepository(BankAccountTransactionEntity).delete({ sourceType: 'payroll_payment', sourceId: payrollId }),
      this.vaultsService.deleteFinancialMovement('payroll_payment', payrollId, manager),
    ]);
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

  private async calculateAutomaticDeductions(
    employeeId: string,
    payrollMonth: number,
    payrollYear: number,
    currentPayrollId?: string,
  ) {
    const [advances, penalties] = await Promise.all([
      this.employeeAdvanceRepository
        .createQueryBuilder('advance')
        .where('advance.employee_id = :employeeId', { employeeId })
        .andWhere('advance.payroll_month = :payrollMonth', { payrollMonth })
        .andWhere('advance.payroll_year = :payrollYear', { payrollYear })
        .andWhere(
          new Brackets((query) => {
            query.where('advance.payroll_record_id IS NULL');
            if (currentPayrollId) {
              query.orWhere('advance.payroll_record_id = :currentPayrollId', { currentPayrollId });
            }
          }),
        )
        .getMany(),
      this.employeePenaltyRepository
        .createQueryBuilder('penalty')
        .where('penalty.employee_id = :employeeId', { employeeId })
        .andWhere('penalty.payroll_month = :payrollMonth', { payrollMonth })
        .andWhere('penalty.payroll_year = :payrollYear', { payrollYear })
        .andWhere(
          new Brackets((query) => {
            query.where('penalty.payroll_record_id IS NULL');
            if (currentPayrollId) {
              query.orWhere('penalty.payroll_record_id = :currentPayrollId', { currentPayrollId });
            }
          }),
        )
        .getMany(),
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

  private toSnapshot(payroll: PayrollRecordEntity) {
    return {
      id: payroll.id,
      employeeId: payroll.employeeId,
      payrollMonth: payroll.payrollMonth,
      payrollYear: payroll.payrollYear,
      baseSalary: payroll.baseSalary,
      allowancesAmount: payroll.allowancesAmount,
      advancesDeductionAmount: payroll.advancesDeductionAmount,
      penaltiesDeductionAmount: payroll.penaltiesDeductionAmount,
      otherDeductionAmount: payroll.otherDeductionAmount,
      netSalary: payroll.netSalary,
      paidAmount: payroll.paidAmount,
      remainingAmount: payroll.remainingAmount,
      paymentStatus: payroll.paymentStatus,
      paymentAllocations: payroll.paymentAllocations,
      notes: payroll.notes,
    };
  }

  private resolvePaymentStatus(netSalary: number, paidAmount: number) {
    if (paidAmount <= 0) {
      return PayrollPaymentStatus.Unpaid;
    }

    if (paidAmount >= this.roundMoney(netSalary)) {
      return PayrollPaymentStatus.Paid;
    }

    return PayrollPaymentStatus.PartiallyPaid;
  }

  private async syncDeductionLinks(payroll: PayrollRecordEntity, manager = this.dataSource.manager) {
    await Promise.all([
      manager
        .getRepository(EmployeeAdvanceEntity)
        .createQueryBuilder()
        .update(EmployeeAdvanceEntity)
        .set({ payrollRecordId: null })
        .where('payroll_record_id = :payrollId', { payrollId: payroll.id })
        .execute(),
      manager
        .getRepository(EmployeePenaltyEntity)
        .createQueryBuilder()
        .update(EmployeePenaltyEntity)
        .set({ payrollRecordId: null })
        .where('payroll_record_id = :payrollId', { payrollId: payroll.id })
        .execute(),
    ]);

    await Promise.all([
      manager
        .getRepository(EmployeeAdvanceEntity)
        .createQueryBuilder()
        .update(EmployeeAdvanceEntity)
        .set({ payrollRecordId: payroll.id })
        .where('employee_id = :employeeId', { employeeId: payroll.employeeId })
        .andWhere('payroll_month = :payrollMonth', { payrollMonth: payroll.payrollMonth })
        .andWhere('payroll_year = :payrollYear', { payrollYear: payroll.payrollYear })
        .andWhere('payroll_record_id IS NULL')
        .execute(),
      manager
        .getRepository(EmployeePenaltyEntity)
        .createQueryBuilder()
        .update(EmployeePenaltyEntity)
        .set({ payrollRecordId: payroll.id })
        .where('employee_id = :employeeId', { employeeId: payroll.employeeId })
        .andWhere('payroll_month = :payrollMonth', { payrollMonth: payroll.payrollMonth })
        .andWhere('payroll_year = :payrollYear', { payrollYear: payroll.payrollYear })
        .andWhere('payroll_record_id IS NULL')
        .execute(),
    ]);
  }
}
