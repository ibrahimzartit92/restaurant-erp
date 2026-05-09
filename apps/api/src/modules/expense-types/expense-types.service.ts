import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Not, Repository } from 'typeorm';
import { ExpenseCategoryEntity } from '../expense-categories/entities/expense-category.entity';
import { ExpenseEntity } from '../expenses/entities/expense.entity';
import { CreateExpenseTypeDto } from './dto/create-expense-type.dto';
import { UpdateExpenseTypeDto } from './dto/update-expense-type.dto';
import { ExpenseTypeEntity } from './entities/expense-type.entity';

@Injectable()
export class ExpenseTypesService {
  constructor(
    @InjectRepository(ExpenseTypeEntity)
    private readonly expenseTypeRepository: Repository<ExpenseTypeEntity>,
    @InjectRepository(ExpenseCategoryEntity)
    private readonly expenseCategoryRepository: Repository<ExpenseCategoryEntity>,
    @InjectRepository(ExpenseEntity)
    private readonly expenseRepository: Repository<ExpenseEntity>,
  ) {}

  findAll(filters: { search?: string; categoryId?: string; activeOnly?: boolean }) {
    const query = this.expenseTypeRepository
      .createQueryBuilder('expenseType')
      .leftJoinAndSelect('expenseType.category', 'category')
      .orderBy('category.name', 'ASC')
      .addOrderBy('expenseType.name', 'ASC');

    if (filters.categoryId) {
      query.andWhere('expenseType.category_id = :categoryId', { categoryId: filters.categoryId });
    }

    if (filters.activeOnly) {
      query.andWhere('expenseType.is_active = true').andWhere('category.is_active = true');
    }

    const search = filters.search?.trim();
    if (search) {
      query.andWhere('(expenseType.name ILIKE :search OR expenseType.code ILIKE :search)', { search: `%${search}%` });
    }

    return query.getMany();
  }

  async findByIdOrFail(id: string) {
    const expenseType = await this.expenseTypeRepository.findOne({ where: { id } });
    if (!expenseType) throw new NotFoundException('نوع المصروف غير موجود.');
    return expenseType;
  }

  async create(dto: CreateExpenseTypeDto) {
    const category = await this.expenseCategoryRepository.findOne({ where: { id: dto.categoryId } });
    if (!category) throw new NotFoundException('تصنيف المصروف غير موجود.');
    if (category.isActive === false) throw new BadRequestException('لا يمكن إضافة نوع داخل تصنيف مؤرشف.');

    const code = this.normalizeCode(dto.code ?? dto.name);
    await this.ensureNameIsAvailable(dto.categoryId, dto.name);
    await this.ensureCodeIsAvailable(dto.categoryId, code);

    const expenseType = this.expenseTypeRepository.create({
      categoryId: dto.categoryId,
      name: dto.name.trim(),
      code,
      isActive: dto.isActive ?? true,
      notes: this.normalizeOptionalText(dto.notes),
    });

    return this.expenseTypeRepository.save(expenseType);
  }

  async update(id: string, dto: UpdateExpenseTypeDto) {
    const expenseType = await this.findByIdOrFail(id);
    const categoryId = dto.categoryId ?? expenseType.categoryId;

    if (dto.categoryId) {
      const category = await this.expenseCategoryRepository.findOne({ where: { id: dto.categoryId } });
      if (!category) throw new NotFoundException('تصنيف المصروف غير موجود.');
      if (category.isActive === false && dto.isActive !== false) {
        throw new BadRequestException('لا يمكن نقل النوع إلى تصنيف مؤرشف.');
      }
    }

    if (dto.name) await this.ensureNameIsAvailable(categoryId, dto.name, id);
    const code = dto.code ? this.normalizeCode(dto.code) : undefined;
    if (code) await this.ensureCodeIsAvailable(categoryId, code, id);

    Object.assign(expenseType, {
      categoryId,
      name: dto.name?.trim() ?? expenseType.name,
      code: code ?? expenseType.code,
      isActive: dto.isActive ?? expenseType.isActive,
      notes: dto.notes !== undefined ? this.normalizeOptionalText(dto.notes) : expenseType.notes,
    });

    return this.expenseTypeRepository.save(expenseType);
  }

  async remove(id: string) {
    const expenseType = await this.findByIdOrFail(id);
    const linkedExpenses = await this.expenseRepository.count({ where: { expenseTypeId: id } });

    if (linkedExpenses > 0) {
      expenseType.isActive = false;
      await this.expenseTypeRepository.save(expenseType);
      return { id, deleted: false, archived: true };
    }

    await this.expenseTypeRepository.remove(expenseType);
    return { id, deleted: true, archived: false };
  }

  private async ensureNameIsAvailable(categoryId: string, name: string, currentId?: string) {
    const existingType = await this.expenseTypeRepository.findOne({
      where: { categoryId, name: ILike(name.trim()), ...(currentId ? { id: Not(currentId) } : {}) },
    });
    if (existingType) throw new ConflictException('يوجد نوع مصروف بنفس الاسم داخل هذا التصنيف.');
  }

  private async ensureCodeIsAvailable(categoryId: string, code: string, currentId?: string) {
    const existingType = await this.expenseTypeRepository.findOne({
      where: { categoryId, code: ILike(code), ...(currentId ? { id: Not(currentId) } : {}) },
    });
    if (existingType) throw new ConflictException('يوجد نوع مصروف بنفس الرمز داخل هذا التصنيف.');
  }

  private normalizeCode(value: string) {
    return value
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^\p{L}\p{N}_-]/gu, '')
      .slice(0, 50)
      .toUpperCase();
  }

  private normalizeOptionalText(value?: string | null) {
    const normalizedValue = value?.trim();
    return normalizedValue ? normalizedValue : null;
  }
}
