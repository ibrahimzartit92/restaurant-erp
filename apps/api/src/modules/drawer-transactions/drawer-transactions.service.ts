import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BranchEntity } from '../branches/entities/branch.entity';
import { DrawerEntity } from '../drawers/entities/drawer.entity';
import { CreateDrawerTransactionDto } from './dto/create-drawer-transaction.dto';
import { UpdateDrawerTransactionDto } from './dto/update-drawer-transaction.dto';
import { DrawerTransactionDirection, DrawerTransactionEntity } from './entities/drawer-transaction.entity';

@Injectable()
export class DrawerTransactionsService {
  constructor(
    @InjectRepository(DrawerTransactionEntity)
    private readonly drawerTransactionRepository: Repository<DrawerTransactionEntity>,
    @InjectRepository(DrawerEntity)
    private readonly drawerRepository: Repository<DrawerEntity>,
    @InjectRepository(BranchEntity)
    private readonly branchRepository: Repository<BranchEntity>,
  ) {}

  findAll(filters: { drawerId?: string; branchId?: string; dateFrom?: string; dateTo?: string }) {
    const query = this.drawerTransactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.drawer', 'drawer')
      .leftJoinAndSelect('transaction.branch', 'branch')
      .orderBy('transaction.transactionDate', 'DESC')
      .addOrderBy('transaction.createdAt', 'DESC');

    if (filters.drawerId) {
      query.andWhere('transaction.drawer_id = :drawerId', { drawerId: filters.drawerId });
    }

    if (filters.branchId) {
      query.andWhere('transaction.branch_id = :branchId', { branchId: filters.branchId });
    }

    if (filters.dateFrom) {
      query.andWhere('transaction.transaction_date >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      query.andWhere('transaction.transaction_date <= :dateTo', { dateTo: filters.dateTo });
    }

    return query.getMany();
  }

  async findByIdOrFail(id: string) {
    const transaction = await this.drawerTransactionRepository.findOne({ where: { id } });

    if (!transaction) {
      throw new NotFoundException('Drawer transaction was not found.');
    }

    return transaction;
  }

  async create(createDrawerTransactionDto: CreateDrawerTransactionDto) {
    await this.validateReferences(createDrawerTransactionDto.drawerId, createDrawerTransactionDto.branchId);

    const transaction = this.drawerTransactionRepository.create({
      ...createDrawerTransactionDto,
      sourceType: createDrawerTransactionDto.sourceType ?? null,
      sourceId: createDrawerTransactionDto.sourceId ?? null,
      notes: createDrawerTransactionDto.notes ?? null,
    });

    return this.drawerTransactionRepository.save(transaction);
  }

  async update(id: string, updateDrawerTransactionDto: UpdateDrawerTransactionDto) {
    const transaction = await this.findByIdOrFail(id);
    const drawerId = updateDrawerTransactionDto.drawerId ?? transaction.drawerId;
    const branchId = updateDrawerTransactionDto.branchId ?? transaction.branchId;

    await this.validateReferences(drawerId, branchId);

    Object.assign(transaction, updateDrawerTransactionDto);

    return this.drawerTransactionRepository.save(transaction);
  }

  async remove(id: string) {
    const transaction = await this.findByIdOrFail(id);
    await this.drawerTransactionRepository.remove(transaction);

    return { id };
  }

  async calculateMovement(drawerId: string, transactionDate: string) {
    const transactions = await this.drawerTransactionRepository.find({
      where: { drawerId, transactionDate },
    });

    return transactions.reduce((sum, transaction) => {
      const signedAmount =
        transaction.direction === DrawerTransactionDirection.In ? transaction.amount : -transaction.amount;

      return sum + signedAmount;
    }, 0);
  }

  private async validateReferences(drawerId: string, branchId: string) {
    const [drawer, branch] = await Promise.all([
      this.drawerRepository.findOne({ where: { id: drawerId } }),
      this.branchRepository.findOne({ where: { id: branchId } }),
    ]);

    if (!drawer) {
      throw new NotFoundException('Drawer was not found.');
    }

    if (!branch) {
      throw new NotFoundException('Branch was not found.');
    }

    if (drawer.branchId !== branchId) {
      throw new BadRequestException('Drawer branch must match the transaction branch.');
    }
  }
}
