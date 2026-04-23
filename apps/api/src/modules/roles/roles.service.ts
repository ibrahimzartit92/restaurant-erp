import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleEntity, RoleName } from './entities/role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
  ) {}

  findAll() {
    return this.roleRepository.find({ order: { name: 'ASC' } });
  }

  async findByNameOrFail(name: RoleName) {
    const role = await this.roleRepository.findOne({ where: { name } });

    if (!role) {
      throw new NotFoundException(`Role "${name}" was not found. Run the role seed first.`);
    }

    return role;
  }
}
