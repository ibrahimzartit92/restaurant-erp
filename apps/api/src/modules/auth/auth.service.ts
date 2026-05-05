import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { SYSTEM_ROLE_CODES } from '../roles/roles.constants';

@Injectable()
export class AuthService {
  private readonly loginAttempts = new Map<
    string,
    { count: number; windowStartedAt: number; lockedUntil: number | null }
  >();

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(login: string, password: string) {
    this.assertLoginIsAllowed(login);
    const user = await this.usersService.findByLogin(login);

    if (!user || !user.isActive) {
      this.recordFailedLogin(login);
      throw new UnauthorizedException('اسم المستخدم أو كلمة المرور غير صحيحة.');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      this.recordFailedLogin(login);
      throw new UnauthorizedException('اسم المستخدم أو كلمة المرور غير صحيحة.');
    }

    this.clearFailedLogin(login);
    const safeUser = this.usersService.toSafeUser(user);
    const mustChangePassword = user.username === 'admin' && (await bcrypt.compare('admin', user.passwordHash));
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role.code,
      branchAccess: safeUser.branchAccess,
      permissions: safeUser.permissions,
      isAdmin: user.role.code === SYSTEM_ROLE_CODES.admin,
      mustChangePassword,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
      user: { ...safeUser, mustChangePassword },
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.usersService.findById(userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid session.');
    }

    const passwordMatches = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!passwordMatches) {
      throw new BadRequestException('كلمة المرور الحالية غير صحيحة.');
    }

    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.');
    }

    if (user.username === 'admin' && newPassword === 'admin') {
      throw new BadRequestException('يجب تغيير كلمة المرور الافتراضية إلى كلمة مرور أقوى.');
    }

    await this.usersService.setPassword(user.id, newPassword);

    return this.login(user.username, newPassword);
  }

  private normalizeLoginKey(login: string) {
    return login.trim().toLowerCase() || 'unknown';
  }

  private assertLoginIsAllowed(login: string) {
    const key = this.normalizeLoginKey(login);
    const attempt = this.loginAttempts.get(key);
    const now = Date.now();

    if (attempt?.lockedUntil && attempt.lockedUntil > now) {
      const seconds = Math.ceil((attempt.lockedUntil - now) / 1000);
      throw new UnauthorizedException(`تم إيقاف محاولات الدخول مؤقتا. حاول مرة أخرى بعد ${seconds} ثانية.`);
    }
  }

  private recordFailedLogin(login: string) {
    const key = this.normalizeLoginKey(login);
    const now = Date.now();
    const existing = this.loginAttempts.get(key);
    const windowMs = 60_000;

    if (!existing || now - existing.windowStartedAt > windowMs) {
      this.loginAttempts.set(key, { count: 1, windowStartedAt: now, lockedUntil: null });
      return;
    }

    const count = existing.count + 1;
    this.loginAttempts.set(key, {
      count,
      windowStartedAt: existing.windowStartedAt,
      lockedUntil: count >= 3 ? now + windowMs : null,
    });
  }

  private clearFailedLogin(login: string) {
    this.loginAttempts.delete(this.normalizeLoginKey(login));
  }
}
