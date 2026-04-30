import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Not, Repository } from 'typeorm';
import {
  BankAccountTransactionDirection,
  BankAccountTransactionEntity,
  BankAccountTransactionType,
} from '../bank-account-transactions/entities/bank-account-transaction.entity';
import { BankAccountEntity } from '../bank-accounts/entities/bank-account.entity';
import {
  DrawerTransactionDirection,
  DrawerTransactionEntity,
  DrawerTransactionType,
} from '../drawer-transactions/entities/drawer-transaction.entity';
import { DrawerEntity } from '../drawers/entities/drawer.entity';
import { CreateVaultTransferDto, VaultTransferKind } from './dto/create-vault-transfer.dto';
import { CreateVaultDto } from './dto/create-vault.dto';
import { UpdateVaultDto } from './dto/update-vault.dto';
import {
  VaultTransactionDirection,
  VaultTransactionEntity,
  VaultTransactionType,
} from './entities/vault-transaction.entity';
import { VaultEntity } from './entities/vault.entity';

@Injectable()
export class VaultsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(VaultEntity)
    private readonly vaultRepository: Repository<VaultEntity>,
    @InjectRepository(VaultTransactionEntity)
    private readonly vaultTransactionRepository: Repository<VaultTransactionEntity>,
    @InjectRepository(DrawerEntity)
    private readonly drawerRepository: Repository<DrawerEntity>,
    @InjectRepository(BankAccountEntity)
    private readonly bankAccountRepository: Repository<BankAccountEntity>,
  ) {}

  async findAll(search?: string) {
    const normalizedSearch = search?.trim();
    const vaults = await this.vaultRepository.find({
      where: normalizedSearch ? [{ name: ILike(`%${normalizedSearch}%`) }, { code: ILike(`%${normalizedSearch}%`) }] : undefined,
      order: { name: 'ASC' },
    });

    return Promise.all(vaults.map((vault) => this.enrichVault(vault)));
  }

  async findByIdOrFail(id: string) {
    const vault = await this.vaultRepository.findOne({ where: { id } });
    if (!vault) throw new NotFoundException('Vault was not found.');
    return this.enrichVault(vault);
  }

  async findEntityByIdOrFail(id: string, manager = this.dataSource.manager) {
    const vault = await manager.getRepository(VaultEntity).findOne({ where: { id } });
    if (!vault) throw new NotFoundException('Vault was not found.');
    return vault;
  }

  async findDefaultEntity(manager = this.dataSource.manager) {
    const vault = await manager.getRepository(VaultEntity).findOne({
      where: { isActive: true },
      order: { code: 'ASC' },
    });

    if (!vault) {
      throw new NotFoundException('No active vault is available for financial reversal.');
    }

    return vault;
  }

  async findTransactions(filters: {
    vaultId?: string;
    transactionType?: VaultTransactionType;
    direction?: VaultTransactionDirection;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }) {
    const query = this.vaultTransactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.vault', 'vault')
      .leftJoinAndSelect('transaction.branch', 'branch')
      .leftJoinAndSelect('transaction.drawer', 'drawer')
      .leftJoinAndSelect('transaction.bankAccount', 'bankAccount')
      .orderBy('transaction.transaction_date', 'DESC')
      .addOrderBy('transaction.created_at', 'DESC');

    if (filters.vaultId) query.andWhere('transaction.vault_id = :vaultId', { vaultId: filters.vaultId });
    if (filters.transactionType) {
      query.andWhere('transaction.transaction_type = :transactionType', { transactionType: filters.transactionType });
    }
    if (filters.direction) query.andWhere('transaction.direction = :direction', { direction: filters.direction });
    if (filters.dateFrom) query.andWhere('transaction.transaction_date >= :dateFrom', { dateFrom: filters.dateFrom });
    if (filters.dateTo) query.andWhere('transaction.transaction_date <= :dateTo', { dateTo: filters.dateTo });
    if (filters.search?.trim()) {
      query.andWhere('(transaction.description ILIKE :search OR transaction.reference_number ILIKE :search)', {
        search: `%${filters.search.trim()}%`,
      });
    }

    return query.getMany();
  }

  async create(createDto: CreateVaultDto) {
    const code = createDto.code.toUpperCase();
    await this.ensureCodeIsAvailable(code);
    const vault = this.vaultRepository.create({
      code,
      name: createDto.name.trim(),
      openingBalance: Number(createDto.openingBalance ?? 0),
      openingBalanceDate: createDto.openingBalanceDate ?? null,
      isActive: createDto.isActive ?? true,
      notes: this.normalizeOptionalText(createDto.notes),
    });

    return this.enrichVault(await this.vaultRepository.save(vault));
  }

  async update(id: string, updateDto: UpdateVaultDto) {
    const vault = await this.vaultRepository.findOne({ where: { id } });
    if (!vault) throw new NotFoundException('Vault was not found.');
    const code = updateDto.code?.toUpperCase();
    if (code) await this.ensureCodeIsAvailable(code, id);

    Object.assign(vault, {
      code: code ?? vault.code,
      name: updateDto.name?.trim() ?? vault.name,
      openingBalance: updateDto.openingBalance !== undefined ? Number(updateDto.openingBalance) : vault.openingBalance,
      openingBalanceDate: updateDto.openingBalanceDate !== undefined ? updateDto.openingBalanceDate : vault.openingBalanceDate,
      isActive: updateDto.isActive ?? vault.isActive,
      notes: updateDto.notes !== undefined ? this.normalizeOptionalText(updateDto.notes) : vault.notes,
    });

    return this.enrichVault(await this.vaultRepository.save(vault));
  }

  async remove(id: string) {
    const vault = await this.vaultRepository.findOne({ where: { id } });
    if (!vault) throw new NotFoundException('Vault was not found.');
    try {
      await this.vaultRepository.remove(vault);
      return { id, deleted: true };
    } catch {
      vault.isActive = false;
      await this.vaultRepository.save(vault);
      return { id, deleted: false, deactivated: true };
    }
  }

  async createTransfer(vaultId: string, dto: CreateVaultTransferDto) {
    const amount = Number(dto.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('Amount must be greater than zero.');

    return this.dataSource.transaction(async (manager) => {
      const vault = await this.findEntityByIdOrFail(vaultId, manager);
      const description = this.describeTransfer(dto.transferKind, vault.name);
      const direction = this.resolveDirection(dto.transferKind);
      const transactionType = this.resolveTransactionType(dto.transferKind);

      if (dto.drawerId) {
        const drawer = await manager.getRepository(DrawerEntity).findOne({ where: { id: dto.drawerId } });
        if (!drawer) throw new NotFoundException('Drawer was not found.');
        await manager.getRepository(DrawerTransactionEntity).save({
          drawerId: drawer.id,
          branchId: dto.branchId ?? drawer.branchId,
          transactionDate: dto.transactionDate,
          transactionType: DrawerTransactionType.TransferToVault,
          direction: DrawerTransactionDirection.Out,
          amount,
          sourceType: 'vault_transfer',
          sourceId: vault.id,
          description,
          notes: dto.notes ?? null,
        });
      }

      if (dto.bankAccountId) {
        const bankAccount = await manager.getRepository(BankAccountEntity).findOne({ where: { id: dto.bankAccountId } });
        if (!bankAccount) throw new NotFoundException('Bank account was not found.');
        await manager.getRepository(BankAccountTransactionEntity).save({
          bankAccountId: bankAccount.id,
          transactionDate: dto.transactionDate,
          transactionType:
            dto.transferKind === VaultTransferKind.WithdrawalToBank
              ? BankAccountTransactionType.DepositFromVault
              : BankAccountTransactionType.WithdrawalToVault,
          direction:
            dto.transferKind === VaultTransferKind.WithdrawalToBank
              ? BankAccountTransactionDirection.Incoming
              : BankAccountTransactionDirection.Outgoing,
          amount,
          branchId: dto.branchId ?? null,
          sourceType: 'vault_transfer',
          sourceId: vault.id,
          referenceNumber: dto.referenceNumber ?? null,
          description,
          notes: dto.notes ?? null,
        });
      }

      const saved = await this.recordTransaction(
        {
          vaultId: vault.id,
          transactionDate: dto.transactionDate,
          transactionType,
          direction,
          amount,
          branchId: dto.branchId ?? null,
          drawerId: dto.drawerId ?? null,
          bankAccountId: dto.bankAccountId ?? null,
          sourceType: 'vault_transfer',
          sourceId: null,
          referenceNumber: dto.referenceNumber ?? null,
          description,
          notes: dto.notes ?? null,
        },
        manager,
      );

      return saved;
    });
  }

  async recordTransaction(
    data: {
      vaultId: string;
      transactionDate: string;
      transactionType: VaultTransactionType;
      direction: VaultTransactionDirection;
      amount: number;
      branchId?: string | null;
      drawerId?: string | null;
      bankAccountId?: string | null;
      sourceType?: string | null;
      sourceId?: string | null;
      referenceNumber?: string | null;
      description: string;
      notes?: string | null;
    },
    manager = this.dataSource.manager,
  ) {
    return manager.getRepository(VaultTransactionEntity).save({
      vaultId: data.vaultId,
      transactionDate: data.transactionDate,
      transactionType: data.transactionType,
      direction: data.direction,
      amount: Number(data.amount),
      branchId: data.branchId ?? null,
      drawerId: data.drawerId ?? null,
      bankAccountId: data.bankAccountId ?? null,
      sourceType: data.sourceType ?? null,
      sourceId: data.sourceId ?? null,
      referenceNumber: data.referenceNumber ?? null,
      description: data.description,
      notes: data.notes ?? null,
    });
  }

  async recordFinancialReturnToVault(
    data: {
      amount: number;
      vaultId?: string | null;
      transactionDate?: string | null;
      branchId?: string | null;
      sourceType: string;
      sourceId: string;
      referenceNumber?: string | null;
      description: string;
      notes?: string | null;
    },
    manager = this.dataSource.manager,
  ) {
    const vault = data.vaultId ? await this.findEntityByIdOrFail(data.vaultId, manager) : await this.findDefaultEntity(manager);

    return this.recordTransaction(
      {
        vaultId: vault.id,
        transactionDate: data.transactionDate ?? new Date().toISOString().slice(0, 10),
        transactionType: VaultTransactionType.FinancialReversal,
        direction: VaultTransactionDirection.In,
        amount: data.amount,
        branchId: data.branchId ?? null,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        referenceNumber: data.referenceNumber ?? null,
        description: data.description,
        notes: data.notes ?? null,
      },
      manager,
    );
  }

  async deleteFinancialMovement(sourceType: string, sourceId: string, manager = this.dataSource.manager) {
    await manager.getRepository(VaultTransactionEntity).delete({ sourceType, sourceId });
  }

  private async enrichVault(vault: VaultEntity) {
    const totals = await this.vaultTransactionRepository
      .createQueryBuilder('transaction')
      .select(
        `COALESCE(SUM(CASE WHEN transaction.direction = :incoming THEN transaction.amount ELSE 0 END), 0)`,
        'inflows',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN transaction.direction = :outgoing THEN transaction.amount ELSE 0 END), 0)`,
        'outflows',
      )
      .where('transaction.vault_id = :vaultId', { vaultId: vault.id })
      .setParameters({ incoming: VaultTransactionDirection.In, outgoing: VaultTransactionDirection.Out })
      .getRawOne<{ inflows: string; outflows: string }>();
    const inflows = Number(totals?.inflows ?? 0);
    const outflows = Number(totals?.outflows ?? 0);

    return {
      ...vault,
      currentBalance: Number(vault.openingBalance ?? 0) + inflows - outflows,
      transactionTotals: { inflows, outflows },
    };
  }

  private resolveDirection(kind: VaultTransferKind) {
    return [
      VaultTransferKind.WithdrawalToBank,
      VaultTransferKind.PayrollPayment,
      VaultTransferKind.AdminWithdrawal,
      VaultTransferKind.ManualWithdrawal,
    ].includes(kind)
      ? VaultTransactionDirection.Out
      : VaultTransactionDirection.In;
  }

  private resolveTransactionType(kind: VaultTransferKind) {
    return kind as unknown as VaultTransactionType;
  }

  private describeTransfer(kind: VaultTransferKind, vaultName: string) {
    const labels: Record<VaultTransferKind, string> = {
      [VaultTransferKind.DepositFromDrawer]: `تحويل من الدرج إلى الخزنة ${vaultName}`,
      [VaultTransferKind.DepositFromBank]: `سحب من البنك إلى الخزنة ${vaultName}`,
      [VaultTransferKind.ManualDeposit]: `إيداع يدوي في الخزنة ${vaultName}`,
      [VaultTransferKind.WithdrawalToBank]: `تحويل من الخزنة ${vaultName} إلى البنك`,
      [VaultTransferKind.PayrollPayment]: `دفع رواتب من الخزنة ${vaultName}`,
      [VaultTransferKind.AdminWithdrawal]: `سحب إداري من الخزنة ${vaultName}`,
      [VaultTransferKind.ManualWithdrawal]: `سحب يدوي من الخزنة ${vaultName}`,
      [VaultTransferKind.Settlement]: `تسوية الخزنة ${vaultName}`,
    };
    return labels[kind];
  }

  private async ensureCodeIsAvailable(code: string, currentId?: string) {
    const existingVault = await this.vaultRepository.findOne({
      where: { code, ...(currentId ? { id: Not(currentId) } : {}) },
    });
    if (existingVault) throw new ConflictException('A vault with this code already exists.');
  }

  private normalizeOptionalText(value?: string | null) {
    const normalizedValue = value?.trim();
    return normalizedValue ? normalizedValue : null;
  }
}
