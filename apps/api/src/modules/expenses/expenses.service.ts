import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';
import { BankAccountEntity } from '../bank-accounts/entities/bank-account.entity';
import {
  BankAccountTransactionDirection,
  BankAccountTransactionEntity,
  BankAccountTransactionType,
} from '../bank-account-transactions/entities/bank-account-transaction.entity';
import { BranchEntity } from '../branches/entities/branch.entity';
import {
  DrawerTransactionDirection,
  DrawerTransactionEntity,
  DrawerTransactionType,
} from '../drawer-transactions/entities/drawer-transaction.entity';
import { DrawerEntity } from '../drawers/entities/drawer.entity';
import { ExpenseCategoryEntity } from '../expense-categories/entities/expense-category.entity';
import { ExpenseTemplateEntity } from '../expense-templates/entities/expense-template.entity';
import { FinancialPaymentMethod, PaymentAllocationDto } from '../shared/payment-allocation.dto';
import { UndoActionEntity } from '../undo-actions/entities/undo-action.entity';
import { UndoActionsService } from '../undo-actions/undo-actions.service';
import { VaultTransactionDirection, VaultTransactionType } from '../vaults/entities/vault-transaction.entity';
import { VaultsService } from '../vaults/vaults.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseEntity, ExpensePaymentAllocation } from './entities/expense.entity';
import { ExpensePaymentMethod } from './expense-shared';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(ExpenseEntity)
    private readonly expenseRepository: Repository<ExpenseEntity>,
    @InjectRepository(BranchEntity)
    private readonly branchRepository: Repository<BranchEntity>,
    @InjectRepository(ExpenseCategoryEntity)
    private readonly expenseCategoryRepository: Repository<ExpenseCategoryEntity>,
    @InjectRepository(ExpenseTemplateEntity)
    private readonly expenseTemplateRepository: Repository<ExpenseTemplateEntity>,
    @InjectRepository(DrawerEntity)
    private readonly drawerRepository: Repository<DrawerEntity>,
    @InjectRepository(BankAccountEntity)
    private readonly bankAccountRepository: Repository<BankAccountEntity>,
    private readonly vaultsService: VaultsService,
    private readonly undoActionsService: UndoActionsService,
  ) {}

  findAll(filters: {
    search?: string;
    branchId?: string;
    categoryId?: string;
    paymentMethod?: ExpensePaymentMethod;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const query = this.expenseRepository
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.branch', 'branch')
      .leftJoinAndSelect('expense.expenseCategory', 'expenseCategory')
      .leftJoinAndSelect('expense.template', 'template')
      .leftJoinAndSelect('expense.drawer', 'drawer')
      .leftJoinAndSelect('expense.bankAccount', 'bankAccount')
      .orderBy('expense.expenseDate', 'DESC')
      .addOrderBy('expense.expenseNumber', 'DESC');

    if (filters.branchId) query.andWhere('expense.branch_id = :branchId', { branchId: filters.branchId });
    if (filters.categoryId) {
      query.andWhere('expense.expense_category_id = :categoryId', { categoryId: filters.categoryId });
    }
    if (filters.paymentMethod) {
      query.andWhere('expense.payment_method = :paymentMethod', { paymentMethod: filters.paymentMethod });
    }
    if (filters.dateFrom) query.andWhere('expense.expense_date >= :dateFrom', { dateFrom: filters.dateFrom });
    if (filters.dateTo) query.andWhere('expense.expense_date <= :dateTo', { dateTo: filters.dateTo });

    const search = filters.search?.trim();
    if (search) {
      query.andWhere('(expense.expense_number ILIKE :search OR expense.title ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    return query.getMany();
  }

  async findByIdOrFail(id: string) {
    const expense = await this.expenseRepository.findOne({ where: { id } });
    if (!expense) throw new NotFoundException('Expense was not found.');
    return expense;
  }

  async create(createExpenseDto: CreateExpenseDto) {
    await this.ensureNumberIsAvailable(createExpenseDto.expenseNumber);
    const expenseCategoryId = createExpenseDto.expenseCategoryId ?? (await this.getDefaultExpenseCategory()).id;
    const paymentAllocations = await this.resolvePaymentAllocations({
      branchId: createExpenseDto.branchId,
      amount: createExpenseDto.amount,
      payments: createExpenseDto.payments,
      paymentMethod: createExpenseDto.paymentMethod,
      drawerId: createExpenseDto.drawerId,
      bankAccountId: createExpenseDto.bankAccountId,
    });
    const paymentMethod = this.resolveExpensePaymentMethod(paymentAllocations, createExpenseDto.paymentMethod);
    const primaryAllocation = paymentAllocations[0] ?? null;

    await this.validateReferences({
      ...createExpenseDto,
      expenseCategoryId,
      paymentMethod,
    });

    const expenseNumber = createExpenseDto.expenseNumber?.toUpperCase() ?? (await this.generateExpenseNumber());
    const category = await this.expenseCategoryRepository.findOneOrFail({ where: { id: expenseCategoryId } });
    const expense = this.expenseRepository.create({
      ...createExpenseDto,
      expenseNumber,
      expenseCategoryId,
      title: createExpenseDto.title?.trim() || category.name,
      paymentMethod,
      drawerId: primaryAllocation?.drawerId ?? null,
      bankAccountId: primaryAllocation?.bankAccountId ?? null,
      vaultId: primaryAllocation?.vaultId ?? null,
      paymentAllocations,
      isFixed: createExpenseDto.isFixed ?? category.isFixed,
      templateId: createExpenseDto.templateId ?? null,
      notes: createExpenseDto.notes ?? null,
    });

    return this.dataSource.transaction(async (manager) => {
      const savedExpense = await manager.getRepository(ExpenseEntity).save(expense);
      await this.recreateFinancialMovement(savedExpense, manager);
      return savedExpense;
    });
  }

  async update(id: string, updateExpenseDto: UpdateExpenseDto) {
    const expense = await this.findByIdOrFail(id);
    await this.ensureNumberIsAvailable(updateExpenseDto.expenseNumber, id);
    const nextExpense = { ...expense, ...updateExpenseDto };
    const paymentAllocations = await this.resolvePaymentAllocations({
      branchId: nextExpense.branchId,
      amount: nextExpense.amount,
      payments: updateExpenseDto.payments ?? expense.paymentAllocations ?? undefined,
      paymentMethod: nextExpense.paymentMethod,
      drawerId: nextExpense.drawerId,
      bankAccountId: nextExpense.bankAccountId,
    });
    const paymentMethod = this.resolveExpensePaymentMethod(paymentAllocations, nextExpense.paymentMethod);
    const primaryAllocation = paymentAllocations[0] ?? null;

    await this.validateReferences({
      ...nextExpense,
      paymentMethod,
    });

    Object.assign(expense, {
      ...updateExpenseDto,
      paymentMethod,
      drawerId: primaryAllocation?.drawerId ?? null,
      bankAccountId: primaryAllocation?.bankAccountId ?? null,
      vaultId: primaryAllocation?.vaultId ?? null,
      paymentAllocations,
      expenseNumber: updateExpenseDto.expenseNumber?.toUpperCase() ?? expense.expenseNumber,
    });

    return this.dataSource.transaction(async (manager) => {
      const savedExpense = await manager.getRepository(ExpenseEntity).save(expense);
      await this.recreateFinancialMovement(savedExpense, manager);
      return savedExpense;
    });
  }

  async remove(id: string, reverseFinancialEffect = false, vaultId?: string | null) {
    const expense = await this.findByIdOrFail(id);
    await this.dataSource.transaction(async (manager) => {
      if (reverseFinancialEffect) {
        await this.recordFinancialReversalToVault(expense, vaultId, manager);
      } else {
        await this.deleteFinancialMovement(expense.id, manager);
      }
      await manager.getRepository(ExpenseEntity).remove(expense);
      await this.undoActionsService.record({
        actionType: reverseFinancialEffect ? 'delete_with_vault_reversal' : 'delete_only',
        entityType: 'expense',
        entityId: expense.id,
        recordSummary: `${expense.expenseNumber} - ${expense.title}`,
        snapshot: this.toSnapshot(expense),
        reverseToVault: reverseFinancialEffect,
        vaultTransactionSourceType: reverseFinancialEffect ? 'expense_vault_reversal' : null,
        vaultTransactionSourceId: reverseFinancialEffect ? expense.id : null,
      });
    });

    return { id };
  }

  async restoreFromUndo(action: UndoActionEntity) {
    const restoredExpense = this.expenseRepository.create(action.snapshot as Partial<ExpenseEntity>);

    return this.dataSource.transaction(async (manager) => {
      await this.vaultsService.deleteFinancialMovement('expense_vault_reversal', restoredExpense.id, manager);
      const saved = await manager.getRepository(ExpenseEntity).save(restoredExpense);
      await this.recreateFinancialMovement(saved, manager);
      return saved;
    });
  }

  private async recreateFinancialMovement(expense: ExpenseEntity, manager = this.dataSource.manager) {
    await this.deleteFinancialMovement(expense.id, manager);
    const allocations = expense.paymentAllocations ?? this.legacyExpenseAllocations(expense);

    for (const allocation of allocations) {
      if (allocation.paymentMethod === FinancialPaymentMethod.Cash && allocation.drawerId) {
        await manager.getRepository(DrawerTransactionEntity).save({
          drawerId: allocation.drawerId,
          branchId: expense.branchId,
          transactionDate: expense.expenseDate,
          transactionType: DrawerTransactionType.ExpenseCash,
          direction: DrawerTransactionDirection.Out,
          amount: allocation.amount,
          sourceType: 'expense',
          sourceId: expense.id,
          description: `مصروف ${expense.expenseNumber} - ${expense.title}`,
          notes: allocation.notes ?? expense.notes,
        });
      }
      if (allocation.paymentMethod === FinancialPaymentMethod.Bank && allocation.bankAccountId) {
        await manager.getRepository(BankAccountTransactionEntity).save({
          bankAccountId: allocation.bankAccountId,
          transactionDate: expense.expenseDate,
          transactionType: BankAccountTransactionType.ExpenseBank,
          direction: BankAccountTransactionDirection.Outgoing,
          amount: allocation.amount,
          branchId: expense.branchId,
          sourceType: 'expense',
          sourceId: expense.id,
          referenceNumber: allocation.referenceNumber ?? expense.expenseNumber,
          description: `مصروف ${expense.expenseNumber} - ${expense.title}`,
          notes: allocation.notes ?? expense.notes,
        });
      }
      if (allocation.paymentMethod === FinancialPaymentMethod.Vault && allocation.vaultId) {
        await this.vaultsService.recordTransaction(
          {
            vaultId: allocation.vaultId,
            transactionDate: expense.expenseDate,
            transactionType: VaultTransactionType.ExpensePayment,
            direction: VaultTransactionDirection.Out,
            amount: allocation.amount,
            branchId: expense.branchId,
            sourceType: 'expense',
            sourceId: expense.id,
            referenceNumber: allocation.referenceNumber ?? expense.expenseNumber,
            description: `مصروف ${expense.expenseNumber} - ${expense.title}`,
            notes: allocation.notes ?? expense.notes,
          },
          manager,
        );
      }
    }
  }

  private async recordFinancialReversal(expense: ExpenseEntity, manager = this.dataSource.manager) {
    const allocations = expense.paymentAllocations ?? this.legacyExpenseAllocations(expense);
    const today = new Date().toISOString().slice(0, 10);

    for (const allocation of allocations) {
      if (allocation.paymentMethod === FinancialPaymentMethod.Cash && allocation.drawerId) {
        await manager.getRepository(DrawerTransactionEntity).save({
          drawerId: allocation.drawerId,
          branchId: expense.branchId,
          transactionDate: today,
          transactionType: DrawerTransactionType.ExpenseCashReversal,
          direction: DrawerTransactionDirection.In,
          amount: allocation.amount,
          sourceType: 'expense_reversal',
          sourceId: expense.id,
          description: `عكس مصروف ${expense.expenseNumber} - ${expense.title}`,
          notes: allocation.notes ?? expense.notes,
        });
      }

      if (allocation.paymentMethod === FinancialPaymentMethod.Bank && allocation.bankAccountId) {
        await manager.getRepository(BankAccountTransactionEntity).save({
          bankAccountId: allocation.bankAccountId,
          transactionDate: today,
          transactionType: BankAccountTransactionType.ExpenseBankReversal,
          direction: BankAccountTransactionDirection.Incoming,
          amount: allocation.amount,
          branchId: expense.branchId,
          sourceType: 'expense_reversal',
          sourceId: expense.id,
          referenceNumber: allocation.referenceNumber ?? expense.expenseNumber,
          description: `عكس مصروف ${expense.expenseNumber} - ${expense.title}`,
          notes: allocation.notes ?? expense.notes,
        });
      }
      if (allocation.paymentMethod === FinancialPaymentMethod.Vault && allocation.vaultId) {
        await this.vaultsService.recordTransaction(
          {
            vaultId: allocation.vaultId,
            transactionDate: today,
            transactionType: VaultTransactionType.ExpensePayment,
            direction: VaultTransactionDirection.In,
            amount: allocation.amount,
            branchId: expense.branchId,
            sourceType: 'expense_reversal',
            sourceId: expense.id,
            referenceNumber: allocation.referenceNumber ?? expense.expenseNumber,
            description: `عكس مصروف ${expense.expenseNumber} - ${expense.title}`,
            notes: allocation.notes ?? expense.notes,
          },
          manager,
        );
      }
    }
  }

  private async recordFinancialReversalToVault(
    expense: ExpenseEntity,
    vaultId?: string | null,
    manager = this.dataSource.manager,
  ) {
    const allocations = expense.paymentAllocations ?? this.legacyExpenseAllocations(expense);
    const total = this.roundMoney(allocations.reduce((sum, allocation) => sum + allocation.amount, 0));

    if (total <= 0) {
      return;
    }

    await this.deleteFinancialMovement(expense.id, manager);
    await this.vaultsService.recordFinancialReturnToVault(
      {
        vaultId,
        amount: total,
        branchId: expense.branchId,
        sourceType: 'expense_vault_reversal',
        sourceId: expense.id,
        referenceNumber: expense.expenseNumber,
        description: `استرجاع مصروف إلى الخزنة ${expense.expenseNumber} - ${expense.title}`,
        notes: expense.notes,
      },
      manager,
    );
  }

  private async deleteFinancialMovement(expenseId: string, manager = this.dataSource.manager) {
    await Promise.all([
      manager.getRepository(DrawerTransactionEntity).delete({ sourceType: 'expense', sourceId: expenseId }),
      manager.getRepository(BankAccountTransactionEntity).delete({ sourceType: 'expense', sourceId: expenseId }),
      this.vaultsService.deleteFinancialMovement('expense', expenseId, manager),
    ]);
  }

  private async validateReferences(data: {
    branchId: string;
    expenseCategoryId: string;
    paymentMethod: ExpensePaymentMethod;
    templateId?: string | null;
  }) {
    const [branch, category] = await Promise.all([
      this.branchRepository.findOne({ where: { id: data.branchId } }),
      this.expenseCategoryRepository.findOne({ where: { id: data.expenseCategoryId } }),
    ]);

    if (!branch) throw new NotFoundException('Branch was not found.');
    if (!category) throw new NotFoundException('Expense category was not found.');

    if (data.templateId) {
      const template = await this.expenseTemplateRepository.findOne({ where: { id: data.templateId } });
      if (!template) throw new NotFoundException('Expense template was not found.');
    }
  }

  private async resolvePaymentAllocations(data: {
    branchId: string;
    amount: number;
    payments?: PaymentAllocationDto[] | ExpensePaymentAllocation[];
    paymentMethod?: ExpensePaymentMethod;
    drawerId?: string | null;
    bankAccountId?: string | null;
  }): Promise<ExpensePaymentAllocation[]> {
    const rawPayments =
      data.payments?.length
        ? data.payments
        : data.paymentMethod === ExpensePaymentMethod.Cash || data.paymentMethod === ExpensePaymentMethod.Bank
          ? [
              {
                paymentMethod:
                  data.paymentMethod === ExpensePaymentMethod.Cash
                    ? FinancialPaymentMethod.Cash
                    : FinancialPaymentMethod.Bank,
                drawerId: data.drawerId,
                bankAccountId: data.bankAccountId,
                amount: data.amount,
              },
            ]
          : [];
    const allocations = rawPayments
      .map((payment) => ({
        paymentMethod: payment.paymentMethod,
        drawerId: payment.paymentMethod === FinancialPaymentMethod.Cash ? payment.drawerId ?? null : null,
        bankAccountId: payment.paymentMethod === FinancialPaymentMethod.Bank ? payment.bankAccountId ?? null : null,
        vaultId: payment.paymentMethod === FinancialPaymentMethod.Vault ? payment.vaultId ?? null : null,
        amount: this.roundMoney(Number(payment.amount ?? 0)),
        paymentDate: payment.paymentDate ?? null,
        referenceNumber: payment.referenceNumber ?? null,
        notes: payment.notes ?? null,
      }))
      .filter((payment) => payment.amount > 0);

    for (const allocation of allocations) {
      if (allocation.paymentMethod === FinancialPaymentMethod.Cash && !allocation.drawerId) {
        const branchDrawer = await this.drawerRepository.findOne({ where: { branchId: data.branchId } });
        allocation.drawerId = branchDrawer?.id ?? null;
      }
    }

    const paidTotal = this.roundMoney(allocations.reduce((sum, allocation) => sum + allocation.amount, 0));
    if (paidTotal !== this.roundMoney(data.amount)) {
      throw new BadRequestException('Expense payment rows must equal the expense amount.');
    }

    await this.validatePaymentAllocations(data.branchId, allocations);
    return allocations;
  }

  private resolveExpensePaymentMethod(
    allocations: ExpensePaymentAllocation[],
    fallback?: ExpensePaymentMethod,
  ): ExpensePaymentMethod {
    if (allocations.length === 0) return fallback ?? ExpensePaymentMethod.Other;
    const hasCash = allocations.some((allocation) => allocation.paymentMethod === FinancialPaymentMethod.Cash);
    const hasBank = allocations.some((allocation) => allocation.paymentMethod === FinancialPaymentMethod.Bank);
    const hasVault = allocations.some((allocation) => allocation.paymentMethod === FinancialPaymentMethod.Vault);
    if ([hasCash, hasBank, hasVault].filter(Boolean).length > 1) return ExpensePaymentMethod.Other;
    if (hasCash) return ExpensePaymentMethod.Cash;
    if (hasBank) return ExpensePaymentMethod.Bank;
    return ExpensePaymentMethod.Vault;
  }

  private async validatePaymentAllocations(branchId: string, allocations: ExpensePaymentAllocation[]) {
    for (const allocation of allocations) {
      if (allocation.paymentMethod === FinancialPaymentMethod.Cash) {
        if (!allocation.drawerId) throw new BadRequestException('Cash expense payment rows require drawerId.');
        const drawer = await this.drawerRepository.findOne({ where: { id: allocation.drawerId } });
        if (!drawer) throw new NotFoundException('Drawer was not found.');
        if (drawer.branchId !== branchId) throw new BadRequestException('Cash drawer branch must match the expense branch.');
      }

      if (allocation.paymentMethod === FinancialPaymentMethod.Bank) {
        if (!allocation.bankAccountId) throw new BadRequestException('Bank expense payment rows require bankAccountId.');
        const bankAccount = await this.bankAccountRepository.findOne({ where: { id: allocation.bankAccountId } });
        if (!bankAccount) throw new NotFoundException('Bank account was not found.');
      }
      if (allocation.paymentMethod === FinancialPaymentMethod.Vault) {
        if (!allocation.vaultId) throw new BadRequestException('Vault expense payment rows require vaultId.');
        await this.vaultsService.findEntityByIdOrFail(allocation.vaultId);
      }
    }
  }

  private legacyExpenseAllocations(expense: ExpenseEntity): ExpensePaymentAllocation[] {
    if (expense.paymentMethod === ExpensePaymentMethod.Cash && expense.drawerId) {
      return [{ paymentMethod: FinancialPaymentMethod.Cash, drawerId: expense.drawerId, amount: expense.amount }];
    }

    if (expense.paymentMethod === ExpensePaymentMethod.Bank && expense.bankAccountId) {
      return [{ paymentMethod: FinancialPaymentMethod.Bank, bankAccountId: expense.bankAccountId, amount: expense.amount }];
    }

    if (expense.paymentMethod === ExpensePaymentMethod.Vault && expense.vaultId) {
      return [{ paymentMethod: FinancialPaymentMethod.Vault, vaultId: expense.vaultId, amount: expense.amount }];
    }

    return [];
  }

  private async ensureNumberIsAvailable(expenseNumber?: string, currentId?: string) {
    if (!expenseNumber) return;
    const existingExpense = await this.expenseRepository.findOne({ where: { expenseNumber: ILike(expenseNumber) } });
    if (existingExpense && existingExpense.id !== currentId) {
      throw new ConflictException('An expense with this number already exists.');
    }
  }

  private async generateExpenseNumber() {
    const today = new Date();
    const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.expenseRepository.count();
    return `EX-${yyyymmdd}-${String(count + 1).padStart(5, '0')}`;
  }

  private async getDefaultExpenseCategory() {
    const existingCategory = await this.expenseCategoryRepository.findOne({ where: { name: ILike('عام') } });
    if (existingCategory) return existingCategory;

    const category = this.expenseCategoryRepository.create({
      name: 'عام',
      isFixed: false,
      notes: 'تصنيف افتراضي تم إنشاؤه تلقائيا.',
    });

    return this.expenseCategoryRepository.save(category);
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private toSnapshot(expense: ExpenseEntity) {
    return {
      id: expense.id,
      expenseNumber: expense.expenseNumber,
      expenseDate: expense.expenseDate,
      branchId: expense.branchId,
      expenseCategoryId: expense.expenseCategoryId,
      templateId: expense.templateId,
      title: expense.title,
      amount: expense.amount,
      paymentMethod: expense.paymentMethod,
      drawerId: expense.drawerId,
      bankAccountId: expense.bankAccountId,
      vaultId: expense.vaultId,
      paymentAllocations: expense.paymentAllocations,
      isFixed: expense.isFixed,
      notes: expense.notes,
    };
  }
}
