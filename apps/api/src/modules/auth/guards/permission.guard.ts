import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SYSTEM_ROLE_CODES } from '../../roles/roles.constants';
import { REQUIRED_PERMISSIONS_KEY } from '../require-permissions.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: { role: { code: string }; permissions: string[] } }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('The authenticated user context is missing.');
    }

    if (user.role.code === SYSTEM_ROLE_CODES.admin) {
      return true;
    }

    const hasPermission = requiredPermissions.every((permission) => user.permissions.includes(permission));

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }

    return true;
  }
}
