import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { BranchesService } from '../branches/branches.service';
import { RoleName } from '../roles/entities/role.entity';
import { RolesService } from '../roles/roles.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly rolesService: RolesService,
    private readonly branchesService: BranchesService,
  ) {}

  findByEmail(email: string) {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  async create(createUserDto: CreateUserDto) {
    const email = createUserDto.email.toLowerCase();
    const existingUser = await this.findByEmail(email);

    if (existingUser) {
      throw new ConflictException('A user with this email already exists.');
    }

    const role = await this.rolesService.findByNameOrFail(createUserDto.role);
    const branchId = await this.resolveBranchId(createUserDto.role, createUserDto.branchId);
    const passwordHash = await bcrypt.hash(createUserDto.password, 12);

    const user = this.userRepository.create({
      fullName: createUserDto.fullName,
      email,
      passwordHash,
      roleId: role.id,
      branchId,
      isActive: createUserDto.isActive ?? true,
    });

    const savedUser = await this.userRepository.save(user);
    const userWithRelations = await this.userRepository.findOneOrFail({ where: { id: savedUser.id } });

    return this.toSafeUser(userWithRelations);
  }

  toSafeUser(user: UserEntity) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role.name,
      branchId: user.branchId,
      branch: user.branch,
      branchAccess: this.getBranchAccess(user.role.name, user.branchId),
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  getBranchAccess(role: RoleName, branchId: string | null) {
    if (role === RoleName.Admin || role === RoleName.Accountant) {
      return {
        scope: 'all',
        branchIds: null,
      };
    }

    return {
      scope: 'single',
      branchIds: branchId ? [branchId] : [],
    };
  }

  private async resolveBranchId(role: RoleName, branchId?: string) {
    if (role === RoleName.BranchManager) {
      if (!branchId) {
        throw new BadRequestException('A branch manager must be assigned to one branch.');
      }

      const branch = await this.branchesService.findById(branchId);

      if (!branch) {
        throw new NotFoundException('The selected branch was not found.');
      }

      return branch.id;
    }

    return null;
  }
}
