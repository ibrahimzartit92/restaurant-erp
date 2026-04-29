import { Controller, Get, Query, Res } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getDashboard(
    @Query('branch_id') branchId?: string,
    @Query('period') period?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    return this.dashboardService.getDashboard({ branchId, period, dateFrom, dateTo });
  }

  @Get('export')
  async exportDashboard(
    @Query('format') format: 'excel' | 'pdf' = 'excel',
    @Query('branch_id') branchId: string | undefined,
    @Query('period') period: string | undefined,
    @Query('date_from') dateFrom: string | undefined,
    @Query('date_to') dateTo: string | undefined,
    @Res() response: any,
  ) {
    const exportFile = await this.dashboardService.exportDashboard(
      { branchId, period, dateFrom, dateTo },
      format === 'pdf' ? 'pdf' : 'excel',
    );

    response.setHeader('Content-Type', exportFile.contentType);
    response.setHeader('Content-Disposition', `attachment; filename="${exportFile.filename}"`);
    return response.send(exportFile.body);
  }
}
