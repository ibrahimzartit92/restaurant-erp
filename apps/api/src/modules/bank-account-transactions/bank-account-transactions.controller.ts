import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CreateBankAccountTransactionDto } from './dto/create-bank-account-transaction.dto';
import { BankAccountTransactionsService } from './bank-account-transactions.service';
import {
  BankAccountTransactionDirection,
  BankAccountTransactionType,
} from './entities/bank-account-transaction.entity';

@Controller('bank-account-transactions')
export class BankAccountTransactionsController {
  constructor(private readonly transactionsService: BankAccountTransactionsService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('bank_account_id') bankAccountId?: string,
    @Query('branch_id') branchId?: string,
    @Query('transaction_type') transactionType?: BankAccountTransactionType,
    @Query('direction') direction?: BankAccountTransactionDirection,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    return this.transactionsService.findAll({
      search,
      bankAccountId,
      branchId,
      transactionType,
      direction,
      dateFrom,
      dateTo,
    });
  }

  @Post()
  create(@Body() createDto: CreateBankAccountTransactionDto) {
    return this.transactionsService.create(createDto);
  }
}
