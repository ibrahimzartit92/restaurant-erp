import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateStockCountDto } from './dto/create-stock-count.dto';
import { UpdateStockCountDto } from './dto/update-stock-count.dto';
import { StockCountsService } from './stock-counts.service';

@Controller('stock-counts')
export class StockCountsController {
  constructor(private readonly stockCountsService: StockCountsService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('branch_id') branchId?: string,
    @Query('warehouse_id') warehouseId?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    return this.stockCountsService.findAll({
      search,
      branchId,
      warehouseId,
      dateFrom,
      dateTo,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.stockCountsService.findByIdOrFail(id);
  }

  @Post()
  create(@Body() createDto: CreateStockCountDto) {
    return this.stockCountsService.create(createDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateStockCountDto) {
    return this.stockCountsService.update(id, updateDto);
  }
}
