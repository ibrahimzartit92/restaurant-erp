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
    const code = createItemDto.code.toUpperCase();
    await this.ensureCodeIsAvailable(code);
    await this.itemCategoriesService.findByIdOrFail(createItemDto.categoryId);
    await this.unitsService.findByIdOrFail(createItemDto.unitId);

    const item = this.itemRepository.create({
      ...createItemDto,
      code,
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
}
