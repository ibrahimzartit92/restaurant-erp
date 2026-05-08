import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { CreateWholesaleSalesInvoiceDto } from './dto/create-wholesale-sales-invoice.dto';
import { CreateWholesaleSalesPaymentBatchDto } from './dto/create-wholesale-sales-payment-batch.dto';
import { CreateWholesaleSalesPaymentDto } from './dto/create-wholesale-sales-payment.dto';
import { TransferWholesaleCashToVaultDto } from './dto/transfer-cash-to-vault.dto';
import { UpdateWholesaleSalesInvoiceDto } from './dto/update-wholesale-sales-invoice.dto';
import { WholesaleSalesService } from './wholesale-sales.service';

@Controller('wholesale-sales-invoices')
export class WholesaleSalesController {
  constructor(private readonly wholesaleSalesService: WholesaleSalesService) {}

  @Get()
  findAll(
    @Query('customer_id') customerId?: string,
    @Query('warehouse_id') warehouseId?: string,
    @Query('branch_id') branchId?: string,
    @Query('document_status') documentStatus?: string,
    @Query('payment_status') paymentStatus?: string,
    @Query('invoice_date_from') invoiceDateFrom?: string,
    @Query('invoice_date_to') invoiceDateTo?: string,
    @Query('search') search?: string,
  ) {
    return this.wholesaleSalesService.findAll({
      customerId,
      warehouseId,
      branchId,
      documentStatus,
      paymentStatus,
      invoiceDateFrom,
      invoiceDateTo,
      search,
    });
  }

  @Get('export')
  async exportList(
    @Query('format') format: 'excel' | 'pdf' = 'excel',
    @Query('customer_id') customerId: string | undefined,
    @Query('warehouse_id') warehouseId: string | undefined,
    @Query('branch_id') branchId: string | undefined,
    @Query('document_status') documentStatus: string | undefined,
    @Query('payment_status') paymentStatus: string | undefined,
    @Query('invoice_date_from') invoiceDateFrom: string | undefined,
    @Query('invoice_date_to') invoiceDateTo: string | undefined,
    @Query('search') search: string | undefined,
    @Res() response: any,
  ) {
    const file = await this.wholesaleSalesService.exportList(
      { customerId, warehouseId, branchId, documentStatus, paymentStatus, invoiceDateFrom, invoiceDateTo, search },
      format === 'pdf' ? 'pdf' : 'excel',
    );
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    return response.send(file.body);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.wholesaleSalesService.findDetails(id);
  }

  @Get(':id/export')
  async exportInvoice(@Param('id') id: string, @Query('format') format: 'excel' | 'pdf' = 'excel', @Res() response: any) {
    const file = await this.wholesaleSalesService.exportInvoice(id, format === 'pdf' ? 'pdf' : 'excel');
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    return response.send(file.body);
  }

  @Post()
  create(@Body() dto: CreateWholesaleSalesInvoiceDto) {
    return this.wholesaleSalesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWholesaleSalesInvoiceDto) {
    return this.wholesaleSalesService.update(id, dto);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string) {
    return this.wholesaleSalesService.approve(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.wholesaleSalesService.cancel(id);
  }

  @Post(':id/payments')
  addPayment(@Param('id') id: string, @Body() dto: CreateWholesaleSalesPaymentDto) {
    return this.wholesaleSalesService.addPayment(id, dto);
  }

  @Post(':id/payments/batch')
  addPaymentBatch(@Param('id') id: string, @Body() dto: CreateWholesaleSalesPaymentBatchDto) {
    return this.wholesaleSalesService.addPaymentBatch({ ...dto, invoiceId: id });
  }

  @Post(':id/transfer-cash-to-vault')
  transferCashToVault(@Param('id') id: string, @Body() dto: TransferWholesaleCashToVaultDto) {
    return this.wholesaleSalesService.transferCashToVault(id, dto);
  }

  @Post(':id/delete')
  deleteByPost(@Param('id') id: string) {
    return this.wholesaleSalesService.remove(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.wholesaleSalesService.remove(id);
  }
}
