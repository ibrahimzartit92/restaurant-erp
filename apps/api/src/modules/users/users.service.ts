import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { ILike, Repository } from 'typeorm';
import { SYSTEM_ROLE_CODES } from '../roles/roles.constants';
import { BranchesService } from '../branches/branches.service';
import { RolesService } from '../roles/roles.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly rolesService: RolesService,
    private readonly branchesService: BranchesService,
  ) {}

  async findAll(search?: string) {
    const normalizedSearch = search?.trim();
    const users = await this.userRepository.find({
      where: normalizedSearch
        ? [
            { fullName: ILike(`%${normalizedSearch}%`) },
            { username: ILike(`%${normalizedSearch}%`) },
            { email: ILike(`%${normalizedSearch}%`) },
          ]
        : undefined,
      order: { fullName: 'ASC' },
    });

    return users.map((user) => this.toSafeUser(user));
  }

  findById(id: string) {
    return this.userRepository.findOne({
      where: { id },
    });
  }

  async findSafeById(id: string) {
    const user = await this.findById(id);
    return user ? this.toSafeUser(user) : null;
  }

  findByEmail(email: string) {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  findByUsername(username: string) {
    return this.userRepository.findOne({
      where: { username: username.toLowerCase() },
    });
  }

  async findByLogin(login: string) {
    const normalizedLogin = login.trim().toLowerCase();

    return this.userRepository.findOne({
      where: [{ email: normalizedLogin }, { username: normalizedLogin }],
    });
  }

  async create(createUserDto: CreateUserDto) {
    await this.ensureUserIsUnique({
      username: createUserDto.username,
      email: createUserDto.email ?? null,
    });

    const role = await this.rolesService.findByIdOrFail(createUserDto.roleId);
    const branchId = await this.resolveBranchId(createUserDto.branchId);
    const passwordHash = await bcrypt.hash(createUserDto.password, 12);

    const user = this.userRepository.create({
      fullName: createUserDto.fullName.trim(),
      username: createUserDto.username.trim().toLowerCase(),
      email: this.normalizeEmail(createUserDto.email),
      passwordHash,
      roleId: role.id,
      branchId,
      isActive: createUserDto.isActive ?? true,
      notes: this.normalizeOptionalText(createUserDto.notes),
    });

    const savedUser = await this.userRepository.save(user);
    const userWithRelations = await this.userRepository.findOneOrFail({ where: { id: savedUser.id } });

    return this.toSafeUser(userWithRelations);
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('The selected user was not found.');
    }

    await this.ensureUserIsUnique(
      {
        username: updateUserDto.username ?? user.username,
        email: updateUserDto.email !== undefined ? updateUserDto.email : user.email,
      },
      user.id,
    );

    if (updateUserDto.roleId) {
      const role = await this.rolesService.findByIdOrFail(updateUserDto.roleId);
      user.roleId = role.id;
    }

    if (updateUserDto.password) {
      user.passwordHash = await bcrypt.hash(updateUserDto.password, 12);
    }

    if (updateUserDto.fullName !== undefined) {
      user.fullName = updateUserDto.fullName.trim();
    }

    if (updateUserDto.username !== undefined) {
      user.username = updateUserDto.username.trim().toLowerCase();
    }

    if (updateUserDto.email !== undefined) {
      user.email = this.normalizeEmail(updateUserDto.email);
    }

    if (updateUserDto.branchId !== undefined) {
      user.branchId = await this.resolveBranchId(updateUserDto.branchId);
    } else if (updateUserDto.roleId) {
      user.branchId = await this.resolveBranchId(user.branchId);
    }

    if (updateUserDto.isActive !== undefined) {
      user.isActive = updateUserDto.isActive;
    }

    if (updateUserDto.notes !== undefined) {
      user.notes = this.normalizeOptionalText(updateUserDto.notes);
    }

    const savedUser = await this.userRepository.save(user);
    const userWithRelations = await this.userRepository.findOneOrFail({ where: { id: savedUser.id } });

    return this.toSafeUser(userWithRelations);
  }

  toSafeUser(user: UserEntity) {
    const permissions = [...new Set(user.role.permissions.map((permission) => permission.code))];

    return {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      role: {
        id: user.role.id,
        code: user.role.code,
        name: user.role.name,
      },
      branchId: user.branchId,
      branch: user.branch,
      branchAccess: this.getBranchAccess(user.role.code, user.branchId),
      permissions,
      isActive: user.isActive,
      notes: user.notes,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  getBranchAccess(roleCode: string, branchId: string | null) {
    if (roleCode === SYSTEM_ROLE_CODES.admin) {
      return {
        scope: 'all',
        branchIds: null,
      };
    }

    if (!branchId) {
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

  private async resolveBranchId(branchId?: string | null) {
    if (!branchId) {
      return null;
    }

    const branch = await this.branchesService.findById(branchId);

    if (!branch) {
      throw new NotFoundException('The selected branch was not found.');
    }

    return branch.id;
  }

  private async ensureUserIsUnique(
    data: { username: string; email: string | null | undefined },
    currentUserId?: string,
  ) {
    const normalizedUsername = data.username.trim().toLowerCase();
    const existingUsernameUser = await this.findByUsername(normalizedUsername);

    if (existingUsernameUser && existingUsernameUser.id !== currentUserId) {
      throw new ConflictException('A user with this username already exists.');
    }

    const normalizedEmail = this.normalizeEmail(data.email);

    if (normalizedEmail) {
      const existingEmailUser = await this.findByEmail(normalizedEmail);

      if (existingEmailUser && existingEmailUser.id !== currentUserId) {
        throw new ConflictException('A user with this email already exists.');
      }
    }
  }

  private normalizeEmail(email?: string | null) {
    const normalizedEmail = email?.trim().toLowerCase();
    return normalizedEmail ? normalizedEmail : null;
  }

  private normalizeOptionalText(value?: string | null) {
    const normalizedValue = value?.trim();
    return normalizedValue ? normalizedValue : null;
  }
}
