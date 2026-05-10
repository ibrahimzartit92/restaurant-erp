import { Body, Controller, Get, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { CreateEmployeeDebtDto } from './dto/create-employee-debt.dto';
import { CreateObligationRepaymentDto } from './dto/create-obligation-repayment.dto';
import { UpdateEmployeeDebtDto } from './dto/update-employee-debt.dto';
import { EmployeeFinancialObligationsService } from './employee-financial-obligations.service';

@Controller('employee-financial-obligations')
export class EmployeeFinancialObligationsController {
  constructor(private readonly obligationsService: EmployeeFinancialObligationsService) {}

  @Get()
  findAll(
    @Query('employee_id') employeeId?: string,
    @Query('branch_id') branchId?: string,
    @Query('obligation_type') obligationType?: string,
    @Query('status') status?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('debt_repayment_mode') debtRepaymentMode?: string,
  ) {
    return this.obligationsService.findAll({
      employeeId,
      branchId,
      obligationType,
      status,
      dateFrom,
      dateTo,
      debtRepaymentMode,
    });
  }

  @Get('summary/:employeeId')
  summary(@Param('employeeId') employeeId: string) {
    return this.obligationsService.getEmployeeSummary(employeeId);
  }

  @Get('export')
  async exportList(
    @Query('format') format: 'excel' | 'pdf' = 'excel',
    @Query('employee_id') employeeId: string | undefined,
    @Query('branch_id') branchId: string | undefined,
    @Query('obligation_type') obligationType: string | undefined,
    @Query('status') status: string | undefined,
    @Query('date_from') dateFrom: string | undefined,
    @Query('date_to') dateTo: string | undefined,
    @Query('debt_repayment_mode') debtRepaymentMode: string | undefined,
    @Res() response: any,
  ) {
    const file = await this.obligationsService.exportList(
      { employeeId, branchId, obligationType, status, dateFrom, dateTo, debtRepaymentMode },
      format === 'pdf' ? 'pdf' : 'excel',
    );
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    return response.send(file.body);
  }

  @Post('debts')
  createDebt(@Body() dto: CreateEmployeeDebtDto) {
    return this.obligationsService.createDebt(dto);
  }

  @Patch('debts/:id')
  updateDebt(@Param('id') id: string, @Body() dto: UpdateEmployeeDebtDto) {
    return this.obligationsService.updateDebt(id, dto);
  }

  @Post('debts/:id/cancel')
  cancelDebt(@Param('id') id: string, @Query('reverse_financial_effect') reverseFinancialEffect?: string) {
    return this.obligationsService.cancelDebt(id, reverseFinancialEffect === 'true');
  }

  @Post('repayments')
  recordRepayment(@Body() dto: CreateObligationRepaymentDto) {
    return this.obligationsService.recordManualRepayment(dto);
  }
}
