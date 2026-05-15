import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { DailySalesClosingService, DailySalesClosingOperationChange } from '../daily-sales/daily-sales-closing.service';
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
import { EmployeeAdvanceEntity, EmployeeObligationStatus } from '../employee-advances/entities/employee-advance.entity';
import {
  EmployeePenaltyEntity,
  EmployeePenaltyStatus,
  EmployeePenaltyType,
} from '../employee-penalties/entities/employee-penalty.entity';
import { EmployeeEntity } from '../employees/entities/employee.entity';
import { PayrollRecordEntity } from '../payroll/entities/payroll-record.entity';
import { ReportExportService } from '../reports/report-export.service';
import { ReportResult } from '../reports/reports.types';
import { SettingsService } from '../settings/settings.service';
import { VaultTransactionDirection, VaultTransactionType } from '../vaults/entities/vault-transaction.entity';
import { VaultsService } from '../vaults/vaults.service';
import { CreateEmployeeDebtDto } from './dto/create-employee-debt.dto';
import { CreateObligationRepaymentDto } from './dto/create-obligation-repayment.dto';
import { UpdateEmployeeDebtDto } from './dto/update-employee-debt.dto';
import { EmployeeDebtEntity, EmployeeDebtRepaymentMode, EmployeeDebtStatus } from './entities/employee-debt.entity';
import {
  EmployeeObligationKind,
  EmployeeObligationRepaymentEntity,
  EmployeeObligationRepaymentSource,
} from './entities/employee-obligation-repayment.entity';

type MoneySource = { drawerId?: string | null; bankAccountId?: string | null; vaultId?: string | null };
type ObligationEntity = EmployeeAdvanceEntity | EmployeeDebtEntity | EmployeePenaltyEntity;

