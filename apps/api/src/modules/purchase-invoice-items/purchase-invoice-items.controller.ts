import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreatePurchaseInvoiceItemDto } from './dto/create-purchase-invoice-item.dto';
import { UpdatePurchaseInvoiceItemDto } from './dto/update-purchase-invoice-item.dto';
import { PurchaseInvoiceItemsService } from './purchase-invoice-items.service';

@Controller('purchase-invoice-items')
export class PurchaseInvoiceItemsController {
  constructor(private readonly purchaseInvoiceItemsService: PurchaseInvoiceItemsService) {}

  @Get()
  findAll(@Query('purchase_invoice_id') purchaseInvoiceId?: string) {
    return this.purchaseInvoiceItemsService.findAll(purchaseInvoiceId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchaseInvoiceItemsService.findByIdOrFail(id);
  }

  @Post()
  create(@Body() createPurchaseInvoiceItemDto: CreatePurchaseInvoiceItemDto) {
    return this.purchaseInvoiceItemsService.create(createPurchaseInvoiceItemDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePurchaseInvoiceItemDto: UpdatePurchaseInvoiceItemDto) {
    return this.purchaseInvoiceItemsService.update(id, updatePurchaseInvoiceItemDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.purchaseInvoiceItemsService.remove(id);
  }
}
