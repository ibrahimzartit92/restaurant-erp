import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Not, Repository } from 'typeorm';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierEntity } from './entities/supplier.entity';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(SupplierEntity)
    private readonly supplierRepository: Repository<SupplierEntity>,
  ) {}

  findAll(search?: string) {
    const normalizedSearch = search?.trim();

    return this.supplierRepository.find({
      where: normalizedSearch
        ? [{ name: ILike(`%${normalizedSearch}%`) }, { code: ILike(`%${normalizedSearch}%`) }]
        : undefined,
      order: { name: 'ASC' },
    });
  }

  async findByIdOrFail(id: string) {
    const supplier = await this.supplierRepository.findOne({ where: { id } });

    if (!supplier) {
      throw new NotFoundException('Supplier was not found.');
    }

    return supplier;
  }

  async create(createSupplierDto: CreateSupplierDto) {
    const code = createSupplierDto.code?.trim().toUpperCase() || (await this.generateSupplierCode(createSupplierDto.name));
    await this.ensureCodeIsAvailable(code);

    const supplier = this.supplierRepository.create({
      ...createSupplierDto,
      code,
      phone: createSupplierDto.phone ?? null,
      address: createSupplierDto.address ?? null,
      defaultDueDays: createSupplierDto.defaultDueDays ?? 0,
      isActive: createSupplierDto.isActive ?? true,
      notes: createSupplierDto.notes ?? null,
    });

    return this.supplierRepository.save(supplier);
  }

  async update(id: string, updateSupplierDto: UpdateSupplierDto) {
    const supplier = await this.findByIdOrFail(id);
    const code = updateSupplierDto.code?.toUpperCase();

    if (code) {
      await this.ensureCodeIsAvailable(code, id);
    }

    Object.assign(supplier, {
      ...updateSupplierDto,
      code: code ?? supplier.code,
    });

    return this.supplierRepository.save(supplier);
  }

  async remove(id: string) {
    const supplier = await this.findByIdOrFail(id);
    await this.supplierRepository.remove(supplier);

    return { id };
  }

  private async ensureCodeIsAvailable(code: string, currentId?: string) {
    const existingSupplier = await this.supplierRepository.findOne({
      where: {
        code,
        ...(currentId ? { id: Not(currentId) } : {}),
      },
    });

    if (existingSupplier) {
      throw new ConflictException('A supplier with this code already exists.');
    }
  }

  private async generateSupplierCode(name: string) {
    const baseCode =
      name
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\p{L}\p{N}-]/gu, '')
        .slice(0, 20)
        .toUpperCase() || 'SUPPLIER';
    let code = baseCode;
    let index = 1;

    while (await this.supplierRepository.findOne({ where: { code } })) {
      index += 1;
      code = `${baseCode}-${index}`;
    }

    return code;
  }
}
