import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateDrawerDto } from './dto/create-drawer.dto';
import { UpdateDrawerDto } from './dto/update-drawer.dto';
import { DrawersService } from './drawers.service';

@Controller('drawers')
export class DrawersController {
  constructor(private readonly drawersService: DrawersService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.drawersService.findAll(search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.drawersService.findByIdOrFail(id);
  }

  @Post()
  create(@Body() createDrawerDto: CreateDrawerDto) {
    return this.drawersService.create(createDrawerDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDrawerDto: UpdateDrawerDto) {
    return this.drawersService.update(id, updateDrawerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.drawersService.remove(id);
  }
}
