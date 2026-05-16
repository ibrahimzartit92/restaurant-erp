import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { CreateBankAccountTransactionDto } from './dto/create-bank-account-transaction.dto';
import { BankAccountTransactionsService } from './bank-account-transactions.service';
import {
  BankAccountTransactionDirection,
  BankAccountTransactionType,
} from './entities/bank-account-transaction.entity';

@Controller('bank-account-transactions')
export class BankAccountTransactionsController {
  constructor(private readonly transactionsService: BankAccountTransactionsService) {}

  @Get('export')
  async exportAll(
    @Query('search') search: string | undefined,
    @Query('bank_account_id') bankAccountId: string | undefined,
    @Query('branch_id') branchId: string | undefined,
    @Query('transaction_type') transactionType: BankAccountTransactionType | undefined,
    @Query('direction') direction: BankAccountTransactionDirection | undefined,
    @Query('date_from') dateFrom: string | undefined,
    @Query('date_to') dateTo: string | undefined,
    @Query('format') format: 'excel' | 'pdf' = 'excel',
    @Res() response: any,
  ) {
    const file = await this.transactionsService.exportAll(
      { search, bankAccountId, branchId, transactionType, direction, dateFrom, dateTo },
      format === 'pdf' ? 'pdf' : 'excel',
    );
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    return response.send(file.body);
  }

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
