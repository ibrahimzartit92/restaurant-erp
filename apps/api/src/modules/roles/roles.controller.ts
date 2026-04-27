import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { AssignRolePermissionsDto } from './dto/assign-role-permissions.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('manage_roles')
  findAll(@Query('search') search?: string) {
    return this.rolesService.findAll(search);
  }

  @Get(':id')
  @RequirePermissions('manage_roles')
  findOne(@Param('id') id: string) {
    return this.rolesService.findByIdOrFail(id);
  }

  @Post()
  @RequirePermissions('manage_roles')
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @Patch(':id')
  @RequirePermissions('manage_roles')
  update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.update(id, updateRoleDto);
  }

  @Patch(':id/permissions')
  @RequirePermissions('manage_roles')
  assignPermissions(@Param('id') id: string, @Body() assignRolePermissionsDto: AssignRolePermissionsDto) {
    return this.rolesService.assignPermissions(id, assignRolePermissionsDto);
  }
}
