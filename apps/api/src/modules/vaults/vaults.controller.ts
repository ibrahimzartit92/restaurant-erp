import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { CreateVaultTransferDto } from './dto/create-vault-transfer.dto';
import { CreateVaultDto } from './dto/create-vault.dto';
import { UpdateVaultDto } from './dto/update-vault.dto';
import { VaultTransactionDirection, VaultTransactionType } from './entities/vault-transaction.entity';
import { VaultsService } from './vaults.service';

@Controller('vaults')
export class VaultsController {
  constructor(private readonly vaultsService: VaultsService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.vaultsService.findAll(search);
  }

  @Get('transactions')
  findTransactions(
    @Query('vault_id') vaultId?: string,
    @Query('transaction_type') transactionType?: VaultTransactionType,
    @Query('direction') direction?: VaultTransactionDirection,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('search') search?: string,
  ) {
    return this.vaultsService.findTransactions({ vaultId, transactionType, direction, dateFrom, dateTo, search });
  }

  @Get('transactions/export')
  async exportTransactions(
    @Query('vault_id') vaultId: string | undefined,
    @Query('transaction_type') transactionType: VaultTransactionType | undefined,
    @Query('direction') direction: VaultTransactionDirection | undefined,
    @Query('date_from') dateFrom: string | undefined,
    @Query('date_to') dateTo: string | undefined,
    @Query('search') search: string | undefined,
    @Query('format') format: 'excel' | 'pdf' = 'excel',
    @Res() response: any,
  ) {
    const file = await this.vaultsService.exportTransactions(
      { vaultId, transactionType, direction, dateFrom, dateTo, search },
      format === 'pdf' ? 'pdf' : 'excel',
    );
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    return response.send(file.body);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vaultsService.findByIdOrFail(id);
  }

  @Post()
  create(@Body() createVaultDto: CreateVaultDto) {
    return this.vaultsService.create(createVaultDto);
  }

  @Post(':id/transactions')
  createTransfer(@Param('id') id: string, @Body() createVaultTransferDto: CreateVaultTransferDto) {
    return this.vaultsService.createTransfer(id, createVaultTransferDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVaultDto: UpdateVaultDto) {
    return this.vaultsService.update(id, updateVaultDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vaultsService.remove(id);
  }
}
