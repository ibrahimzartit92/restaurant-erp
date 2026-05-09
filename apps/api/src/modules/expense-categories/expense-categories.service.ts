import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Not, Repository } from 'typeorm';
import { ExpenseTypeEntity } from '../expense-types/entities/expense-type.entity';
import { ExpenseEntity } from '../expenses/entities/expense.entity';
import { columnExists, hasExpenseHierarchySchema } from '../expenses/expense-schema.guard';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';
import { ExpenseCategoryClassification, ExpenseCategoryEntity } from './entities/expense-category.entity';

@Injectable()
export class ExpenseCategoriesService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(ExpenseCategoryEntity)
    private readonly expenseCategoryRepository: Repository<ExpenseCategoryEntity>,
    @InjectRepository(ExpenseEntity)
    private readonly expenseRepository: Repository<ExpenseEntity>,
    @InjectRepository(ExpenseTypeEntity)
    private readonly expenseTypeRepository: Repository<ExpenseTypeEntity>,
  ) {}

  async findAll(search?: string) {
    if (!(await columnExists(this.dataSource, 'expense_categories', 'is_active'))) {
      return this.findAllLegacy(search);
    }

    const normalizedSearch = search?.trim();

    return this.expenseCategoryRepository.find({
      where: normalizedSearch ? [{ name: ILike(`%${normalizedSearch}%`) }] : undefined,
      order: { name: 'ASC' },
    });
  }

  async findByIdOrFail(id: string) {
    if (!(await columnExists(this.dataSource, 'expense_categories', 'is_active'))) {
      const rows = await this.dataSource.query(
        `
          SELECT id, name, is_fixed AS "isFixed", classification, notes, true AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"
          FROM expense_categories
          WHERE id = $1
          LIMIT 1
        `,
        [id],
      );
      if (!rows[0]) throw new NotFoundException('تصنيف المصروف غير موجود.');
      return rows[0] as ExpenseCategoryEntity;
    }

    const category = await this.expenseCategoryRepository.findOne({ where: { id } });

    if (!category) {
      throw new NotFoundException('تصنيف المصروف غير موجود.');
    }

    return category;
  }

  async create(createExpenseCategoryDto: CreateExpenseCategoryDto) {
    if (!(await columnExists(this.dataSource, 'expense_categories', 'is_active'))) {
      await this.ensureNameIsAvailable(createExpenseCategoryDto.name);
      const rows = await this.dataSource.query(
        `
          INSERT INTO expense_categories (name, is_fixed, classification, notes)
          VALUES ($1, $2, $3, $4)
          RETURNING id, name, is_fixed AS "isFixed", classification, notes, true AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"
        `,
        [
          createExpenseCategoryDto.name.trim(),
          createExpenseCategoryDto.isFixed ?? false,
          createExpenseCategoryDto.classification ??
            (createExpenseCategoryDto.isFixed
              ? ExpenseCategoryClassification.Operating
              : ExpenseCategoryClassification.Miscellaneous),
          createExpenseCategoryDto.notes?.trim() || null,
        ],
      );
      return rows[0];
    }

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
    if (!(await columnExists(this.dataSource, 'expense_categories', 'is_active'))) {
      const category = await this.findByIdOrFail(id);
      if (updateExpenseCategoryDto.name) await this.ensureNameIsAvailable(updateExpenseCategoryDto.name, id);
      const rows = await this.dataSource.query(
        `
          UPDATE expense_categories
          SET name = $2,
              is_fixed = $3,
              classification = $4,
              notes = $5,
              updated_at = now()
          WHERE id = $1
          RETURNING id, name, is_fixed AS "isFixed", classification, notes, true AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"
        `,
        [
          id,
          updateExpenseCategoryDto.name?.trim() ?? category.name,
          updateExpenseCategoryDto.isFixed ?? category.isFixed,
          updateExpenseCategoryDto.classification ?? category.classification,
          updateExpenseCategoryDto.notes !== undefined
            ? updateExpenseCategoryDto.notes?.trim() || null
            : category.notes,
        ],
      );
      return rows[0];
    }

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
    if (!(await hasExpenseHierarchySchema(this.dataSource))) {
      const linkedExpenses = Number(
        (
          await this.dataSource.query(`SELECT COUNT(*)::int AS count FROM expenses WHERE expense_category_id = $1`, [id])
        )[0]?.count ?? 0,
      );
      if (linkedExpenses > 0) {
        throw new ConflictException('لا يمكن حذف تصنيف مستخدم قبل تشغيل ترحيل المصاريف. شغل الترحيل ثم استخدم الأرشفة.');
      }
      await this.dataSource.query(`DELETE FROM expense_categories WHERE id = $1`, [id]);
      return { id, deleted: true, archived: false };
    }

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
    if (!(await columnExists(this.dataSource, 'expense_categories', 'is_active'))) {
      const rows = await this.dataSource.query(
        `
          SELECT id
          FROM expense_categories
          WHERE name ILIKE $1
            AND ($2::uuid IS NULL OR id <> $2::uuid)
          LIMIT 1
        `,
        [name.trim(), currentId ?? null],
      );
      if (rows[0]) throw new ConflictException('يوجد تصنيف مصروف بنفس الاسم.');
      return;
    }

    const existingCategory = await this.expenseCategoryRepository.findOne({
      where: { name: ILike(name.trim()), ...(currentId ? { id: Not(currentId) } : {}) },
    });

    if (existingCategory) {
      throw new ConflictException('يوجد تصنيف مصروف بنفس الاسم.');
    }
  }

  private async findAllLegacy(search?: string) {
    const normalizedSearch = search?.trim();
    const rows = await this.dataSource.query(
      `
        SELECT id, name, is_fixed AS "isFixed", classification, notes, true AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"
        FROM expense_categories
        WHERE ($1::text IS NULL OR name ILIKE $1)
        ORDER BY name ASC
      `,
      [normalizedSearch ? `%${normalizedSearch}%` : null],
    );
    return rows as ExpenseCategoryEntity[];
  }
}
