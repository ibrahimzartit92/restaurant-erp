import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BankAccountEntity } from '../bank-accounts/entities/bank-account.entity';
import {
  BankAccountTransactionDirection,
  BankAccountTransactionEntity,
  BankAccountTransactionType,
} from '../bank-account-transactions/entities/bank-account-transaction.entity';
import { BranchEntity } from '../branches/entities/branch.entity';
import {
  DrawerTransactionDirection,
  DrawerTransactionEntity,
  DrawerTransactionType,
} from '../drawer-transactions/entities/drawer-transaction.entity';
import { DrawerEntity } from '../drawers/entities/drawer.entity';
import {
  VaultTransactionDirection,
  VaultTransactionEntity,
  VaultTransactionType,
} from '../vaults/entities/vault-transaction.entity';
import { VaultEntity } from '../vaults/entities/vault.entity';
import { CreateDailySaleDto } from './dto/create-daily-sale.dto';
import { UpdateDailySaleDto } from './dto/update-daily-sale.dto';
import { DailySaleEntity } from './entities/daily-sale.entity';

@Injectable()
export class DailySalesService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(DailySaleEntity)
    private readonly dailySaleRepository: Repository<DailySaleEntity>,
    @InjectRepository(BranchEntity)
    private readonly branchRepository: Repository<BranchEntity>,
    @InjectRepository(DrawerEntity)
    private readonly drawerRepository: Repository<DrawerEntity>,
    @InjectRepository(BankAccountEntity)
    private readonly bankAccountRepository: Repository<BankAccountEntity>,
  ) {}

  findAll(filters: { branchId?: string; dateFrom?: string; dateTo?: string }) {
    const query = this.dailySaleRepository
      .createQueryBuilder('dailySale')
      .leftJoinAndSelect('dailySale.branch', 'branch')
      .orderBy('dailySale.salesDate', 'DESC');

    if (filters.branchId) {
      query.andWhere('dailySale.branch_id = :branchId', { branchId: filters.branchId });
    }

    if (filters.dateFrom) {
      query.andWhere('dailySale.sales_date >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      query.andWhere('dailySale.sales_date <= :dateTo', { dateTo: filters.dateTo });
    }

    return query.getMany();
  }

  async findByIdOrFail(id: string) {
    const dailySale = await this.dailySaleRepository.findOne({ where: { id } });

    if (!dailySale) {
      throw new NotFoundException('Daily sales record was not found.');
    }

    const vaultTransfer = await this.dataSource.manager.getRepository(VaultTransactionEntity).findOne({
      where: { sourceType: 'daily_sale_vault_transfer', sourceId: dailySale.id },
    });

    return {
      ...dailySale,
      vaultTransferVaultId: vaultTransfer?.vaultId ?? null,
      vaultTransferAmount: vaultTransfer?.amount ?? 0,
      vaultTransferNotes: vaultTransfer?.notes ?? null,
    };
  }

  async create(createDailySaleDto: CreateDailySaleDto) {
    await this.ensureBranchExists(createDailySaleDto.branchId);
    const financialReferences = await this.resolveFinancialReferences(createDailySaleDto);
    await this.ensureBranchDateIsAvailable(createDailySaleDto.branchId, createDailySaleDto.salesDate);

    const dailySale = this.dailySaleRepository.create({
      ...createDailySaleDto,
      cashSalesAmount: createDailySaleDto.cashSalesAmount ?? 0,
      drawerId: financialReferences.drawerId,
      bankSalesAmount: createDailySaleDto.bankSalesAmount ?? 0,
      bankAccountId: financialReferences.bankAccountId,
      deliverySalesAmount: createDailySaleDto.deliverySalesAmount ?? 0,
      websiteSalesAmount: createDailySaleDto.websiteSalesAmount ?? 0,
      tipsAmount: createDailySaleDto.tipsAmount ?? 0,
      salesReturnAmount: createDailySaleDto.salesReturnAmount ?? 0,
      netSalesAmount: this.calculateNetSales(createDailySaleDto),
      notes: createDailySaleDto.notes ?? null,
    });

    return this.dataSource.transaction(async (manager) => {
      const savedDailySale = await manager.getRepository(DailySaleEntity).save(dailySale);
      await this.recreateFinancialMovement(savedDailySale, manager, {
        vaultId: createDailySaleDto.vaultTransferVaultId,
        amount: createDailySaleDto.vaultTransferAmount,
        notes: createDailySaleDto.vaultTransferNotes,
      });
      return savedDailySale;
    });
  }

  async update(id: string, updateDailySaleDto: UpdateDailySaleDto) {
    const dailySale = await this.findByIdOrFail(id);
    const branchId = updateDailySaleDto.branchId ?? dailySale.branchId;
    const salesDate = updateDailySaleDto.salesDate ?? dailySale.salesDate;

    await this.ensureBranchExists(branchId);
    const financialReferences = await this.resolveFinancialReferences({
      ...dailySale,
      ...updateDailySaleDto,
      branchId,
      salesDate,
    });
    await this.ensureBranchDateIsAvailable(branchId, salesDate, id);

    Object.assign(dailySale, updateDailySaleDto, financialReferences);
    dailySale.netSalesAmount = this.calculateNetSales(dailySale);

    return this.dataSource.transaction(async (manager) => {
      const savedDailySale = await manager.getRepository(DailySaleEntity).save(dailySale);
      await this.recreateFinancialMovement(savedDailySale, manager, {
        vaultId: updateDailySaleDto.vaultTransferVaultId,
        amount: updateDailySaleDto.vaultTransferAmount,
        notes: updateDailySaleDto.vaultTransferNotes,
      });
      return savedDailySale;
    });
  }

  async remove(id: string) {
    const dailySale = await this.findByIdOrFail(id);
    await this.dataSource.transaction(async (manager) => {
      await this.deleteFinancialMovement(dailySale.id, manager);
      await manager.getRepository(DailySaleEntity).remove(dailySale);
    });

    return { id };
  }

  private async resolveFinancialReferences(data: {
    branchId: string;
    cashSalesAmount?: number;
    drawerId?: string | null;
    bankSalesAmount?: number;
    bankAccountId?: string | null;
    salesDate?: string;
  }) {
    let drawerId = data.drawerId ?? null;
    let bankAccountId = data.bankAccountId ?? null;

    if (Number(data.cashSalesAmount ?? 0) > 0) {
      if (!drawerId) {
        const branchDrawer = await this.drawerRepository.findOne({ where: { branchId: data.branchId } });
        drawerId = branchDrawer?.id ?? null;
      }

      if (!drawerId) {
        throw new BadRequestException('Cash daily sales require a drawer for the selected branch.');
      }

      const drawer = await this.drawerRepository.findOne({ where: { id: drawerId } });

      if (!drawer) {
        throw new NotFoundException('Drawer was not found.');
      }

      if (drawer.branchId !== data.branchId) {
        throw new BadRequestException('Drawer branch must match the sales branch.');
      }
    }

    if (Number(data.bankSalesAmount ?? 0) > 0 && bankAccountId) {
      const bankAccount = await this.bankAccountRepository.findOne({ where: { id: bankAccountId } });

      if (!bankAccount) {
        throw new NotFoundException('Bank account was not found.');
      }
    }

    if (Number(data.cashSalesAmount ?? 0) <= 0) {
      drawerId = null;
    }

    if (Number(data.bankSalesAmount ?? 0) <= 0) {
      bankAccountId = null;
    }

    return { drawerId, bankAccountId };
  }

  private async recreateFinancialMovement(
    dailySale: DailySaleEntity,
    manager = this.dataSource.manager,
    vaultTransfer?: { vaultId?: string | null; amount?: number; notes?: string | null },
  ) {
    await this.deleteFinancialMovement(dailySale.id, manager);

    if (dailySale.cashSalesAmount > 0 && dailySale.drawerId) {
      await manager.getRepository(DrawerTransactionEntity).save({
        drawerId: dailySale.drawerId,
        branchId: dailySale.branchId,
        transactionDate: dailySale.salesDate,
        transactionType: DrawerTransactionType.DailyCashSales,
        direction: DrawerTransactionDirection.In,
        amount: dailySale.cashSalesAmount,
        sourceType: 'daily_sale',
        sourceId: dailySale.id,
        description: `مبيعات نقدية ${dailySale.salesDate}`,
        notes: dailySale.notes,
      });
    }

    if (dailySale.bankSalesAmount > 0 && dailySale.bankAccountId) {
      await manager.getRepository(BankAccountTransactionEntity).save({
        bankAccountId: dailySale.bankAccountId,
        transactionDate: dailySale.salesDate,
        transactionType: BankAccountTransactionType.SalesReceiptBank,
        direction: BankAccountTransactionDirection.Incoming,
        amount: dailySale.bankSalesAmount,
        branchId: dailySale.branchId,
        sourceType: 'daily_sale',
        sourceId: dailySale.id,
        referenceNumber: null,
        description: `مبيعات بنكية ${dailySale.salesDate}`,
        notes: dailySale.notes,
      });
    }

    const transferAmount = this.roundMoney(Number(vaultTransfer?.amount ?? 0));
    if (transferAmount > 0) {
      if (!dailySale.drawerId) {
        throw new BadRequestException('لا يمكن التحويل إلى الخزنة بدون درج نقدي مرتبط بالمبيعات اليومية.');
      }
      if (!vaultTransfer?.vaultId) {
        throw new BadRequestException('اختر الخزنة قبل تسجيل تحويل النقد من المبيعات اليومية.');
      }

      const [drawer, vault] = await Promise.all([
        manager.getRepository(DrawerEntity).findOne({ where: { id: dailySale.drawerId } }),
        manager.getRepository(VaultEntity).findOne({ where: { id: vaultTransfer.vaultId } }),
      ]);

      if (!drawer) throw new NotFoundException('Drawer was not found.');
      if (!vault) throw new NotFoundException('Vault was not found.');

      await this.ensureTransferWithinAvailableDailyCash(dailySale.drawerId, dailySale.salesDate, transferAmount, manager);

      const description = `تحويل نقد مبيعات ${dailySale.salesDate} من الدرج إلى الخزنة`;
      await manager.getRepository(DrawerTransactionEntity).save({
        drawerId: dailySale.drawerId,
        branchId: dailySale.branchId,
        transactionDate: dailySale.salesDate,
        transactionType: DrawerTransactionType.TransferToVault,
        direction: DrawerTransactionDirection.Out,
        amount: transferAmount,
        sourceType: 'daily_sale_vault_transfer',
        sourceId: dailySale.id,
        description,
        notes: vaultTransfer.notes ?? dailySale.notes,
      });
      await manager.getRepository(VaultTransactionEntity).save({
        vaultId: vault.id,
        transactionDate: dailySale.salesDate,
        transactionType: VaultTransactionType.DepositFromDrawer,
        direction: VaultTransactionDirection.In,
        amount: transferAmount,
        branchId: dailySale.branchId,
        drawerId: dailySale.drawerId,
        sourceType: 'daily_sale_vault_transfer',
        sourceId: dailySale.id,
        referenceNumber: dailySale.id,
        description,
        notes: vaultTransfer.notes ?? dailySale.notes,
      });
    }
  }

  private async deleteFinancialMovement(dailySaleId: string, manager = this.dataSource.manager) {
    await Promise.all([
      manager.getRepository(DrawerTransactionEntity).delete({ sourceType: 'daily_sale', sourceId: dailySaleId }),
      manager
        .getRepository(DrawerTransactionEntity)
        .delete({ sourceType: 'daily_sale_vault_transfer', sourceId: dailySaleId }),
      manager.getRepository(BankAccountTransactionEntity).delete({ sourceType: 'daily_sale', sourceId: dailySaleId }),
      manager
        .getRepository(VaultTransactionEntity)
        .delete({ sourceType: 'daily_sale_vault_transfer', sourceId: dailySaleId }),
    ]);
  }

  private async ensureTransferWithinAvailableDailyCash(
    drawerId: string,
    transactionDate: string,
    requestedTransfer: number,
    manager = this.dataSource.manager,
  ) {
    const rows = await manager.getRepository(DrawerTransactionEntity).find({ where: { drawerId, transactionDate } });
    const inflows = rows
      .filter((row) => row.direction === DrawerTransactionDirection.In)
      .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const outflows = rows
      .filter((row) => row.direction === DrawerTransactionDirection.Out)
      .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const available = this.roundMoney(inflows - outflows);

    if (requestedTransfer > available) {
      throw new BadRequestException(
        `لا يمكن تحويل مبلغ أكبر من صافي النقد المتاح في الدرج لهذا اليوم. المتاح للتحويل: ${available}.`,
      );
    }
  }

  private async ensureBranchExists(id: string) {
    const branch = await this.branchRepository.findOne({ where: { id } });

    if (!branch) {
      throw new NotFoundException('Branch was not found.');
    }
  }

  private async ensureBranchDateIsAvailable(branchId: string, salesDate: string, currentId?: string) {
    const existingDailySale = await this.dailySaleRepository.findOne({ where: { branchId, salesDate } });

    if (existingDailySale && existingDailySale.id !== currentId) {
      throw new ConflictException('Daily sales already exist for this branch and date.');
    }
  }

  private calculateNetSales(data: {
    cashSalesAmount?: number;
    bankSalesAmount?: number;
    deliverySalesAmount?: number;
    websiteSalesAmount?: number;
    tipsAmount?: number;
    salesReturnAmount?: number;
  }) {
    const netSales =
      Number(data.cashSalesAmount ?? 0) +
      Number(data.bankSalesAmount ?? 0) +
      Number(data.deliverySalesAmount ?? 0) +
      Number(data.websiteSalesAmount ?? 0) +
      Number(data.tipsAmount ?? 0) -
      Number(data.salesReturnAmount ?? 0);

    return Math.round((netSales + Number.EPSILON) * 100) / 100;
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
