import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateSupplierPaymentDto } from '../supplier-payments/dto/create-supplier-payment.dto';
import { SupplierPaymentsService } from '../supplier-payments/supplier-payments.service';
import { CreatePurchaseInvoiceDto } from './dto/create-purchase-invoice.dto';
import { UpdatePurchaseInvoiceDto } from './dto/update-purchase-invoice.dto';
import { PurchaseInvoiceStatus } from './entities/purchase-invoice.entity';
import { PurchaseInvoicesService } from './purchase-invoices.service';

@Controller('purchase-invoices')
export class PurchaseInvoicesController {
  constructor(
    private readonly purchaseInvoicesService: PurchaseInvoicesService,
    private readonly supplierPaymentsService: SupplierPaymentsService,
  ) {}

  @Get()
  findAll(
    @Query('branch_id') branchId?: string,
    @Query('supplier_id') supplierId?: string,
    @Query('status') status?: PurchaseInvoiceStatus,
    @Query('invoice_date_from') invoiceDateFrom?: string,
    @Query('invoice_date_to') invoiceDateTo?: string,
    @Query('search') search?: string,
  ) {
    return this.purchaseInvoicesService.findAll({
      branchId,
      supplierId,
      status,
      invoiceDateFrom,
      invoiceDateTo,
      search,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchaseInvoicesService.findDetails(id);
  }

  @Post()
  create(@Body() createPurchaseInvoiceDto: CreatePurchaseInvoiceDto) {
    return this.purchaseInvoicesService.create(createPurchaseInvoiceDto);
  }

  @Post(':id/payments')
  addPayment(@Param('id') id: string, @Body() createSupplierPaymentDto: CreateSupplierPaymentDto) {
    return this.supplierPaymentsService.create({
      ...createSupplierPaymentDto,
      purchaseInvoiceId: id,
    });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePurchaseInvoiceDto: UpdatePurchaseInvoiceDto) {
    return this.purchaseInvoicesService.update(id, updatePurchaseInvoiceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.purchaseInvoicesService.remove(id);
  }
}
