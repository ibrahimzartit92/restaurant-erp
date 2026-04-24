import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { SYSTEM_ROLE_CODES } from '../roles/roles.constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(login: string, password: string) {
    const user = await this.usersService.findByLogin(login);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid login or password.');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid login or password.');
    }

    const safeUser = this.usersService.toSafeUser(user);
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role.code,
      branchAccess: safeUser.branchAccess,
      permissions: safeUser.permissions,
      isAdmin: user.role.code === SYSTEM_ROLE_CODES.admin,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
      user: safeUser,
    };
  }
}
