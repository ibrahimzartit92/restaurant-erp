import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Not, Repository } from 'typeorm';
import { ItemEntity } from '../items/entities/item.entity';
import { CreateItemCategoryDto } from './dto/create-item-category.dto';
import { UpdateItemCategoryDto } from './dto/update-item-category.dto';
import { ItemCategoryEntity } from './entities/item-category.entity';

@Injectable()
export class ItemCategoriesService {
  constructor(
    @InjectRepository(ItemCategoryEntity)
    private readonly itemCategoryRepository: Repository<ItemCategoryEntity>,
    @InjectRepository(ItemEntity)
    private readonly itemRepository: Repository<ItemEntity>,
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
      color: this.normalizeColor(createItemCategoryDto.color),
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
      color:
        updateItemCategoryDto.color !== undefined
          ? this.normalizeColor(updateItemCategoryDto.color)
          : category.color,
    });

    return this.itemCategoryRepository.save(category);
  }

  async remove(id: string) {
    const category = await this.findByIdOrFail(id);
    const linkedItems = await this.itemRepository.count({ where: { categoryId: id } });

    if (linkedItems > 0) {
      category.isActive = false;
      await this.itemCategoryRepository.save(category);

      return {
        id,
        deleted: false,
        deactivated: true,
        linkedItems,
        message: 'التصنيف مرتبط بمواد مسجلة، لذلك تم تعطيله بدلا من حذفه حفاظا على السجلات السابقة.',
      };
    }

    await this.itemCategoryRepository.remove(category);

    return { id, deleted: true, deactivated: false, linkedItems };
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

  private normalizeColor(color?: string | null) {
    const normalized = color?.trim();
    return normalized && /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized : '#14746f';
  }
}
