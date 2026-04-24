import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { PermissionsService } from '../permissions/permissions.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignRolePermissionsDto } from './dto/assign-role-permissions.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleEntity } from './entities/role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    private readonly permissionsService: PermissionsService,
  ) {}

  findAll(search?: string) {
    const normalizedSearch = search?.trim();

    return this.roleRepository.find({
      where: normalizedSearch
        ? [
            { code: ILike(`%${normalizedSearch}%`) },
            { name: ILike(`%${normalizedSearch}%`) },
          ]
        : undefined,
      order: { name: 'ASC' },
    });
  }

  findById(id: string) {
    return this.roleRepository.findOne({ where: { id } });
  }

  async findByIdOrFail(id: string) {
    const role = await this.findById(id);

    if (!role) {
      throw new NotFoundException('The selected role was not found.');
    }

    return role;
  }

  findByCode(code: string) {
    return this.roleRepository.findOne({ where: { code: code.toLowerCase() } });
  }

  async findByCodeOrFail(code: string) {
    const role = await this.findByCode(code);

    if (!role) {
      throw new NotFoundException(`Role "${code}" was not found. Initialize the access catalog first.`);
    }

    return role;
  }

  async create(createRoleDto: CreateRoleDto) {
    const code = createRoleDto.code.trim().toLowerCase();
    const existingRole = await this.findByCode(code);

    if (existingRole) {
      throw new ConflictException('A role with this code already exists.');
    }

    const role = this.roleRepository.create({
      code,
      name: createRoleDto.name.trim(),
      notes: this.normalizeOptionalText(createRoleDto.notes),
      permissions: [],
    });

    return this.roleRepository.save(role);
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    const role = await this.findByIdOrFail(id);

    if (updateRoleDto.code) {
      const nextCode = updateRoleDto.code.trim().toLowerCase();

      if (nextCode !== role.code) {
        const existingRole = await this.findByCode(nextCode);

        if (existingRole) {
          throw new ConflictException('A role with this code already exists.');
        }
      }

      role.code = nextCode;
    }

    if (typeof updateRoleDto.name === 'string') {
      role.name = updateRoleDto.name.trim();
    }

    if (updateRoleDto.notes !== undefined) {
      role.notes = this.normalizeOptionalText(updateRoleDto.notes);
    }

    return this.roleRepository.save(role);
  }

  async assignPermissions(id: string, assignRolePermissionsDto: AssignRolePermissionsDto) {
    const role = await this.findByIdOrFail(id);
    const permissions = await Promise.all(
      assignRolePermissionsDto.permissionIds.map((permissionId) => this.permissionsService.findByIdOrFail(permissionId)),
    );

    role.permissions = permissions;
    return this.roleRepository.save(role);
  }

  private normalizeOptionalText(value?: string | null) {
    const normalizedValue = value?.trim();
    return normalizedValue ? normalizedValue : null;
  }
}
