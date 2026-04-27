import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Not, Repository } from 'typeorm';
import { ItemCategoriesService } from '../item-categories/item-categories.service';
import { UnitsService } from '../units/units.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ItemEntity } from './entities/item.entity';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(ItemEntity)
    private readonly itemRepository: Repository<ItemEntity>,
    private readonly itemCategoriesService: ItemCategoriesService,
    private readonly unitsService: UnitsService,
  ) {}

  findAll(search?: string) {
    const normalizedSearch = search?.trim();

    return this.itemRepository.find({
      where: normalizedSearch
        ? [
            { name: ILike(`%${normalizedSearch}%`) },
            { code: ILike(`%${normalizedSearch}%`) },
            { searchKeywords: ILike(`%${normalizedSearch}%`) },
          ]
        : undefined,
      order: { name: 'ASC' },
    });
  }

  async findByIdOrFail(id: string) {
    const item = await this.itemRepository.findOne({ where: { id } });

    if (!item) {
      throw new NotFoundException('Item was not found.');
    }

    return item;
  }

  async create(createItemDto: CreateItemDto) {
    const code = createItemDto.code?.trim().toUpperCase() || (await this.generateItemCode(createItemDto.name));
    const category = createItemDto.categoryId
      ? await this.itemCategoriesService.findByIdOrFail(createItemDto.categoryId)
      : await this.getDefaultCategory();
    const unit = createItemDto.unitId
      ? await this.unitsService.findByIdOrFail(createItemDto.unitId)
      : await this.getDefaultUnit();

    await this.ensureCodeIsAvailable(code);

    const item = this.itemRepository.create({
      ...createItemDto,
      code,
      categoryId: category.id,
      unitId: unit.id,
      initialPrice: createItemDto.initialPrice ?? 0,
      costPrice: createItemDto.costPrice ?? 0,
      salePrice: createItemDto.salePrice ?? 0,
      searchKeywords: createItemDto.searchKeywords ?? '',
      isActive: createItemDto.isActive ?? true,
      notes: createItemDto.notes ?? null,
    });

    return this.itemRepository.save(item);
  }

  async update(id: string, updateItemDto: UpdateItemDto) {
    const item = await this.findByIdOrFail(id);
    const code = updateItemDto.code?.toUpperCase();

    if (code) {
      await this.ensureCodeIsAvailable(code, id);
    }

    if (updateItemDto.categoryId) {
      await this.itemCategoriesService.findByIdOrFail(updateItemDto.categoryId);
    }

    if (updateItemDto.unitId) {
      await this.unitsService.findByIdOrFail(updateItemDto.unitId);
    }

    Object.assign(item, {
      ...updateItemDto,
      code: code ?? item.code,
    });

    return this.itemRepository.save(item);
  }

  async remove(id: string) {
    const item = await this.findByIdOrFail(id);
    await this.itemRepository.remove(item);

    return { id };
  }

  private async ensureCodeIsAvailable(code: string, currentId?: string) {
    const existingItem = await this.itemRepository.findOne({
      where: {
        code,
        ...(currentId ? { id: Not(currentId) } : {}),
      },
    });

    if (existingItem) {
      throw new ConflictException('An item with this code already exists.');
    }
  }

  private async generateItemCode(name: string) {
    const baseCode =
      name
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\p{L}\p{N}-]/gu, '')
        .slice(0, 20)
        .toUpperCase() || 'ITEM';
    let code = baseCode;
    let index = 1;

    while (await this.itemRepository.findOne({ where: { code } })) {
      index += 1;
      code = `${baseCode}-${index}`;
    }

    return code;
  }

  private async getDefaultCategory() {
    const [category] = await this.itemCategoriesService.findAll();

    if (category) {
      return category;
    }

    return this.itemCategoriesService.create({
      code: 'GENERAL',
      name: 'عام',
      isActive: true,
      notes: 'تصنيف افتراضي تم إنشاؤه تلقائياً.',
    });
  }

  private async getDefaultUnit() {
    const [unit] = await this.unitsService.findAll();

    if (unit) {
      return unit;
    }

    return this.unitsService.create({
      code: 'UNIT',
      name: 'وحدة',
      isActive: true,
      notes: 'وحدة افتراضية تم إنشاؤها تلقائياً.',
    });
  }
}
