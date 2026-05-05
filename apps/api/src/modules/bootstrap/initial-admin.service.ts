import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { RoleEntity } from '../roles/entities/role.entity';
import { SYSTEM_ROLE_CODES } from '../roles/roles.constants';
import { UserEntity } from '../users/entities/user.entity';

@Injectable()
export class InitialAdminService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
  ) {}

  async onApplicationBootstrap() {
    let adminRole = await this.roleRepository.findOne({ where: { code: SYSTEM_ROLE_CODES.admin } });

    if (adminRole) {
      const existingAdminUsers = await this.userRepository.count({ where: { roleId: adminRole.id } });

      if (existingAdminUsers > 0) {
        return;
      }
    } else {
      adminRole = await this.roleRepository.save(
        this.roleRepository.create({
          code: SYSTEM_ROLE_CODES.admin,
          name: 'مدير النظام',
          notes: 'دور افتراضي لأول تشغيل.',
          permissions: [],
        }),
      );
    }

    const existingDefaultUsername = await this.userRepository.findOne({ where: { username: 'admin' } });

    if (existingDefaultUsername) {
      return;
    }

    const passwordHash = await bcrypt.hash('admin', 12);

    await this.userRepository.save(
      this.userRepository.create({
        fullName: 'مدير النظام',
        username: 'admin',
        email: null,
        passwordHash,
        roleId: adminRole.id,
        branchId: null,
        isActive: true,
        notes: 'حساب افتراضي لأول دخول. يرجى تغيير كلمة المرور بعد تسجيل الدخول.',
      }),
    );
  }
}
