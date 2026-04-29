import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
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
