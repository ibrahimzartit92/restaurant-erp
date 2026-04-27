import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportFilters } from './reports.types';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  getCatalog() {
    return this.reportsService.getCatalog();
  }

  @Get(':key/export')
  async exportReport(
    @Param('key') key: string,
    @Query('format') format: 'excel' | 'pdf' = 'excel',
    @Query('branch_id') branchId: string | undefined,
    @Query('supplier_id') supplierId: string | undefined,
    @Query('employee_id') employeeId: string | undefined,
    @Query('date_from') dateFrom: string | undefined,
    @Query('date_to') dateTo: string | undefined,
    @Query('status') status: string | undefined,
    @Query('category_id') categoryId: string | undefined,
    @Query('payment_method') paymentMethod: string | undefined,
    @Res() response: any,
  ) {
    const exportFile = await this.reportsService.exportReport(
      key,
      { branchId, supplierId, employeeId, dateFrom, dateTo, status, categoryId, paymentMethod },
      format === 'pdf' ? 'pdf' : 'excel',
    );

    response.setHeader('Content-Type', exportFile.contentType);
    response.setHeader('Content-Disposition', `attachment; filename="${exportFile.filename}"`);
    return response.send(exportFile.body);
  }

  @Get(':key')
  getReport(
    @Param('key') key: string,
    @Query('branch_id') branchId?: string,
    @Query('supplier_id') supplierId?: string,
    @Query('employee_id') employeeId?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('status') status?: string,
    @Query('category_id') categoryId?: string,
    @Query('payment_method') paymentMethod?: string,
  ) {
    const filters: ReportFilters = {
      branchId,
      supplierId,
      employeeId,
      dateFrom,
      dateTo,
      status,
      categoryId,
      paymentMethod,
    };

    return this.reportsService.getReport(key, filters);
  }
}
