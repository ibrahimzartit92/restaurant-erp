import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Not, Repository } from 'typeorm';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { BankAccountEntity } from './entities/bank-account.entity';

@Injectable()
export class BankAccountsService {
  constructor(
    @InjectRepository(BankAccountEntity)
    private readonly bankAccountRepository: Repository<BankAccountEntity>,
  ) {}

  findAll(search?: string) {
    const normalizedSearch = search?.trim();

    return this.bankAccountRepository.find({
      where: normalizedSearch
        ? [
            { accountName: ILike(`%${normalizedSearch}%`) },
            { code: ILike(`%${normalizedSearch}%`) },
            { bankName: ILike(`%${normalizedSearch}%`) },
          ]
        : undefined,
      order: { accountName: 'ASC' },
    });
  }

  async findByIdOrFail(id: string) {
    const bankAccount = await this.bankAccountRepository.findOne({ where: { id } });

    if (!bankAccount) {
      throw new NotFoundException('Bank account was not found.');
    }

    return bankAccount;
  }

  async create(createBankAccountDto: CreateBankAccountDto) {
    const code = createBankAccountDto.code.toUpperCase();
    await this.ensureCodeIsAvailable(code);

    const bankAccount = this.bankAccountRepository.create({
      ...createBankAccountDto,
      code,
      bankName: createBankAccountDto.bankName ?? null,
      isActive: createBankAccountDto.isActive ?? true,
    });

    return this.bankAccountRepository.save(bankAccount);
  }

  async update(id: string, updateBankAccountDto: UpdateBankAccountDto) {
    const bankAccount = await this.findByIdOrFail(id);
    const code = updateBankAccountDto.code?.toUpperCase();

    if (code) {
      await this.ensureCodeIsAvailable(code, id);
    }

    Object.assign(bankAccount, { ...updateBankAccountDto, code: code ?? bankAccount.code });

    return this.bankAccountRepository.save(bankAccount);
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
}
