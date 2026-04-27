import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Not, Repository } from 'typeorm';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';
import { ExpenseCategoryEntity } from './entities/expense-category.entity';

@Injectable()
export class ExpenseCategoriesService {
  constructor(
    @InjectRepository(ExpenseCategoryEntity)
    private readonly expenseCategoryRepository: Repository<ExpenseCategoryEntity>,
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
      throw new NotFoundException('Expense category was not found.');
    }

    return category;
  }

  async create(createExpenseCategoryDto: CreateExpenseCategoryDto) {
    await this.ensureNameIsAvailable(createExpenseCategoryDto.name);

    const category = this.expenseCategoryRepository.create({
      name: createExpenseCategoryDto.name,
      isFixed: createExpenseCategoryDto.isFixed ?? false,
      notes: createExpenseCategoryDto.notes ?? null,
    });

    return this.expenseCategoryRepository.save(category);
  }

  async update(id: string, updateExpenseCategoryDto: UpdateExpenseCategoryDto) {
    const category = await this.findByIdOrFail(id);

    if (updateExpenseCategoryDto.name) {
      await this.ensureNameIsAvailable(updateExpenseCategoryDto.name, id);
    }

    Object.assign(category, updateExpenseCategoryDto);

    return this.expenseCategoryRepository.save(category);
  }

  async remove(id: string) {
    const category = await this.findByIdOrFail(id);
    await this.expenseCategoryRepository.remove(category);

    return { id };
  }

  private async ensureNameIsAvailable(name: string, currentId?: string) {
    const existingCategory = await this.expenseCategoryRepository.findOne({
      where: { name: ILike(name), ...(currentId ? { id: Not(currentId) } : {}) },
    });

    if (existingCategory) {
      throw new ConflictException('An expense category with this name already exists.');
    }
  }
}
