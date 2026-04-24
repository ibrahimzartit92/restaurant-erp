import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateDrawerTransactionDto } from './dto/create-drawer-transaction.dto';
import { UpdateDrawerTransactionDto } from './dto/update-drawer-transaction.dto';
import { DrawerTransactionsService } from './drawer-transactions.service';

@Controller('drawer-transactions')
export class DrawerTransactionsController {
  constructor(private readonly drawerTransactionsService: DrawerTransactionsService) {}

  @Get()
  findAll(
    @Query('drawer_id') drawerId?: string,
    @Query('branch_id') branchId?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    return this.drawerTransactionsService.findAll({ drawerId, branchId, dateFrom, dateTo });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.drawerTransactionsService.findByIdOrFail(id);
  }

  @Post()
  create(@Body() createDrawerTransactionDto: CreateDrawerTransactionDto) {
    return this.drawerTransactionsService.create(createDrawerTransactionDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDrawerTransactionDto: UpdateDrawerTransactionDto) {
    return this.drawerTransactionsService.update(id, updateDrawerTransactionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.drawerTransactionsService.remove(id);
  }
}
