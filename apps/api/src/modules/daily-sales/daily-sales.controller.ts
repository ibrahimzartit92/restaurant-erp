import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { UpsertDailySalesClosingDto } from './dto/upsert-daily-sales-closing.dto';
import { DailySalesClosingService } from './daily-sales-closing.service';
import { CreateDailySaleDto } from './dto/create-daily-sale.dto';
import { UpdateDailySaleDto } from './dto/update-daily-sale.dto';
import { DailySalesService } from './daily-sales.service';

@Controller('daily-sales')
export class DailySalesController {
  constructor(
    private readonly dailySalesService: DailySalesService,
    private readonly dailySalesClosingService: DailySalesClosingService,
  ) {}

  @Get()
  findAll(
    @Query('branch_id') branchId?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('status') status?: string,
  ) {
    return this.dailySalesClosingService.findAll({ branchId, dateFrom, dateTo, status });
  }

  @Get('closings/defaults')
  closingDefaults(@Query('branch_id') branchId: string) {
    return this.dailySalesClosingService.defaults(branchId);
  }

  @Post('closings/draft')
  upsertClosingDraft(@Body() dto: UpsertDailySalesClosingDto) {
    return this.dailySalesClosingService.upsertDraft(dto);
  }

  @Get('closings/:id/export')
  async exportClosing(@Param('id') id: string, @Query('format') format: 'excel' | 'pdf' = 'excel', @Res() response: any) {
    const file = await this.dailySalesClosingService.exportOne(id, format === 'pdf' ? 'pdf' : 'excel');
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    return response.send(file.body);
  }

  @Post('closings/:id/finalize')
  finalizeClosing(@Param('id') id: string) {
    return this.dailySalesClosingService.finalize(id);
  }

  @Post('closings/:id/cancel')
  cancelClosing(@Param('id') id: string, @Query('reverse_financial_effect') reverseFinancialEffect?: string) {
    return this.dailySalesClosingService.cancel(id, reverseFinancialEffect === 'true');
  }

  @Get('cash-summary')
  cashSummary(@Query('branch_id') branchId: string, @Query('sales_date') salesDate: string) {
    return this.dailySalesService.getCashSummary({ branchId, salesDate });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dailySalesClosingService.findByIdOrFail(id);
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
