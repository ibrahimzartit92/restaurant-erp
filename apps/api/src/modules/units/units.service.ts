import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Not, Repository } from 'typeorm';
import { ItemEntity } from '../items/entities/item.entity';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitEntity } from './entities/unit.entity';

@Injectable()
export class UnitsService {
  constructor(
    @InjectRepository(UnitEntity)
    private readonly unitRepository: Repository<UnitEntity>,
    @InjectRepository(ItemEntity)
    private readonly itemRepository: Repository<ItemEntity>,
  ) {}

  findAll(search?: string) {
    const normalizedSearch = search?.trim();

    return this.unitRepository.find({
      where: normalizedSearch
        ? [{ name: ILike(`%${normalizedSearch}%`) }, { code: ILike(`%${normalizedSearch}%`) }]
        : undefined,
      order: { name: 'ASC' },
    });
  }

  async findByIdOrFail(id: string) {
    const unit = await this.unitRepository.findOne({ where: { id } });

    if (!unit) {
      throw new NotFoundException('Unit was not found.');
    }

    return unit;
  }

  async create(createUnitDto: CreateUnitDto) {
    const code = createUnitDto.code.toUpperCase();
    await this.ensureCodeIsAvailable(code);

    const unit = this.unitRepository.create({
      ...createUnitDto,
      code,
      isActive: createUnitDto.isActive ?? true,
      notes: createUnitDto.notes ?? null,
    });

    return this.unitRepository.save(unit);
  }

  async update(id: string, updateUnitDto: UpdateUnitDto) {
    const unit = await this.findByIdOrFail(id);
    const code = updateUnitDto.code?.toUpperCase();

    if (code) {
      await this.ensureCodeIsAvailable(code, id);
    }

    Object.assign(unit, {
      ...updateUnitDto,
      code: code ?? unit.code,
    });

    return this.unitRepository.save(unit);
  }

  async remove(id: string) {
    const unit = await this.findByIdOrFail(id);
    const linkedItems = await this.itemRepository.count({ where: { unitId: id } });

    if (linkedItems > 0) {
      throw new BadRequestException('لا يمكن حذف وحدة مستخدمة في مواد محفوظة.');
    }

    await this.unitRepository.remove(unit);

    return { id };
  }

  private async ensureCodeIsAvailable(code: string, currentId?: string) {
    const existingUnit = await this.unitRepository.findOne({
      where: {
        code,
        ...(currentId ? { id: Not(currentId) } : {}),
      },
    });

    if (existingUnit) {
      throw new ConflictException('يوجد وحدة بنفس الكود.');
    }
  }
}
