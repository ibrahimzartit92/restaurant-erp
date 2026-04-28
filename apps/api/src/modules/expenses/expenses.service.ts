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
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseEntity } from './entities/expense.entity';
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
  ) {}

  findAll(filters: { search?: string; branchId?: string; dateFrom?: string; dateTo?: string }) {
    const query = this.expenseRepository
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.branch', 'branch')
      .leftJoinAndSelect('expense.expenseCategory', 'expenseCategory')
      .leftJoinAndSelect('expense.template', 'template')
      .leftJoinAndSelect('expense.drawer', 'drawer')
      .leftJoinAndSelect('expense.bankAccount', 'bankAccount')
      .orderBy('expense.expenseDate', 'DESC')
      .addOrderBy('expense.expenseNumber', 'DESC');

    if (filters.branchId) {
      query.andWhere('expense.branch_id = :branchId', { branchId: filters.branchId });
    }

    if (filters.dateFrom) {
      query.andWhere('expense.expense_date >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      query.andWhere('expense.expense_date <= :dateTo', { dateTo: filters.dateTo });
    }

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

    if (!expense) {
      throw new NotFoundException('Expense was not found.');
    }

    return expense;
  }

  async create(createExpenseDto: CreateExpenseDto) {
    await this.ensureNumberIsAvailable(createExpenseDto.expenseNumber);
    const expenseCategoryId = createExpenseDto.expenseCategoryId ?? (await this.getDefaultExpenseCategory()).id;
    const paymentMethod = createExpenseDto.paymentMethod ?? ExpensePaymentMethod.Other;
    const financialReferences = await this.resolveFinancialReferences({
      branchId: createExpenseDto.branchId,
      paymentMethod,
      drawerId: createExpenseDto.drawerId,
      bankAccountId: createExpenseDto.bankAccountId,
    });

    await this.validateReferences({
      ...createExpenseDto,
      expenseCategoryId,
      paymentMethod,
      ...financialReferences,
    });

    const expenseNumber = createExpenseDto.expenseNumber?.toUpperCase() ?? (await this.generateExpenseNumber());
    const category = await this.expenseCategoryRepository.findOneOrFail({
      where: { id: expenseCategoryId },
    });

    const expense = this.expenseRepository.create({
      ...createExpenseDto,
      expenseNumber,
      expenseCategoryId,
      title: createExpenseDto.title?.trim() || category.name,
      paymentMethod,
      drawerId: financialReferences.drawerId,
      bankAccountId: financialReferences.bankAccountId,
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
    const financialReferences = await this.resolveFinancialReferences(nextExpense);
    Object.assign(nextExpense, financialReferences);
    await this.validateReferences(nextExpense);

    Object.assign(expense, {
      ...updateExpenseDto,
      ...financialReferences,
      expenseNumber: updateExpenseDto.expenseNumber?.toUpperCase() ?? expense.expenseNumber,
    });

    return this.dataSource.transaction(async (manager) => {
      const savedExpense = await manager.getRepository(ExpenseEntity).save(expense);
      await this.recreateFinancialMovement(savedExpense, manager);
      return savedExpense;
    });
  }

  async remove(id: string) {
    const expense = await this.findByIdOrFail(id);
    await this.dataSource.transaction(async (manager) => {
      await this.deleteFinancialMovement(expense.id, manager);
      await manager.getRepository(ExpenseEntity).remove(expense);
    });

    return { id };
  }

  private async recreateFinancialMovement(expense: ExpenseEntity, manager = this.dataSource.manager) {
    await this.deleteFinancialMovement(expense.id, manager);

    if (expense.paymentMethod === ExpensePaymentMethod.Cash && expense.drawerId) {
      await manager.getRepository(DrawerTransactionEntity).save({
        drawerId: expense.drawerId,
        branchId: expense.branchId,
        transactionDate: expense.expenseDate,
        transactionType: DrawerTransactionType.ExpenseCash,
        direction: DrawerTransactionDirection.Out,
        amount: expense.amount,
        sourceType: 'expense',
        sourceId: expense.id,
        description: `مصروف ${expense.expenseNumber} - ${expense.title}`,
        notes: expense.notes,
      });
    }

    if (expense.paymentMethod === ExpensePaymentMethod.Bank && expense.bankAccountId) {
      await manager.getRepository(BankAccountTransactionEntity).save({
        bankAccountId: expense.bankAccountId,
        transactionDate: expense.expenseDate,
        transactionType: BankAccountTransactionType.ExpenseBank,
        direction: BankAccountTransactionDirection.Outgoing,
        amount: expense.amount,
        branchId: expense.branchId,
        sourceType: 'expense',
        sourceId: expense.id,
        referenceNumber: expense.expenseNumber,
        description: `مصروف ${expense.expenseNumber} - ${expense.title}`,
        notes: expense.notes,
      });
    }
  }

  private async deleteFinancialMovement(expenseId: string, manager = this.dataSource.manager) {
    await Promise.all([
      manager.getRepository(DrawerTransactionEntity).delete({ sourceType: 'expense', sourceId: expenseId }),
      manager.getRepository(BankAccountTransactionEntity).delete({ sourceType: 'expense', sourceId: expenseId }),
    ]);
  }

  private async validateReferences(data: {
    branchId: string;
    expenseCategoryId: string;
    paymentMethod: ExpensePaymentMethod;
    drawerId?: string | null;
    bankAccountId?: string | null;
    templateId?: string | null;
  }) {
    const [branch, category] = await Promise.all([
      this.branchRepository.findOne({ where: { id: data.branchId } }),
      this.expenseCategoryRepository.findOne({ where: { id: data.expenseCategoryId } }),
    ]);

    if (!branch) {
      throw new NotFoundException('Branch was not found.');
    }

    if (!category) {
      throw new NotFoundException('Expense category was not found.');
    }

    if (data.templateId) {
      const template = await this.expenseTemplateRepository.findOne({ where: { id: data.templateId } });

      if (!template) {
        throw new NotFoundException('Expense template was not found.');
      }
    }

    if (data.paymentMethod === ExpensePaymentMethod.Cash) {
      if (!data.drawerId) {
        throw new BadRequestException('Cash expenses require drawerId.');
      }

      const drawer = await this.drawerRepository.findOne({ where: { id: data.drawerId } });

      if (!drawer) {
        throw new NotFoundException('Drawer was not found.');
      }
    }

    if (data.paymentMethod === ExpensePaymentMethod.Bank) {
      if (!data.bankAccountId) {
        throw new BadRequestException('Bank expenses require bankAccountId.');
      }

      const bankAccount = await this.bankAccountRepository.findOne({ where: { id: data.bankAccountId } });

      if (!bankAccount) {
        throw new NotFoundException('Bank account was not found.');
      }
    }
  }

  private async resolveFinancialReferences(data: {
    branchId: string;
    paymentMethod: ExpensePaymentMethod;
    drawerId?: string | null;
    bankAccountId?: string | null;
  }) {
    let drawerId = data.drawerId ?? null;
    let bankAccountId = data.bankAccountId ?? null;

    if (data.paymentMethod === ExpensePaymentMethod.Cash && !drawerId) {
      const branchDrawer = await this.drawerRepository.findOne({ where: { branchId: data.branchId } });
      drawerId = branchDrawer?.id ?? null;
    }

    if (data.paymentMethod !== ExpensePaymentMethod.Cash) {
      drawerId = null;
    }

    if (data.paymentMethod !== ExpensePaymentMethod.Bank) {
      bankAccountId = null;
    }

    return { drawerId, bankAccountId };
  }

  private async ensureNumberIsAvailable(expenseNumber?: string, currentId?: string) {
    if (!expenseNumber) {
      return;
    }

    const existingExpense = await this.expenseRepository.findOne({
      where: { expenseNumber: ILike(expenseNumber) },
    });

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
    const existingCategory = await this.expenseCategoryRepository.findOne({
      where: { name: ILike('عام') },
    });

    if (existingCategory) {
      return existingCategory;
    }

    const category = this.expenseCategoryRepository.create({
      name: 'عام',
      isFixed: false,
      notes: 'تصنيف افتراضي تم إنشاؤه تلقائياً.',
    });

    return this.expenseCategoryRepository.save(category);
  }
}
