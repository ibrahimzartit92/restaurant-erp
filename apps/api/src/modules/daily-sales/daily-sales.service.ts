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

    return dailySale;
  }

  async create(createDailySaleDto: CreateDailySaleDto) {
    await this.ensureBranchExists(createDailySaleDto.branchId);
    await this.validateFinancialReferences(createDailySaleDto);
    await this.ensureBranchDateIsAvailable(createDailySaleDto.branchId, createDailySaleDto.salesDate);

    const dailySale = this.dailySaleRepository.create({
      ...createDailySaleDto,
      cashSalesAmount: createDailySaleDto.cashSalesAmount ?? 0,
      drawerId: createDailySaleDto.drawerId ?? null,
      bankSalesAmount: createDailySaleDto.bankSalesAmount ?? 0,
      bankAccountId: createDailySaleDto.bankAccountId ?? null,
      deliverySalesAmount: createDailySaleDto.deliverySalesAmount ?? 0,
      websiteSalesAmount: createDailySaleDto.websiteSalesAmount ?? 0,
      tipsAmount: createDailySaleDto.tipsAmount ?? 0,
      salesReturnAmount: createDailySaleDto.salesReturnAmount ?? 0,
      netSalesAmount: this.calculateNetSales(createDailySaleDto),
      notes: createDailySaleDto.notes ?? null,
    });

    return this.dataSource.transaction(async (manager) => {
      const savedDailySale = await manager.getRepository(DailySaleEntity).save(dailySale);
      await this.recreateFinancialMovement(savedDailySale, manager);
      return savedDailySale;
    });
  }

  async update(id: string, updateDailySaleDto: UpdateDailySaleDto) {
    const dailySale = await this.findByIdOrFail(id);
    const branchId = updateDailySaleDto.branchId ?? dailySale.branchId;
    const salesDate = updateDailySaleDto.salesDate ?? dailySale.salesDate;

    await this.ensureBranchExists(branchId);
    await this.validateFinancialReferences({ ...dailySale, ...updateDailySaleDto, branchId, salesDate });
    await this.ensureBranchDateIsAvailable(branchId, salesDate, id);

    Object.assign(dailySale, updateDailySaleDto);
    dailySale.netSalesAmount = this.calculateNetSales(dailySale);

    return this.dataSource.transaction(async (manager) => {
      const savedDailySale = await manager.getRepository(DailySaleEntity).save(dailySale);
      await this.recreateFinancialMovement(savedDailySale, manager);
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

  private async validateFinancialReferences(data: {
    branchId: string;
    cashSalesAmount?: number;
    drawerId?: string | null;
    bankSalesAmount?: number;
    bankAccountId?: string | null;
    salesDate?: string;
  }) {
    if (Number(data.cashSalesAmount ?? 0) > 0) {
      if (!data.drawerId) {
        throw new BadRequestException('Cash daily sales require drawerId.');
      }

      const drawer = await this.drawerRepository.findOne({ where: { id: data.drawerId } });

      if (!drawer) {
        throw new NotFoundException('Drawer was not found.');
      }

      if (drawer.branchId !== data.branchId) {
        throw new BadRequestException('Drawer branch must match the sales branch.');
      }
    }

    if (Number(data.bankSalesAmount ?? 0) > 0) {
      if (!data.bankAccountId) {
        throw new BadRequestException('Bank daily sales require bankAccountId.');
      }

      const bankAccount = await this.bankAccountRepository.findOne({ where: { id: data.bankAccountId } });

      if (!bankAccount) {
        throw new NotFoundException('Bank account was not found.');
      }
    }
  }

  private async recreateFinancialMovement(dailySale: DailySaleEntity, manager = this.dataSource.manager) {
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
  }

  private async deleteFinancialMovement(dailySaleId: string, manager = this.dataSource.manager) {
    await Promise.all([
      manager.getRepository(DrawerTransactionEntity).delete({ sourceType: 'daily_sale', sourceId: dailySaleId }),
      manager.getRepository(BankAccountTransactionEntity).delete({ sourceType: 'daily_sale', sourceId: dailySaleId }),
    ]);
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
}
