import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { UpdateSupplierPaymentDto } from './dto/update-supplier-payment.dto';
import { SupplierPaymentsService } from './supplier-payments.service';

@Controller('supplier-payments')
export class SupplierPaymentsController {
  constructor(private readonly supplierPaymentsService: SupplierPaymentsService) {}

  @Get()
  findAll(
    @Query('purchase_invoice_id') purchaseInvoiceId?: string,
    @Query('branch_id') branchId?: string,
  ) {
    return this.supplierPaymentsService.findAll(purchaseInvoiceId, branchId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.supplierPaymentsService.findByIdOrFail(id);
  }

  @Post()
  create(@Body() createSupplierPaymentDto: CreateSupplierPaymentDto) {
    return this.supplierPaymentsService.create(createSupplierPaymentDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSupplierPaymentDto: UpdateSupplierPaymentDto) {
    return this.supplierPaymentsService.update(id, updateSupplierPaymentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.supplierPaymentsService.remove(id);
  }
}
