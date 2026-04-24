import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { PermissionEntity } from './entities/permission.entity';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
  ) {}

  findAll(search?: string) {
    const normalizedSearch = search?.trim();

    return this.permissionRepository.find({
      where: normalizedSearch
        ? [
            { code: ILike(`%${normalizedSearch}%`) },
            { name: ILike(`%${normalizedSearch}%`) },
            { module: ILike(`%${normalizedSearch}%`) },
          ]
        : undefined,
      order: { module: 'ASC', name: 'ASC' },
    });
  }

  findById(id: string) {
    return this.permissionRepository.findOne({ where: { id } });
  }

  async findByIdOrFail(id: string) {
    const permission = await this.findById(id);

    if (!permission) {
      throw new NotFoundException('The selected permission was not found.');
    }

    return permission;
  }

  findByCode(code: string) {
    return this.permissionRepository.findOne({ where: { code: code.toLowerCase() } });
  }

  async create(createPermissionDto: CreatePermissionDto) {
    const code = createPermissionDto.code.trim().toLowerCase();
    const existingPermission = await this.findByCode(code);

    if (existingPermission) {
      throw new ConflictException('A permission with this code already exists.');
    }

    const permission = this.permissionRepository.create({
      code,
      name: createPermissionDto.name.trim(),
      module: createPermissionDto.module.trim().toLowerCase(),
      notes: this.normalizeOptionalText(createPermissionDto.notes),
    });

    return this.permissionRepository.save(permission);
  }

  async update(id: string, updatePermissionDto: UpdatePermissionDto) {
    const permission = await this.findByIdOrFail(id);

    if (updatePermissionDto.code) {
      const nextCode = updatePermissionDto.code.trim().toLowerCase();

      if (nextCode !== permission.code) {
        const existingPermission = await this.findByCode(nextCode);

        if (existingPermission) {
          throw new ConflictException('A permission with this code already exists.');
        }
      }

      permission.code = nextCode;
    }

    if (typeof updatePermissionDto.name === 'string') {
      permission.name = updatePermissionDto.name.trim();
    }

    if (typeof updatePermissionDto.module === 'string') {
      permission.module = updatePermissionDto.module.trim().toLowerCase();
    }

    if (updatePermissionDto.notes !== undefined) {
      permission.notes = this.normalizeOptionalText(updatePermissionDto.notes);
    }

    return this.permissionRepository.save(permission);
  }

  private normalizeOptionalText(value?: string | null) {
    const normalizedValue = value?.trim();
    return normalizedValue ? normalizedValue : null;
  }
}
