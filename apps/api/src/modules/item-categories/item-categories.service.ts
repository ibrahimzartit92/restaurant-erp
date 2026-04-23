import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Not, Repository } from 'typeorm';
import { CreateItemCategoryDto } from './dto/create-item-category.dto';
import { UpdateItemCategoryDto } from './dto/update-item-category.dto';
import { ItemCategoryEntity } from './entities/item-category.entity';

@Injectable()
export class ItemCategoriesService {
  constructor(
    @InjectRepository(ItemCategoryEntity)
    private readonly itemCategoryRepository: Repository<ItemCategoryEntity>,
  ) {}

  findAll(search?: string) {
    const normalizedSearch = search?.trim();

    return this.itemCategoryRepository.find({
      where: normalizedSearch
        ? [{ name: ILike(`%${normalizedSearch}%`) }, { code: ILike(`%${normalizedSearch}%`) }]
        : undefined,
      order: { name: 'ASC' },
    });
  }

  async findByIdOrFail(id: string) {
    const category = await this.itemCategoryRepository.findOne({ where: { id } });

    if (!category) {
      throw new NotFoundException('Item category was not found.');
    }

    return category;
  }

  findByCode(code: string) {
    return this.itemCategoryRepository.findOne({ where: { code: code.toUpperCase() } });
  }

  async create(createItemCategoryDto: CreateItemCategoryDto) {
    const code = createItemCategoryDto.code.toUpperCase();
    await this.ensureCodeIsAvailable(code);

    const category = this.itemCategoryRepository.create({
      ...createItemCategoryDto,
      code,
      isActive: createItemCategoryDto.isActive ?? true,
      notes: createItemCategoryDto.notes ?? null,
    });

    return this.itemCategoryRepository.save(category);
  }

  async update(id: string, updateItemCategoryDto: UpdateItemCategoryDto) {
    const category = await this.findByIdOrFail(id);
    const code = updateItemCategoryDto.code?.toUpperCase();

    if (code) {
      await this.ensureCodeIsAvailable(code, id);
    }

    Object.assign(category, {
      ...updateItemCategoryDto,
      code: code ?? category.code,
    });

    return this.itemCategoryRepository.save(category);
  }

  async remove(id: string) {
    const category = await this.findByIdOrFail(id);
    await this.itemCategoryRepository.remove(category);

    return { id };
  }

  private async ensureCodeIsAvailable(code: string, currentId?: string) {
    const existingCategory = await this.itemCategoryRepository.findOne({
      where: {
        code,
        ...(currentId ? { id: Not(currentId) } : {}),
      },
    });

    if (existingCategory) {
      throw new ConflictException('An item category with this code already exists.');
    }
  }
}
