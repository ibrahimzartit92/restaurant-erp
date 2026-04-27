import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateItemCategoryDto } from './dto/create-item-category.dto';
import { UpdateItemCategoryDto } from './dto/update-item-category.dto';
import { ItemCategoriesService } from './item-categories.service';

@Controller('item-categories')
export class ItemCategoriesController {
  constructor(private readonly itemCategoriesService: ItemCategoriesService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.itemCategoriesService.findAll(search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.itemCategoriesService.findByIdOrFail(id);
  }

  @Post()
  create(@Body() createItemCategoryDto: CreateItemCategoryDto) {
    return this.itemCategoriesService.create(createItemCategoryDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateItemCategoryDto: UpdateItemCategoryDto) {
    return this.itemCategoriesService.update(id, updateItemCategoryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.itemCategoriesService.remove(id);
  }
}
