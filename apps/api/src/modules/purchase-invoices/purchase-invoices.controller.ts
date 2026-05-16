import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateSupplierPaymentBatchDto } from '../supplier-payments/dto/create-supplier-payment-batch.dto';
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
    @Query('category_id') categoryId?: string,
    @Query('invoice_date_from') invoiceDateFrom?: string,
    @Query('invoice_date_to') invoiceDateTo?: string,
    @Query('search') search?: string,
  ) {
    return this.purchaseInvoicesService.findAll({
      branchId,
      supplierId,
      status,
      categoryId,
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

  @Post(':id/payments/batch')
  addPaymentBatch(@Param('id') id: string, @Body() createSupplierPaymentBatchDto: CreateSupplierPaymentBatchDto) {
    return this.supplierPaymentsService.createBatch({
      ...createSupplierPaymentBatchDto,
      purchaseInvoiceId: id,
    });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePurchaseInvoiceDto: UpdatePurchaseInvoiceDto) {
    return this.purchaseInvoicesService.update(id, updatePurchaseInvoiceDto);
  }

  @Post(':id/reopen')
  reopen(@Param('id') id: string) {
    return this.purchaseInvoicesService.reopenForEditing(id);
  }

  @Post(':id/reapprove')
  reapprove(@Param('id') id: string) {
    return this.purchaseInvoicesService.reapprove(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Query('vault_id') vaultId?: string) {
    return this.purchaseInvoicesService.cancel(id, vaultId);
  }

  @Post(':id/delete')
  deleteByPost(@Param('id') id: string) {
    return this.purchaseInvoicesService.remove(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.purchaseInvoicesService.remove(id);
  }
}
