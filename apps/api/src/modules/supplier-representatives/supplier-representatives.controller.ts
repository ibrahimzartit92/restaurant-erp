import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateSupplierRepresentativeDto } from './dto/create-supplier-representative.dto';
import { UpdateSupplierRepresentativeDto } from './dto/update-supplier-representative.dto';
import { SupplierRepresentativesService } from './supplier-representatives.service';

@Controller('supplier-representatives')
export class SupplierRepresentativesController {
  constructor(private readonly supplierRepresentativesService: SupplierRepresentativesService) {}

  @Get()
  findAll(@Query('search') search?: string, @Query('supplierId') supplierId?: string) {
    return this.supplierRepresentativesService.findAll(search, supplierId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.supplierRepresentativesService.findByIdOrFail(id);
  }

  @Post()
  create(@Body() createSupplierRepresentativeDto: CreateSupplierRepresentativeDto) {
    return this.supplierRepresentativesService.create(createSupplierRepresentativeDto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSupplierRepresentativeDto: UpdateSupplierRepresentativeDto,
  ) {
    return this.supplierRepresentativesService.update(id, updateSupplierRepresentativeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.supplierRepresentativesService.remove(id);
  }
}
