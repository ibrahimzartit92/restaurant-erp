import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateDailySaleDto } from './dto/create-daily-sale.dto';
import { UpdateDailySaleDto } from './dto/update-daily-sale.dto';
import { DailySalesService } from './daily-sales.service';

@Controller('daily-sales')
export class DailySalesController {
  constructor(private readonly dailySalesService: DailySalesService) {}

  @Get()
  findAll(
    @Query('branch_id') branchId?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    return this.dailySalesService.findAll({ branchId, dateFrom, dateTo });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dailySalesService.findByIdOrFail(id);
  }

  @Post()
  create(@Body() createDailySaleDto: CreateDailySaleDto) {
    return this.dailySalesService.create(createDailySaleDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDailySaleDto: UpdateDailySaleDto) {
    return this.dailySalesService.update(id, updateDailySaleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.dailySalesService.remove(id);
  }
}
