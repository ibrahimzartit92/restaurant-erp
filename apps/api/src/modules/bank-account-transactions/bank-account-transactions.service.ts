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
import { TransactionExportService, TransactionExportFormat } from '../shared/transaction-export.service';

@Injectable()
export class BankAccountTransactionsService {
  constructor(
    @InjectRepository(BankAccountTransactionEntity)
    private readonly transactionRepository: Repository<BankAccountTransactionEntity>,
    private readonly bankAccountsService: BankAccountsService,
    private readonly branchesService: BranchesService,
    private readonly transactionExportService: TransactionExportService,
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

  async exportAll(
    filters: {
      search?: string;
      bankAccountId?: string;
      branchId?: string;
      transactionType?: BankAccountTransactionType;
      direction?: BankAccountTransactionDirection;
      dateFrom?: string;
      dateTo?: string;
    },
    format: TransactionExportFormat,
  ) {
    const rows = await this.findAll(filters);
    return this.transactionExportService.exportTransactions({
      key: 'bank-transactions',
      title: 'تصدير حركات البنك',
      description: 'الحركات البنكية الداخلة والخارجة حسب الفلاتر المحددة.',
      format,
      filterSummary: this.filterSummary(filters),
      rows: rows.map((transaction) => ({
        date: transaction.transactionDate,
        account: transaction.bankAccount?.name ?? 'غير محدد',
        type: transaction.transactionType,
        reference: transaction.referenceNumber ?? '',
        description: transaction.description,
        source: transaction.branch?.name ?? 'بدون فرع',
        incomingAmount: transaction.direction === BankAccountTransactionDirection.Incoming ? Number(transaction.amount) : 0,
        outgoingAmount: transaction.direction === BankAccountTransactionDirection.Outgoing ? Number(transaction.amount) : 0,
      })),
    });
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

  private filterSummary(filters: {
    search?: string;
    bankAccountId?: string;
    branchId?: string;
    transactionType?: BankAccountTransactionType;
    direction?: BankAccountTransactionDirection;
    dateFrom?: string;
    dateTo?: string;
  }) {
    return [
      { label: 'الحساب البنكي', value: filters.bankAccountId ?? 'كل الحسابات' },
      { label: 'الفرع', value: filters.branchId ?? 'كل الفروع' },
      { label: 'نوع الحركة', value: filters.transactionType ?? 'كل الأنواع' },
      { label: 'الاتجاه', value: filters.direction ?? 'الكل' },
      { label: 'من تاريخ', value: filters.dateFrom ?? 'غير محدد' },
      { label: 'إلى تاريخ', value: filters.dateTo ?? 'غير محدد' },
      ...(filters.search ? [{ label: 'بحث', value: filters.search }] : []),
      { label: 'تاريخ التصدير', value: new Date().toLocaleString('ar') },
    ];
  }
}
