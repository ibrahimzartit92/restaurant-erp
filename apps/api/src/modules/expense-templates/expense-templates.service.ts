import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { BankAccountEntity } from '../bank-accounts/entities/bank-account.entity';
import { BranchEntity } from '../branches/entities/branch.entity';
import { DrawerEntity } from '../drawers/entities/drawer.entity';
import { ExpenseCategoryEntity } from '../expense-categories/entities/expense-category.entity';
import { ExpensePaymentMethod } from '../expenses/expense-shared';
import { CreateExpenseTemplateDto } from './dto/create-expense-template.dto';
import { UpdateExpenseTemplateDto } from './dto/update-expense-template.dto';
import { ExpenseTemplateEntity } from './entities/expense-template.entity';

@Injectable()
export class ExpenseTemplatesService {
  constructor(
    @InjectRepository(ExpenseTemplateEntity)
    private readonly expenseTemplateRepository: Repository<ExpenseTemplateEntity>,
    @InjectRepository(BranchEntity)
    private readonly branchRepository: Repository<BranchEntity>,
    @InjectRepository(ExpenseCategoryEntity)
    private readonly expenseCategoryRepository: Repository<ExpenseCategoryEntity>,
    @InjectRepository(DrawerEntity)
    private readonly drawerRepository: Repository<DrawerEntity>,
    @InjectRepository(BankAccountEntity)
    private readonly bankAccountRepository: Repository<BankAccountEntity>,
  ) {}

  findAll(search?: string, branchId?: string) {
    const normalizedSearch = search?.trim();

    return this.expenseTemplateRepository.find({
      where: normalizedSearch
        ? [
            { name: ILike(`%${normalizedSearch}%`), ...(branchId ? { branchId } : {}) },
          ]
        : branchId
          ? { branchId }
          : undefined,
      order: { name: 'ASC' },
    });
  }

  async findByIdOrFail(id: string) {
    const template = await this.expenseTemplateRepository.findOne({ where: { id } });

    if (!template) {
      throw new NotFoundException('Expense template was not found.');
    }

    return template;
  }

  async create(createExpenseTemplateDto: CreateExpenseTemplateDto) {
    await this.validateReferences(createExpenseTemplateDto);

    const template = this.expenseTemplateRepository.create({
      ...createExpenseTemplateDto,
      branchId: createExpenseTemplateDto.branchId ?? null,
      drawerId: createExpenseTemplateDto.drawerId ?? null,
      bankAccountId: createExpenseTemplateDto.bankAccountId ?? null,
      isActive: createExpenseTemplateDto.isActive ?? true,
      notes: createExpenseTemplateDto.notes ?? null,
    });

    return this.expenseTemplateRepository.save(template);
  }

  async update(id: string, updateExpenseTemplateDto: UpdateExpenseTemplateDto) {
    const template = await this.findByIdOrFail(id);
    const nextTemplate = { ...template, ...updateExpenseTemplateDto };
    await this.validateReferences(nextTemplate);

    Object.assign(template, updateExpenseTemplateDto);

    return this.expenseTemplateRepository.save(template);
  }

  async remove(id: string) {
    const template = await this.findByIdOrFail(id);
    await this.expenseTemplateRepository.remove(template);

    return { id };
  }

  private async validateReferences(data: {
    branchId?: string | null;
    expenseCategoryId: string;
    paymentMethod: ExpensePaymentMethod;
    drawerId?: string | null;
    bankAccountId?: string | null;
  }) {
    if (data.branchId) {
      const branch = await this.branchRepository.findOne({ where: { id: data.branchId } });

      if (!branch) {
        throw new NotFoundException('Branch was not found.');
      }
    }

    const category = await this.expenseCategoryRepository.findOne({ where: { id: data.expenseCategoryId } });

    if (!category) {
      throw new NotFoundException('Expense category was not found.');
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
}
