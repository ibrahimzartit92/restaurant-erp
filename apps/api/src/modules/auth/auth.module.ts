import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionGuard } from './guards/permission.guard';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    UsersModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'change_this_secret_before_production',
      signOptions: {
        expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, PermissionGuard],
  exports: [AuthService, JwtModule, JwtAuthGuard, PermissionGuard],
})
export class AuthModule {}
