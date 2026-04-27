import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccountsService } from '../bank-accounts/bank-accounts.service';
import { BranchesService } from '../branches/branches.service';
import { CreateBankAccountTransactionDto } from './dto/create-bank-account-transaction.dto';
import {
  BankAccountTransactionDirection,
  BankAccountTransactionEntity,
  BankAccountTransactionType,
} from './entities/bank-account-transaction.entity';

@Injectable()
export class BankAccountTransactionsService {
  constructor(
    @InjectRepository(BankAccountTransactionEntity)
    private readonly transactionRepository: Repository<BankAccountTransactionEntity>,
    private readonly bankAccountsService: BankAccountsService,
    private readonly branchesService: BranchesService,
  ) {}

  async findAll(filters: {
    search?: string;
    bankAccountId?: string;
    branchId?: string;
    transactionType?: BankAccountTransactionType;
    direction?: BankAccountTransactionDirection;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const query = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.bankAccount', 'bankAccount')
      .leftJoinAndSelect('transaction.branch', 'branch')
      .orderBy('transaction.transaction_date', 'DESC')
      .addOrderBy('transaction.created_at', 'DESC');

    if (filters.search?.trim()) {
      query.andWhere(
        '(transaction.description ILIKE :search OR transaction.reference_number ILIKE :search OR bankAccount.account_name ILIKE :search)',
        { search: `%${filters.search.trim()}%` },
      );
    }

    if (filters.bankAccountId) {
      query.andWhere('transaction.bank_account_id = :bankAccountId', { bankAccountId: filters.bankAccountId });
    }

    if (filters.branchId) {
      query.andWhere('transaction.branch_id = :branchId', { branchId: filters.branchId });
    }

    if (filters.transactionType) {
      query.andWhere('transaction.transaction_type = :transactionType', { transactionType: filters.transactionType });
    }

    if (filters.direction) {
      query.andWhere('transaction.direction = :direction', { direction: filters.direction });
    }

    if (filters.dateFrom) {
      query.andWhere('transaction.transaction_date >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      query.andWhere('transaction.transaction_date <= :dateTo', { dateTo: filters.dateTo });
    }

    return query.getMany();
  }

  async create(createDto: CreateBankAccountTransactionDto) {
    const bankAccount = await this.bankAccountsService.findEntityByIdOrFail(createDto.bankAccountId);

    let branchId: string | null = null;

    if (createDto.branchId) {
      const branch = await this.branchesService.findById(createDto.branchId);

      if (!branch) {
        throw new NotFoundException('The selected branch was not found.');
      }

      branchId = branch.id;
    }

    const transaction = this.transactionRepository.create({
      bankAccountId: bankAccount.id,
      transactionDate: createDto.transactionDate,
      transactionType: createDto.transactionType,
      direction: createDto.direction,
      amount: Number(createDto.amount),
      branchId,
      sourceType: this.normalizeOptionalText(createDto.sourceType),
      sourceId: createDto.sourceId ?? null,
      referenceNumber: this.normalizeOptionalText(createDto.referenceNumber),
      description: createDto.description.trim(),
      notes: this.normalizeOptionalText(createDto.notes),
    });

    return this.transactionRepository.save(transaction);
  }

  private normalizeOptionalText(value?: string | null) {
    const normalizedValue = value?.trim();
    return normalizedValue ? normalizedValue : null;
  }
}
