import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Not, Repository } from 'typeorm';
import {
  BankAccountTransactionDirection,
  BankAccountTransactionEntity,
  BankAccountTransactionType,
} from '../bank-account-transactions/entities/bank-account-transaction.entity';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { BankAccountEntity } from './entities/bank-account.entity';

@Injectable()
export class BankAccountsService {
  constructor(
    @InjectRepository(BankAccountEntity)
    private readonly bankAccountRepository: Repository<BankAccountEntity>,
    @InjectRepository(BankAccountTransactionEntity)
    private readonly transactionRepository: Repository<BankAccountTransactionEntity>,
  ) {}

  async findAll(search?: string) {
    const normalizedSearch = search?.trim();
    const bankAccounts = await this.bankAccountRepository.find({
      where: normalizedSearch
        ? [
            { name: ILike(`%${normalizedSearch}%`) },
            { code: ILike(`%${normalizedSearch}%`) },
            { bankName: ILike(`%${normalizedSearch}%`) },
          ]
        : undefined,
      order: { name: 'ASC' },
    });

    return Promise.all(bankAccounts.map((bankAccount) => this.enrichBankAccount(bankAccount)));
  }

  findEntityByIdOrFail(id: string) {
    return this.bankAccountRepository.findOne({ where: { id } }).then((bankAccount) => {
      if (!bankAccount) {
        throw new NotFoundException('Bank account was not found.');
      }

      return bankAccount;
    });
  }

  async findByIdOrFail(id: string) {
    const bankAccount = await this.findEntityByIdOrFail(id);
    return this.enrichBankAccount(bankAccount);
  }

  async create(createBankAccountDto: CreateBankAccountDto) {
    const code = createBankAccountDto.code.toUpperCase();
    await this.ensureCodeIsAvailable(code);

    const bankAccount = this.bankAccountRepository.create({
      code,
      name: createBankAccountDto.name.trim(),
      bankName: createBankAccountDto.bankName.trim(),
      iban: this.normalizeOptionalText(createBankAccountDto.iban),
      accountNumber: this.normalizeOptionalText(createBankAccountDto.accountNumber),
      currency: createBankAccountDto.currency.trim().toUpperCase(),
      isActive: createBankAccountDto.isActive ?? true,
      notes: this.normalizeOptionalText(createBankAccountDto.notes),
    });

    const savedBankAccount = await this.bankAccountRepository.save(bankAccount);
    return this.enrichBankAccount(savedBankAccount);
  }

  async update(id: string, updateBankAccountDto: UpdateBankAccountDto) {
    const bankAccount = await this.findEntityByIdOrFail(id);
    const code = updateBankAccountDto.code?.toUpperCase();

    if (code) {
      await this.ensureCodeIsAvailable(code, id);
    }

    Object.assign(bankAccount, {
      code: code ?? bankAccount.code,
      name: updateBankAccountDto.name?.trim() ?? bankAccount.name,
      bankName: updateBankAccountDto.bankName?.trim() ?? bankAccount.bankName,
      iban: updateBankAccountDto.iban !== undefined ? this.normalizeOptionalText(updateBankAccountDto.iban) : bankAccount.iban,
      accountNumber:
        updateBankAccountDto.accountNumber !== undefined
          ? this.normalizeOptionalText(updateBankAccountDto.accountNumber)
          : bankAccount.accountNumber,
      currency: updateBankAccountDto.currency?.trim().toUpperCase() ?? bankAccount.currency,
      isActive: updateBankAccountDto.isActive ?? bankAccount.isActive,
      notes: updateBankAccountDto.notes !== undefined ? this.normalizeOptionalText(updateBankAccountDto.notes) : bankAccount.notes,
    });

    const savedBankAccount = await this.bankAccountRepository.save(bankAccount);
    return this.enrichBankAccount(savedBankAccount);
  }

  async remove(id: string) {
    const bankAccount = await this.findByIdOrFail(id);
    await this.bankAccountRepository.remove(bankAccount);

    return { id };
  }

  private async ensureCodeIsAvailable(code: string, currentId?: string) {
    const existingBankAccount = await this.bankAccountRepository.findOne({
      where: { code, ...(currentId ? { id: Not(currentId) } : {}) },
    });

    if (existingBankAccount) {
      throw new ConflictException('A bank account with this code already exists.');
    }
  }

  private async enrichBankAccount(bankAccount: BankAccountEntity) {
    const transactionTotals = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select(
        `COALESCE(SUM(CASE WHEN transaction.direction = :incoming THEN transaction.amount ELSE 0 END), 0)`,
        'deposits',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN transaction.direction = :outgoing THEN transaction.amount ELSE 0 END), 0)`,
        'withdrawals',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN transaction.transaction_type = :transfer THEN transaction.amount ELSE 0 END), 0)`,
        'transfers',
      )
      .where('transaction.bank_account_id = :bankAccountId', { bankAccountId: bankAccount.id })
      .setParameters({
        incoming: BankAccountTransactionDirection.Incoming,
        outgoing: BankAccountTransactionDirection.Outgoing,
        transfer: BankAccountTransactionType.Transfer,
      })
      .getRawOne<{ deposits: string; withdrawals: string; transfers: string }>();

    const deposits = Number(transactionTotals?.deposits ?? 0);
    const withdrawals = Number(transactionTotals?.withdrawals ?? 0);
    const transfers = Number(transactionTotals?.transfers ?? 0);

    return {
      ...bankAccount,
      currentBalance: deposits - withdrawals,
      transactionTotals: {
        deposits,
        withdrawals,
        transfers,
      },
    };
  }

  private normalizeOptionalText(value?: string | null) {
    const normalizedValue = value?.trim();
    return normalizedValue ? normalizedValue : null;
  }
}
