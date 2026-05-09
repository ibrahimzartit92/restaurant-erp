import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Not, Repository } from 'typeorm';
import { ExpenseTypeEntity } from '../expense-types/entities/expense-type.entity';
import { ExpenseEntity } from '../expenses/entities/expense.entity';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';
import { ExpenseCategoryClassification, ExpenseCategoryEntity } from './entities/expense-category.entity';

@Injectable()
export class ExpenseCategoriesService {
  constructor(
    @InjectRepository(ExpenseCategoryEntity)
    private readonly expenseCategoryRepository: Repository<ExpenseCategoryEntity>,
    @InjectRepository(ExpenseEntity)
    private readonly expenseRepository: Repository<ExpenseEntity>,
    @InjectRepository(ExpenseTypeEntity)
    private readonly expenseTypeRepository: Repository<ExpenseTypeEntity>,
  ) {}

  findAll(search?: string) {
    const normalizedSearch = search?.trim();

    return this.expenseCategoryRepository.find({
      where: normalizedSearch ? [{ name: ILike(`%${normalizedSearch}%`) }] : undefined,
      order: { name: 'ASC' },
    });
  }

  async findByIdOrFail(id: string) {
    const category = await this.expenseCategoryRepository.findOne({ where: { id } });

    if (!category) {
      throw new NotFoundException('تصنيف المصروف غير موجود.');
    }

    return category;
  }

  async create(createExpenseCategoryDto: CreateExpenseCategoryDto) {
    await this.ensureNameIsAvailable(createExpenseCategoryDto.name);

    const category = this.expenseCategoryRepository.create({
      name: createExpenseCategoryDto.name.trim(),
      isFixed: createExpenseCategoryDto.isFixed ?? false,
      isActive: createExpenseCategoryDto.isActive ?? true,
      classification:
        createExpenseCategoryDto.classification ??
        (createExpenseCategoryDto.isFixed
          ? ExpenseCategoryClassification.Operating
          : ExpenseCategoryClassification.Miscellaneous),
      notes: createExpenseCategoryDto.notes?.trim() || null,
    });

    return this.expenseCategoryRepository.save(category);
  }

  async update(id: string, updateExpenseCategoryDto: UpdateExpenseCategoryDto) {
    const category = await this.findByIdOrFail(id);

    if (updateExpenseCategoryDto.name) {
      await this.ensureNameIsAvailable(updateExpenseCategoryDto.name, id);
    }

    Object.assign(category, {
      ...updateExpenseCategoryDto,
      name: updateExpenseCategoryDto.name?.trim() ?? category.name,
      notes:
        updateExpenseCategoryDto.notes !== undefined
          ? updateExpenseCategoryDto.notes?.trim() || null
          : category.notes,
    });

    return this.expenseCategoryRepository.save(category);
  }

  async remove(id: string) {
    const category = await this.findByIdOrFail(id);
    const linkedExpenses = await this.expenseRepository.count({ where: { expenseCategoryId: id } });
    const linkedTypes = await this.expenseTypeRepository.count({ where: { categoryId: id } });

    if (linkedExpenses > 0 || linkedTypes > 0) {
      category.isActive = false;
      await this.expenseCategoryRepository.save(category);
      return { id, deleted: false, archived: true };
    }

    await this.expenseCategoryRepository.remove(category);

    return { id, deleted: true, archived: false };
  }

  private async ensureNameIsAvailable(name: string, currentId?: string) {
    const existingCategory = await this.expenseCategoryRepository.findOne({
      where: { name: ILike(name.trim()), ...(currentId ? { id: Not(currentId) } : {}) },
    });

    if (existingCategory) {
      throw new ConflictException('يوجد تصنيف مصروف بنفس الاسم.');
    }
  }
}
