import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CloseDrawerDailySessionDto } from './dto/close-drawer-daily-session.dto';
import { CreateDrawerDailySessionDto } from './dto/create-drawer-daily-session.dto';
import { UpdateDrawerDailySessionDto } from './dto/update-drawer-daily-session.dto';
import { DrawerDailySessionsService } from './drawer-daily-sessions.service';

@Controller('drawer-daily-sessions')
export class DrawerDailySessionsController {
  constructor(private readonly drawerDailySessionsService: DrawerDailySessionsService) {}

  @Get()
  findAll(
    @Query('drawer_id') drawerId?: string,
    @Query('branch_id') branchId?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    return this.drawerDailySessionsService.findAll({ drawerId, branchId, dateFrom, dateTo });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.drawerDailySessionsService.findDetails(id);
  }

  @Post()
  create(@Body() createDrawerDailySessionDto: CreateDrawerDailySessionDto) {
    return this.drawerDailySessionsService.create(createDrawerDailySessionDto);
  }

  @Post(':id/close')
  close(@Param('id') id: string, @Body() closeDrawerDailySessionDto: CloseDrawerDailySessionDto) {
    return this.drawerDailySessionsService.close(id, closeDrawerDailySessionDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDrawerDailySessionDto: UpdateDrawerDailySessionDto) {
    return this.drawerDailySessionsService.update(id, updateDrawerDailySessionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.drawerDailySessionsService.remove(id);
  }
}
