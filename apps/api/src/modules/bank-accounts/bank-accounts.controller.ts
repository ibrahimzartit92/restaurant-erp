import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { BankAccountsService } from './bank-accounts.service';

@Controller('bank-accounts')
export class BankAccountsController {
  constructor(private readonly bankAccountsService: BankAccountsService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.bankAccountsService.findAll(search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bankAccountsService.findByIdOrFail(id);
  }

  @Post()
  create(@Body() createBankAccountDto: CreateBankAccountDto) {
    return this.bankAccountsService.create(createBankAccountDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBankAccountDto: UpdateBankAccountDto) {
    return this.bankAccountsService.update(id, updateBankAccountDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bankAccountsService.remove(id);
  }
}