@Injectable()
export class EmployeeFinancialObligationsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(EmployeeEntity)
    private readonly employeeRepository: Repository<EmployeeEntity>,
    @InjectRepository(EmployeeAdvanceEntity)
    private readonly advanceRepository: Repository<EmployeeAdvanceEntity>,
    @InjectRepository(EmployeeDebtEntity)
    private readonly debtRepository: Repository<EmployeeDebtEntity>,
    @InjectRepository(EmployeePenaltyEntity)
    private readonly penaltyRepository: Repository<EmployeePenaltyEntity>,
    @InjectRepository(EmployeeObligationRepaymentEntity)
    private readonly repaymentRepository: Repository<EmployeeObligationRepaymentEntity>,
    @InjectRepository(DrawerEntity)
    private readonly drawerRepository: Repository<DrawerEntity>,
    @InjectRepository(BankAccountEntity)
    private readonly bankAccountRepository: Repository<BankAccountEntity>,
    private readonly vaultsService: VaultsService,
    private readonly reportExportService: ReportExportService,
    private readonly settingsService: SettingsService,
    private readonly dailySalesClosingService: DailySalesClosingService,
  ) {}

  async findAll(filters: {
    employeeId?: string;
    branchId?: string;
    obligationType?: string;
    status?: string;
    debtRepaymentMode?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const [advances, debts, penalties] = await Promise.all([
      filters.obligationType && filters.obligationType !== EmployeeObligationKind.Advance
        ? []
        : this.filteredAdvances(filters),
      filters.obligationType && filters.obligationType !== EmployeeObligationKind.Debt ? [] : this.filteredDebts(filters),
      filters.obligationType && filters.obligationType !== EmployeeObligationKind.FinancialPenalty
        ? []
        : this.filteredFinancialPenalties(filters),
    ]);

    return [
      ...advances.map((advance) => this.toRow(EmployeeObligationKind.Advance, advance, advance.advanceDate)),
      ...debts.map((debt) => this.toRow(EmployeeObligationKind.Debt, debt, debt.debtDate, debt.repaymentMode)),
      ...penalties.map((penalty) => this.toRow(EmployeeObligationKind.FinancialPenalty, penalty, penalty.penaltyDate)),
    ].sort((first, second) => second.date.localeCompare(first.date));
  }

  async getEmployeeSummary(employeeId: string) {
    const [advances, debts, penalties] = await Promise.all([
      this.advanceRepository
        .createQueryBuilder('advance')
        .select('COALESCE(SUM(advance.remaining_amount), 0)', 'total')
        .where('advance.employee_id = :employeeId', { employeeId })
        .andWhere('advance.status IN (:...statuses)', {
          statuses: [EmployeeObligationStatus.Active, EmployeeObligationStatus.PartiallyRecovered],
        })
        .getRawOne<{ total: string }>(),
      this.debtRepository
        .createQueryBuilder('debt')
        .select('COALESCE(SUM(debt.remaining_amount), 0)', 'total')
        .where('debt.employee_id = :employeeId', { employeeId })
        .andWhere('debt.status IN (:...statuses)', {
          statuses: [EmployeeDebtStatus.Active, EmployeeDebtStatus.PartiallyRecovered],
        })
        .getRawOne<{ total: string }>(),
      this.penaltyRepository
        .createQueryBuilder('penalty')
        .select('COALESCE(SUM(penalty.remaining_amount), 0)', 'total')
        .where('penalty.employee_id = :employeeId', { employeeId })
        .andWhere('penalty.penalty_type = :type', { type: EmployeePenaltyType.Financial })
        .andWhere('penalty.status IN (:...statuses)', {
          statuses: [EmployeePenaltyStatus.Active, EmployeePenaltyStatus.PartiallyRecovered],
        })
        .getRawOne<{ total: string }>(),
    ]);

    const outstandingAdvances = this.roundMoney(Number(advances?.total ?? 0));
    const outstandingDebts = this.roundMoney(Number(debts?.total ?? 0));
    const outstandingFinancialPenalties = this.roundMoney(Number(penalties?.total ?? 0));

    return {
      outstandingAdvances,
      outstandingDebts,
      outstandingFinancialPenalties,
      totalOutstanding: this.roundMoney(outstandingAdvances + outstandingDebts + outstandingFinancialPenalties),
    };
  }

  async exportList(
    filters: {
      employeeId?: string;
      branchId?: string;
      obligationType?: string;
      status?: string;
      debtRepaymentMode?: string;
      dateFrom?: string;
      dateTo?: string;
    },
    format: 'excel' | 'pdf',
  ) {
    const rows = await this.findAll(filters);
    const report: ReportResult = {
      key: 'employee-financial-obligations' as any,
      title: 'تقرير الالتزامات المالية للموظفين',
      description: 'السلف والديون والغرامات المالية حسب الفلاتر المختارة.',
      generatedAt: new Date().toISOString(),
      filters,
      summaries: [
        { key: 'total_remaining', label: 'إجمالي المتبقي', value: this.roundMoney(rows.reduce((sum, row) => sum + row.remainingAmount, 0)), type: 'money' },
        { key: 'total_recovered', label: 'إجمالي المحصل', value: this.roundMoney(rows.reduce((sum, row) => sum + row.recoveredAmount, 0)), type: 'money' },
      ],
      columns: [
        { key: 'date', label: 'التاريخ', type: 'date' },
        { key: 'employeeName', label: 'الموظف', type: 'text' },
        { key: 'typeLabel', label: 'نوع الالتزام', type: 'text' },
        { key: 'statusLabel', label: 'الحالة', type: 'status' },
        { key: 'originalAmount', label: 'المبلغ الأصلي', type: 'money' },
        { key: 'recoveredAmount', label: 'المحصل', type: 'money' },
        { key: 'remainingAmount', label: 'المتبقي', type: 'money' },
      ],
      rows: rows.map((row) => ({
        date: row.date,
        employeeName: row.employee?.fullName ?? '',
        typeLabel: this.obligationTypeLabel(row.obligationType),
        statusLabel: this.statusLabel(row.status),
        originalAmount: row.originalAmount,
        recoveredAmount: row.recoveredAmount,
        remainingAmount: row.remainingAmount,
      })),
    };
    const currencySettings = await this.getCurrencySettings();
    return this.reportExportService.exportReport(report, format, currencySettings);
  }

  async createDebt(dto: CreateEmployeeDebtDto) {
    const employee = await this.findEmployee(dto.employeeId);
    const source = await this.resolveOneSource(dto);
    const amount = this.roundMoney(Number(dto.amount));
    const debt = this.debtRepository.create({
      employeeId: employee.id,
      debtDate: dto.debtDate,
      amount,
      recoveredAmount: 0,
      remainingAmount: amount,
      repaymentMode: dto.repaymentMode as EmployeeDebtRepaymentMode,
      installmentAmount: this.roundMoney(Number(dto.installmentAmount ?? 0)),
      installmentStartMonth: dto.installmentStartMonth ?? null,
      installmentStartYear: dto.installmentStartYear ?? null,
      drawerId: source.drawerId,
      bankAccountId: source.bankAccountId,
      vaultId: source.vaultId,
      status: EmployeeDebtStatus.Active,
      notes: this.normalizeText(dto.notes),
    });

    return this.dataSource.transaction(async (manager) => {
      const saved = await manager.getRepository(EmployeeDebtEntity).save(debt);
      await this.recreateDebtFinancialMovement(saved, manager);
      await this.dailySalesClosingService.recordPostCloseChanges(await this.debtClosingChanges(saved, 'created', manager), manager);
      return saved;
    });
  }

  async updateDebt(id: string, dto: UpdateEmployeeDebtDto) {
    const debt = await this.findDebt(id);
    const previousClosingChanges = await this.debtClosingChanges(debt, 'edited');
    const source =
      dto.drawerId !== undefined || dto.bankAccountId !== undefined || dto.vaultId !== undefined
        ? await this.resolveOneSource({
            drawerId: dto.drawerId !== undefined ? dto.drawerId : debt.drawerId,
            bankAccountId: dto.bankAccountId !== undefined ? dto.bankAccountId : debt.bankAccountId,
            vaultId: dto.vaultId !== undefined ? dto.vaultId : debt.vaultId,
          })
        : { drawerId: debt.drawerId, bankAccountId: debt.bankAccountId, vaultId: debt.vaultId };

    if (dto.employeeId) await this.findEmployee(dto.employeeId);

    const amount = dto.amount !== undefined ? this.roundMoney(Number(dto.amount)) : debt.amount;
    const recoveredAmount = Math.min(debt.recoveredAmount, amount);
    Object.assign(debt, {
      employeeId: dto.employeeId ?? debt.employeeId,
      debtDate: dto.debtDate ?? debt.debtDate,
      amount,
      recoveredAmount,
      remainingAmount: this.roundMoney(amount - recoveredAmount),
      repaymentMode: dto.repaymentMode ?? debt.repaymentMode,
      installmentAmount:
        dto.installmentAmount !== undefined ? this.roundMoney(Number(dto.installmentAmount)) : debt.installmentAmount,
      installmentStartMonth:
        dto.installmentStartMonth !== undefined ? dto.installmentStartMonth : debt.installmentStartMonth,
      installmentStartYear: dto.installmentStartYear !== undefined ? dto.installmentStartYear : debt.installmentStartYear,
      drawerId: source.drawerId,
      bankAccountId: source.bankAccountId,
      vaultId: source.vaultId,
      notes: dto.notes !== undefined ? this.normalizeText(dto.notes) : debt.notes,
    });
    debt.status = this.resolveDebtStatus(debt);

    return this.dataSource.transaction(async (manager) => {
      const saved = await manager.getRepository(EmployeeDebtEntity).save(debt);
      await this.recreateDebtFinancialMovement(saved, manager);
      await this.dailySalesClosingService.recordPostCloseChanges(
        [...previousClosingChanges, ...(await this.debtClosingChanges(saved, 'edited', manager))],
        manager,
      );
      return saved;
    });
  }

  async cancelDebt(id: string, reverseFinancialEffect = false) {
    const debt = await this.findDebt(id);
    debt.status = EmployeeDebtStatus.Cancelled;
    return this.dataSource.transaction(async (manager) => {
      await manager.getRepository(EmployeeDebtEntity).save(debt);
      if (reverseFinancialEffect) {
        await this.recordDebtReversal(debt, manager);
      }
      await this.dailySalesClosingService.recordPostCloseChanges(await this.debtClosingChanges(debt, 'cancelled', manager), manager);
      return { id, cancelled: true };
    });
  }

  async recordManualRepayment(dto: CreateObligationRepaymentDto) {
    await this.findEmployee(dto.employeeId);
    const destination = await this.resolveOneSource(dto);
    return this.dataSource.transaction(async (manager) => {
      const obligation = await this.findObligation(dto.obligationKind, dto.obligationId, manager);
      const amount = Math.min(this.roundMoney(Number(dto.amount)), this.roundMoney(obligation.remainingAmount));
      if (amount <= 0) {
        throw new BadRequestException('لا يوجد مبلغ متبقٍ لتحصيله على هذا الالتزام.');
      }

      const repayment = manager.getRepository(EmployeeObligationRepaymentEntity).create({
        employeeId: dto.employeeId,
        obligationKind: dto.obligationKind as EmployeeObligationKind,
        obligationId: dto.obligationId,
        repaymentDate: dto.repaymentDate,
        amount,
        source: EmployeeObligationRepaymentSource.Manual,
        drawerId: destination.drawerId,
        bankAccountId: destination.bankAccountId,
        vaultId: destination.vaultId,
        referenceNumber: this.normalizeText(dto.referenceNumber),
        notes: this.normalizeText(dto.notes),
      });

      const saved = await manager.getRepository(EmployeeObligationRepaymentEntity).save(repayment);
      await this.applyRecovery(obligation, amount, manager);
      await this.recordRepaymentFinancialMovement(saved, manager);
      return saved;
    });
  }

  async applyPayrollDeductions(
    payroll: PayrollRecordEntity,
    values: {
      grossSalary: number;
      requestedDebtDeductionAmount?: number;
      requestedPenaltyDeductionAmount?: number;
    },
    manager: EntityManager,
  ) {
    await this.revertPayrollDeductions(payroll.id, manager);

    let available = this.roundMoney(values.grossSalary);
    const warnings: string[] = [];
    const applied = { advances: 0, debts: 0, penalties: 0 };

    const advances = await manager
      .getRepository(EmployeeAdvanceEntity)
      .createQueryBuilder('advance')
      .where('advance.employee_id = :employeeId', { employeeId: payroll.employeeId })
      .andWhere('advance.payroll_month = :month', { month: payroll.payrollMonth })
      .andWhere('advance.payroll_year = :year', { year: payroll.payrollYear })
      .andWhere('advance.remaining_amount > 0')
      .andWhere('advance.status IN (:...statuses)', {
        statuses: [EmployeeObligationStatus.Active, EmployeeObligationStatus.PartiallyRecovered],
      })
      .orderBy('advance.advance_date', 'ASC')
      .getMany();

    const advanceResult = await this.applyPayrollRecoveryBatch(
      payroll,
      advances,
      EmployeeObligationKind.Advance,
      available,
      manager,
    );
    applied.advances = advanceResult.applied;
    available = advanceResult.available;

    const debtRequest = this.roundMoney(Number(values.requestedDebtDeductionAmount ?? 0));
    if (debtRequest > 0) {
      const debts = await manager
        .getRepository(EmployeeDebtEntity)
        .createQueryBuilder('debt')
        .where('debt.employee_id = :employeeId', { employeeId: payroll.employeeId })
        .andWhere('debt.remaining_amount > 0')
        .andWhere('debt.status IN (:...statuses)', {
          statuses: [EmployeeDebtStatus.Active, EmployeeDebtStatus.PartiallyRecovered],
        })
        .orderBy('debt.debt_date', 'ASC')
        .getMany();
      const debtResult = await this.applyPayrollRecoveryBatch(
        payroll,
        debts,
        EmployeeObligationKind.Debt,
        Math.min(available, debtRequest),
        manager,
      );
      applied.debts = debtResult.applied;
      available = this.roundMoney(available - applied.debts);
      if (debtRequest > applied.debts) warnings.push('لم يكفِ الراتب لخصم كامل مبلغ الديون المطلوب.');
    }

    const penaltyRequest = this.roundMoney(Number(values.requestedPenaltyDeductionAmount ?? 0));
    if (penaltyRequest > 0) {
      const penalties = await manager
        .getRepository(EmployeePenaltyEntity)
        .createQueryBuilder('penalty')
        .where('penalty.employee_id = :employeeId', { employeeId: payroll.employeeId })
        .andWhere('penalty.penalty_type = :type', { type: EmployeePenaltyType.Financial })
        .andWhere('penalty.remaining_amount > 0')
        .andWhere('penalty.status IN (:...statuses)', {
          statuses: [EmployeePenaltyStatus.Active, EmployeePenaltyStatus.PartiallyRecovered],
        })
        .orderBy('penalty.penalty_date', 'ASC')
        .getMany();
      const penaltyResult = await this.applyPayrollRecoveryBatch(
        payroll,
        penalties,
        EmployeeObligationKind.FinancialPenalty,
        Math.min(available, penaltyRequest),
        manager,
      );
      applied.penalties = penaltyResult.applied;
      available = this.roundMoney(available - applied.penalties);
      if (penaltyRequest > applied.penalties) warnings.push('لم يكفِ الراتب لخصم كامل مبلغ الغرامات المطلوب.');
    }

    return { ...applied, warnings };
  }

  private async filteredAdvances(filters: { employeeId?: string; branchId?: string; status?: string; dateFrom?: string; dateTo?: string }) {
    const query = this.advanceRepository.createQueryBuilder('advance').leftJoinAndSelect('advance.employee', 'employee');
    if (filters.employeeId) query.andWhere('advance.employee_id = :employeeId', { employeeId: filters.employeeId });
    if (filters.branchId) query.andWhere('employee.default_branch_id = :branchId', { branchId: filters.branchId });
    if (filters.status) query.andWhere('advance.status = :status', { status: filters.status });
    if (filters.dateFrom) query.andWhere('advance.advance_date >= :dateFrom', { dateFrom: filters.dateFrom });
    if (filters.dateTo) query.andWhere('advance.advance_date <= :dateTo', { dateTo: filters.dateTo });
    return query.getMany();
  }

  private async filteredDebts(filters: {
    employeeId?: string;
    branchId?: string;
    status?: string;
    debtRepaymentMode?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const query = this.debtRepository.createQueryBuilder('debt').leftJoinAndSelect('debt.employee', 'employee');
    if (filters.employeeId) query.andWhere('debt.employee_id = :employeeId', { employeeId: filters.employeeId });
    if (filters.branchId) query.andWhere('employee.default_branch_id = :branchId', { branchId: filters.branchId });
    if (filters.status) query.andWhere('debt.status = :status', { status: filters.status });
    if (filters.debtRepaymentMode) query.andWhere('debt.repayment_mode = :mode', { mode: filters.debtRepaymentMode });
    if (filters.dateFrom) query.andWhere('debt.debt_date >= :dateFrom', { dateFrom: filters.dateFrom });
    if (filters.dateTo) query.andWhere('debt.debt_date <= :dateTo', { dateTo: filters.dateTo });
    return query.getMany();
  }

  private async filteredFinancialPenalties(filters: { employeeId?: string; branchId?: string; status?: string; dateFrom?: string; dateTo?: string }) {
    const query = this.penaltyRepository
      .createQueryBuilder('penalty')
      .leftJoinAndSelect('penalty.employee', 'employee')
      .where('penalty.penalty_type = :type', { type: EmployeePenaltyType.Financial });
    if (filters.employeeId) query.andWhere('penalty.employee_id = :employeeId', { employeeId: filters.employeeId });
    if (filters.branchId) query.andWhere('employee.default_branch_id = :branchId', { branchId: filters.branchId });
    if (filters.status) query.andWhere('penalty.status = :status', { status: filters.status });
    if (filters.dateFrom) query.andWhere('penalty.penalty_date >= :dateFrom', { dateFrom: filters.dateFrom });
    if (filters.dateTo) query.andWhere('penalty.penalty_date <= :dateTo', { dateTo: filters.dateTo });
    return query.getMany();
  }

  private toRow(kind: EmployeeObligationKind, item: ObligationEntity, date: string, debtRepaymentMode?: string) {
    return {
      id: item.id,
      obligationType: kind,
      employeeId: item.employeeId,
      employee: item.employee,
      branchId: item.employee?.defaultBranchId ?? null,
      date,
      originalAmount: item.amount,
      recoveredAmount: item.recoveredAmount,
      remainingAmount: item.remainingAmount,
      status: item.status,
      debtRepaymentMode: debtRepaymentMode ?? null,
      notes: item.notes,
    };
  }

  private obligationTypeLabel(type: string) {
    if (type === EmployeeObligationKind.Advance) return 'سلفة';
    if (type === EmployeeObligationKind.Debt) return 'دين';
    return 'غرامة مالية';
  }

  private statusLabel(status: string) {
    const labels: Record<string, string> = {
      active: 'نشط',
      partially_recovered: 'محصل جزئيًا',
      settled: 'مسدد',
      cancelled: 'ملغى',
    };
    return labels[status] ?? status;
  }

  private async getCurrencySettings() {
    const settings = await this.settingsService.findAll();
    const financeGroup = settings.groups.find((group) => group.key === 'finance');
    const currencySymbolField = financeGroup?.fields.find((field) => field.key === 'currencySymbol');
    const decimalPlacesField = financeGroup?.fields.find((field) => field.key === 'decimalPlaces');
    return {
      currencySymbol: String(currencySymbolField?.value ?? currencySymbolField?.defaultValue ?? 'ر.س').trim() || 'ر.س',
      decimalPlaces: Number(decimalPlacesField?.value ?? decimalPlacesField?.defaultValue ?? 2) || 2,
    };
  }

  private async findEmployee(employeeId: string) {
    const employee = await this.employeeRepository.findOne({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('الموظف غير موجود.');
    return employee;
  }

  private async findDebt(id: string) {
    const debt = await this.debtRepository.findOne({ where: { id } });
    if (!debt) throw new NotFoundException('الدين غير موجود.');
    return debt;
  }

  private async resolveOneSource(source: MoneySource) {
    const count = [source.drawerId, source.bankAccountId, source.vaultId].filter(Boolean).length;
    if (count !== 1) {
      throw new BadRequestException('يجب اختيار جهة مالية واحدة فقط: درج أو خزنة أو حساب بنكي.');
    }
    if (source.drawerId) {
      const drawer = await this.drawerRepository.findOne({ where: { id: source.drawerId } });
      if (!drawer) throw new NotFoundException('الدرج غير موجود.');
      return { drawerId: drawer.id, bankAccountId: null, vaultId: null };
    }
    if (source.bankAccountId) {
      const account = await this.bankAccountRepository.findOne({ where: { id: source.bankAccountId } });
      if (!account) throw new NotFoundException('الحساب البنكي غير موجود.');
      return { drawerId: null, bankAccountId: account.id, vaultId: null };
    }
    await this.vaultsService.findEntityByIdOrFail(source.vaultId!);
    return { drawerId: null, bankAccountId: null, vaultId: source.vaultId! };
  }

  private async recreateDebtFinancialMovement(debt: EmployeeDebtEntity, manager: EntityManager) {
    await Promise.all([
      manager.getRepository(DrawerTransactionEntity).delete({ sourceType: 'employee_debt', sourceId: debt.id }),
      manager.getRepository(BankAccountTransactionEntity).delete({ sourceType: 'employee_debt', sourceId: debt.id }),
      this.vaultsService.deleteFinancialMovement('employee_debt', debt.id, manager),
    ]);

    const description = `دين موظف ${debt.employee?.fullName ?? debt.employeeId}`;
    if (debt.drawerId) {
      const drawer = await manager.getRepository(DrawerEntity).findOne({ where: { id: debt.drawerId } });
      if (!drawer) throw new NotFoundException('الدرج غير موجود.');
      await manager.getRepository(DrawerTransactionEntity).save({
        drawerId: drawer.id,
        branchId: drawer.branchId,
        transactionDate: debt.debtDate,
        transactionType: DrawerTransactionType.EmployeeDebtCash,
        direction: DrawerTransactionDirection.Out,
        amount: debt.amount,
        sourceType: 'employee_debt',
        sourceId: debt.id,
        description,
        notes: debt.notes,
      });
    }
    if (debt.bankAccountId) {
      const account = await manager.getRepository(BankAccountEntity).findOne({ where: { id: debt.bankAccountId } });
      if (!account) throw new NotFoundException('الحساب البنكي غير موجود.');
      await manager.getRepository(BankAccountTransactionEntity).save({
        bankAccountId: account.id,
        branchId: account.branchId ?? debt.employee?.defaultBranchId ?? null,
        transactionDate: debt.debtDate,
        transactionType: BankAccountTransactionType.EmployeeDebtBank,
        direction: BankAccountTransactionDirection.Outgoing,
        amount: debt.amount,
        sourceType: 'employee_debt',
        sourceId: debt.id,
        description,
        referenceNumber: null,
        notes: debt.notes,
      });
    }
    if (debt.vaultId) {
      await this.vaultsService.recordTransaction(
        {
          vaultId: debt.vaultId,
          transactionDate: debt.debtDate,
          transactionType: VaultTransactionType.EmployeeDebt,
          direction: VaultTransactionDirection.Out,
          amount: debt.amount,
          branchId: debt.vault?.branchId ?? debt.employee?.defaultBranchId ?? null,
          sourceType: 'employee_debt',
          sourceId: debt.id,
          description,
          notes: debt.notes,
        },
        manager,
      );
    }
  }

  private async debtClosingChanges(
    debt: EmployeeDebtEntity,
    actionType: DailySalesClosingOperationChange['actionType'],
    manager: EntityManager = this.dataSource.manager,
  ): Promise<DailySalesClosingOperationChange[]> {
    const branchId = await this.branchIdFromSource(
      { drawerId: debt.drawerId, bankAccountId: debt.bankAccountId, vaultId: debt.vaultId },
      manager,
    );
    return [
      {
        branchId,
        effectiveDate: debt.debtDate,
        operationType: 'employee_debt',
        actionType,
        amount: Number(debt.amount ?? 0),
        reference: debt.employee?.fullName ?? debt.employeeId,
        operationId: debt.id,
      },
    ];
  }

  private async branchIdFromSource(
    source: { drawerId?: string | null; bankAccountId?: string | null; vaultId?: string | null },
    manager: EntityManager,
  ) {
    if (source.drawerId) return (await manager.getRepository(DrawerEntity).findOne({ where: { id: source.drawerId } }))?.branchId ?? null;
    if (source.bankAccountId) return (await manager.getRepository(BankAccountEntity).findOne({ where: { id: source.bankAccountId } }))?.branchId ?? null;
    if (source.vaultId) return (await this.vaultsService.findEntityByIdOrFail(source.vaultId))?.branchId ?? null;
    return null;
  }

  private async recordDebtReversal(debt: EmployeeDebtEntity, manager: EntityManager) {
    const sourceType = 'employee_debt_reversal';
    const existing = await Promise.all([
      manager.getRepository(DrawerTransactionEntity).count({ where: { sourceType, sourceId: debt.id } }),
      manager.getRepository(BankAccountTransactionEntity).count({ where: { sourceType, sourceId: debt.id } }),
    ]);
    const vaultExisting = await manager
      .query(`SELECT COUNT(*)::int AS count FROM vault_transactions WHERE source_type = $1 AND source_id = $2`, [
        sourceType,
        debt.id,
      ])
      .then((rows: { count: number }[]) => Number(rows[0]?.count ?? 0));
    if (existing[0] + existing[1] + vaultExisting > 0) return;

    const description = `عكس أثر دين موظف ${debt.employee?.fullName ?? debt.employeeId}`;
    if (debt.drawerId) {
      const drawer = await manager.getRepository(DrawerEntity).findOne({ where: { id: debt.drawerId } });
      if (!drawer) return;
      await manager.getRepository(DrawerTransactionEntity).save({
        drawerId: drawer.id,
        branchId: drawer.branchId,
        transactionDate: new Date().toISOString().slice(0, 10),
        transactionType: DrawerTransactionType.EmployeeObligationReversalCash,
        direction: DrawerTransactionDirection.In,
        amount: debt.amount,
        sourceType,
        sourceId: debt.id,
        description,
        notes: debt.notes,
      });
    }
    if (debt.bankAccountId) {
      const account = await manager.getRepository(BankAccountEntity).findOne({ where: { id: debt.bankAccountId } });
      if (!account) return;
      await manager.getRepository(BankAccountTransactionEntity).save({
        bankAccountId: account.id,
        branchId: account.branchId ?? debt.employee?.defaultBranchId ?? null,
        transactionDate: new Date().toISOString().slice(0, 10),
        transactionType: BankAccountTransactionType.EmployeeObligationReversalBank,
        direction: BankAccountTransactionDirection.Incoming,
        amount: debt.amount,
        sourceType,
        sourceId: debt.id,
        description,
        referenceNumber: null,
        notes: debt.notes,
      });
    }
    if (debt.vaultId) {
      await this.vaultsService.recordTransaction(
        {
          vaultId: debt.vaultId,
          transactionDate: new Date().toISOString().slice(0, 10),
          transactionType: VaultTransactionType.EmployeeObligationReversal,
          direction: VaultTransactionDirection.In,
          amount: debt.amount,
          branchId: debt.vault?.branchId ?? debt.employee?.defaultBranchId ?? null,
          sourceType,
          sourceId: debt.id,
          description,
          notes: debt.notes,
        },
        manager,
      );
    }
  }

  private async recordRepaymentFinancialMovement(repayment: EmployeeObligationRepaymentEntity, manager: EntityManager) {
    const description = `تحصيل التزام موظف ${repayment.employee?.fullName ?? repayment.employeeId}`;
    if (repayment.drawerId) {
      const drawer = await manager.getRepository(DrawerEntity).findOne({ where: { id: repayment.drawerId } });
      if (!drawer) throw new NotFoundException('الدرج غير موجود.');
      await manager.getRepository(DrawerTransactionEntity).save({
        drawerId: drawer.id,
        branchId: drawer.branchId,
        transactionDate: repayment.repaymentDate,
        transactionType: DrawerTransactionType.EmployeeObligationRepaymentCash,
        direction: DrawerTransactionDirection.In,
        amount: repayment.amount,
        sourceType: 'employee_obligation_repayment',
        sourceId: repayment.id,
        description,
        notes: repayment.notes,
      });
    }
    if (repayment.bankAccountId) {
      const account = await manager.getRepository(BankAccountEntity).findOne({ where: { id: repayment.bankAccountId } });
      if (!account) throw new NotFoundException('الحساب البنكي غير موجود.');
      await manager.getRepository(BankAccountTransactionEntity).save({
        bankAccountId: account.id,
        branchId: account.branchId ?? repayment.employee?.defaultBranchId ?? null,
        transactionDate: repayment.repaymentDate,
        transactionType: BankAccountTransactionType.EmployeeObligationRepaymentBank,
        direction: BankAccountTransactionDirection.Incoming,
        amount: repayment.amount,
        sourceType: 'employee_obligation_repayment',
        sourceId: repayment.id,
        referenceNumber: repayment.referenceNumber,
        description,
        notes: repayment.notes,
      });
    }
    if (repayment.vaultId) {
      await this.vaultsService.recordTransaction(
        {
          vaultId: repayment.vaultId,
          transactionDate: repayment.repaymentDate,
          transactionType: VaultTransactionType.EmployeeObligationRepayment,
          direction: VaultTransactionDirection.In,
          amount: repayment.amount,
          branchId: repayment.employee?.defaultBranchId ?? null,
          sourceType: 'employee_obligation_repayment',
          sourceId: repayment.id,
          referenceNumber: repayment.referenceNumber,
          description,
          notes: repayment.notes,
        },
        manager,
      );
    }
  }

  private async findObligation(kind: string, obligationId: string, manager: EntityManager): Promise<ObligationEntity> {
    if (kind === EmployeeObligationKind.Advance) {
      const advance = await manager.getRepository(EmployeeAdvanceEntity).findOne({ where: { id: obligationId } });
      if (!advance) throw new NotFoundException('السلفة غير موجودة.');
      return advance;
    }
    if (kind === EmployeeObligationKind.Debt) {
      const debt = await manager.getRepository(EmployeeDebtEntity).findOne({ where: { id: obligationId } });
      if (!debt) throw new NotFoundException('الدين غير موجود.');
      return debt;
    }
    const penalty = await manager.getRepository(EmployeePenaltyEntity).findOne({ where: { id: obligationId } });
    if (!penalty || penalty.penaltyType !== EmployeePenaltyType.Financial) {
      throw new NotFoundException('الغرامة المالية غير موجودة.');
    }
    return penalty;
  }

  private async applyPayrollRecoveryBatch(
    payroll: PayrollRecordEntity,
    rows: ObligationEntity[],
    kind: EmployeeObligationKind,
    available: number,
    manager: EntityManager,
  ) {
    let applied = 0;
    let remainingAvailable = this.roundMoney(available);
    for (const row of rows) {
      if (remainingAvailable <= 0) break;
      const amount = Math.min(this.roundMoney(row.remainingAmount), remainingAvailable);
      if (amount <= 0) continue;
      await manager.getRepository(EmployeeObligationRepaymentEntity).save({
        employeeId: payroll.employeeId,
        obligationKind: kind,
        obligationId: row.id,
        repaymentDate: new Date().toISOString().slice(0, 10),
        amount,
        source: EmployeeObligationRepaymentSource.Payroll,
        payrollRecordId: payroll.id,
        notes: `خصم من راتب ${payroll.payrollMonth}/${payroll.payrollYear}`,
      });
      await this.applyRecovery(row, amount, manager);
      applied = this.roundMoney(applied + amount);
      remainingAvailable = this.roundMoney(remainingAvailable - amount);
    }
    return { applied, available: remainingAvailable };
  }

  private async applyRecovery(row: ObligationEntity, amount: number, manager: EntityManager) {
    row.recoveredAmount = this.roundMoney(row.recoveredAmount + amount);
    row.remainingAmount = Math.max(this.roundMoney(row.amount - row.recoveredAmount), 0);
    if (row instanceof EmployeeDebtEntity) {
      row.status = this.resolveDebtStatus(row);
      await manager.getRepository(EmployeeDebtEntity).save(row);
    } else if (row instanceof EmployeePenaltyEntity) {
      row.status = this.resolvePenaltyStatus(row);
      await manager.getRepository(EmployeePenaltyEntity).save(row);
    } else {
      row.status = this.resolveAdvanceStatus(row);
      await manager.getRepository(EmployeeAdvanceEntity).save(row);
    }
  }

  private async revertPayrollDeductions(payrollId: string, manager: EntityManager) {
    const repayments = await manager.getRepository(EmployeeObligationRepaymentEntity).find({ where: { payrollRecordId: payrollId } });
    for (const repayment of repayments) {
      const obligation = await this.findObligation(repayment.obligationKind, repayment.obligationId, manager);
      obligation.recoveredAmount = Math.max(this.roundMoney(obligation.recoveredAmount - repayment.amount), 0);
      obligation.remainingAmount = Math.max(this.roundMoney(obligation.amount - obligation.recoveredAmount), 0);
      if (obligation instanceof EmployeeDebtEntity) {
        obligation.status = this.resolveDebtStatus(obligation);
        await manager.getRepository(EmployeeDebtEntity).save(obligation);
      } else if (obligation instanceof EmployeePenaltyEntity) {
        obligation.status = this.resolvePenaltyStatus(obligation);
        await manager.getRepository(EmployeePenaltyEntity).save(obligation);
      } else {
        obligation.status = this.resolveAdvanceStatus(obligation);
        await manager.getRepository(EmployeeAdvanceEntity).save(obligation);
      }
    }
    await manager.getRepository(EmployeeObligationRepaymentEntity).delete({ payrollRecordId: payrollId });
  }

  private resolveAdvanceStatus(advance: EmployeeAdvanceEntity) {
    if (advance.remainingAmount <= 0) return EmployeeObligationStatus.Settled;
    if (advance.recoveredAmount > 0) return EmployeeObligationStatus.PartiallyRecovered;
    return EmployeeObligationStatus.Active;
  }

  private resolveDebtStatus(debt: EmployeeDebtEntity) {
    if (debt.remainingAmount <= 0) return EmployeeDebtStatus.Settled;
    if (debt.recoveredAmount > 0) return EmployeeDebtStatus.PartiallyRecovered;
    return EmployeeDebtStatus.Active;
  }

  private resolvePenaltyStatus(penalty: EmployeePenaltyEntity) {
    if (penalty.penaltyType === EmployeePenaltyType.NonFinancial) return EmployeePenaltyStatus.Active;
    if (penalty.remainingAmount <= 0) return EmployeePenaltyStatus.Settled;
    if (penalty.recoveredAmount > 0) return EmployeePenaltyStatus.PartiallyRecovered;
    return EmployeePenaltyStatus.Active;
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private normalizeText(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }
}
