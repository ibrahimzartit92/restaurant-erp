import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BranchEntity } from '../branches/entities/branch.entity';
import { CreateDailySaleDto } from './dto/create-daily-sale.dto';
import { UpdateDailySaleDto } from './dto/update-daily-sale.dto';
import { DailySaleEntity } from './entities/daily-sale.entity';

@Injectable()
export class DailySalesService {
  constructor(
    @InjectRepository(DailySaleEntity)
    private readonly dailySaleRepository: Repository<DailySaleEntity>,
    @InjectRepository(BranchEntity)
    private readonly branchRepository: Repository<BranchEntity>,
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
    await this.ensureBranchDateIsAvailable(createDailySaleDto.branchId, createDailySaleDto.salesDate);

    const dailySale = this.dailySaleRepository.create({
      ...createDailySaleDto,
      tipsAmount: createDailySaleDto.tipsAmount ?? 0,
      salesReturnAmount: createDailySaleDto.salesReturnAmount ?? 0,
      netSalesAmount: this.calculateNetSales(createDailySaleDto),
      notes: createDailySaleDto.notes ?? null,
    });

    return this.dailySaleRepository.save(dailySale);
  }

  async update(id: string, updateDailySaleDto: UpdateDailySaleDto) {
    const dailySale = await this.findByIdOrFail(id);
    const branchId = updateDailySaleDto.branchId ?? dailySale.branchId;
    const salesDate = updateDailySaleDto.salesDate ?? dailySale.salesDate;

    await this.ensureBranchExists(branchId);
    await this.ensureBranchDateIsAvailable(branchId, salesDate, id);

    Object.assign(dailySale, updateDailySaleDto);
    dailySale.netSalesAmount = this.calculateNetSales(dailySale);

    return this.dailySaleRepository.save(dailySale);
  }

  async remove(id: string) {
    const dailySale = await this.findByIdOrFail(id);
    await this.dailySaleRepository.remove(dailySale);

    return { id };
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
    cashSalesAmount: number;
    bankSalesAmount: number;
    deliverySalesAmount: number;
    websiteSalesAmount: number;
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
