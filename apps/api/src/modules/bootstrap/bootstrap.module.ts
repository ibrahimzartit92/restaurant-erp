import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleEntity } from '../roles/entities/role.entity';
import { UserEntity } from '../users/entities/user.entity';
import { InitialAdminService } from './initial-admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, RoleEntity])],
  providers: [InitialAdminService],
})
export class BootstrapModule {}
