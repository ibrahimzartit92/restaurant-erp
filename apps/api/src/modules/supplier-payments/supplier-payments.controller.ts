import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateSupplierPaymentBatchDto } from './dto/create-supplier-payment-batch.dto';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { UpdateSupplierPaymentDto } from './dto/update-supplier-payment.dto';
import { SupplierPaymentMethod } from './entities/supplier-payment.entity';
import { SupplierPaymentsService } from './supplier-payments.service';

@Controller('supplier-payments')
export class SupplierPaymentsController {
  constructor(private readonly supplierPaymentsService: SupplierPaymentsService) {}

  @Get()
  findAll(
    @Query('purchase_invoice_id') purchaseInvoiceId?: string,
    @Query('branch_id') branchId?: string,
    @Query('supplier_id') supplierId?: string,
    @Query('payment_method') paymentMethod?: SupplierPaymentMethod,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('search') search?: string,
  ) {
    return this.supplierPaymentsService.findAll({
      purchaseInvoiceId,
      branchId,
      supplierId,
      paymentMethod,
      dateFrom,
      dateTo,
      search,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.supplierPaymentsService.findByIdOrFail(id);
  }

  @Post()
  create(@Body() createSupplierPaymentDto: CreateSupplierPaymentDto) {
    return this.supplierPaymentsService.create(createSupplierPaymentDto);
  }

  @Post('batch')
  createBatch(@Body() createSupplierPaymentBatchDto: CreateSupplierPaymentBatchDto) {
    return this.supplierPaymentsService.createBatch(createSupplierPaymentBatchDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSupplierPaymentDto: UpdateSupplierPaymentDto) {
    return this.supplierPaymentsService.update(id, updateSupplierPaymentDto);
  }

  @Post(':id/delete')
  deleteByPost(
    @Param('id') id: string,
    @Query('reverse_financial_effect') reverseFinancialEffect?: string,
    @Query('vault_id') vaultId?: string,
  ) {
    return this.supplierPaymentsService.remove(id, reverseFinancialEffect === 'true', vaultId);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Query('reverse_financial_effect') reverseFinancialEffect?: string,
    @Query('vault_id') vaultId?: string,
  ) {
    return this.supplierPaymentsService.remove(id, reverseFinancialEffect === 'true', vaultId);
  }
}
