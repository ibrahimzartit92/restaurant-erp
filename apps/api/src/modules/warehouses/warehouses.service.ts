import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Not, Repository } from 'typeorm';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { WarehouseEntity } from './entities/warehouse.entity';

@Injectable()
export class WarehousesService {
  constructor(
    @InjectRepository(WarehouseEntity)
    private readonly warehouseRepository: Repository<WarehouseEntity>,
  ) {}

  findAll(search?: string) {
    const normalizedSearch = search?.trim();

    return this.warehouseRepository.find({
      where: normalizedSearch
        ? [{ name: ILike(`%${normalizedSearch}%`) }, { code: ILike(`%${normalizedSearch}%`) }]
        : undefined,
      order: { name: 'ASC' },
    });
  }

  async findByIdOrFail(id: string) {
    const warehouse = await this.warehouseRepository.findOne({ where: { id } });

    if (!warehouse) {
      throw new NotFoundException('Warehouse was not found.');
    }

    return warehouse;
  }

  async create(createWarehouseDto: CreateWarehouseDto) {
    const code = createWarehouseDto.code.toUpperCase();
    await this.ensureCodeIsAvailable(code);

    const warehouse = this.warehouseRepository.create({
      ...createWarehouseDto,
      code,
      isActive: createWarehouseDto.isActive ?? true,
    });

    return this.warehouseRepository.save(warehouse);
  }

  async update(id: string, updateWarehouseDto: UpdateWarehouseDto) {
    const warehouse = await this.findByIdOrFail(id);
    const code = updateWarehouseDto.code?.toUpperCase();

    if (code) {
      await this.ensureCodeIsAvailable(code, id);
    }

    Object.assign(warehouse, { ...updateWarehouseDto, code: code ?? warehouse.code });

    return this.warehouseRepository.save(warehouse);
  }

  async remove(id: string) {
    const warehouse = await this.findByIdOrFail(id);
    await this.warehouseRepository.remove(warehouse);

    return { id };
  }

  private async ensureCodeIsAvailable(code: string, currentId?: string) {
    const existingWarehouse = await this.warehouseRepository.findOne({
      where: { code, ...(currentId ? { id: Not(currentId) } : {}) },
    });

    if (existingWarehouse) {
      throw new ConflictException('A warehouse with this code already exists.');
    }
  }
}
