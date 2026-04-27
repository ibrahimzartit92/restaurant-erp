import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { SuppliersService } from '../suppliers/suppliers.service';
import { CreateSupplierRepresentativeDto } from './dto/create-supplier-representative.dto';
import { UpdateSupplierRepresentativeDto } from './dto/update-supplier-representative.dto';
import { SupplierRepresentativeEntity } from './entities/supplier-representative.entity';

@Injectable()
export class SupplierRepresentativesService {
  constructor(
    @InjectRepository(SupplierRepresentativeEntity)
    private readonly supplierRepresentativeRepository: Repository<SupplierRepresentativeEntity>,
    private readonly suppliersService: SuppliersService,
  ) {}

  findAll(search?: string, supplierId?: string) {
    const normalizedSearch = search?.trim();
    const baseWhere = supplierId ? { supplierId } : {};

    return this.supplierRepresentativeRepository.find({
      where: normalizedSearch
        ? [
            { ...baseWhere, name: ILike(`%${normalizedSearch}%`) },
            { ...baseWhere, phone: ILike(`%${normalizedSearch}%`) },
          ]
        : baseWhere,
      order: { isPrimary: 'DESC', name: 'ASC' },
    });
  }

  async findByIdOrFail(id: string) {
    const representative = await this.supplierRepresentativeRepository.findOne({ where: { id } });

    if (!representative) {
      throw new NotFoundException('Supplier representative was not found.');
    }

    return representative;
  }

  async create(createSupplierRepresentativeDto: CreateSupplierRepresentativeDto) {
    await this.suppliersService.findByIdOrFail(createSupplierRepresentativeDto.supplierId);

    const representative = this.supplierRepresentativeRepository.create({
      ...createSupplierRepresentativeDto,
      phone: createSupplierRepresentativeDto.phone ?? null,
      isPrimary: createSupplierRepresentativeDto.isPrimary ?? false,
      notes: createSupplierRepresentativeDto.notes ?? null,
    });

    return this.supplierRepresentativeRepository.save(representative);
  }

  async update(id: string, updateSupplierRepresentativeDto: UpdateSupplierRepresentativeDto) {
    const representative = await this.findByIdOrFail(id);

    if (updateSupplierRepresentativeDto.supplierId) {
      await this.suppliersService.findByIdOrFail(updateSupplierRepresentativeDto.supplierId);
    }

    Object.assign(representative, updateSupplierRepresentativeDto);

    return this.supplierRepresentativeRepository.save(representative);
  }

  async remove(id: string) {
    const representative = await this.findByIdOrFail(id);
    await this.supplierRepresentativeRepository.remove(representative);

    return { id };
  }
}
