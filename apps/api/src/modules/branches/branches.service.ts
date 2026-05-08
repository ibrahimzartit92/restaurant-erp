import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { BankAccountTransactionEntity } from '../bank-account-transactions/entities/bank-account-transaction.entity';
import { BankAccountEntity } from '../bank-accounts/entities/bank-account.entity';
import { DailySaleEntity } from '../daily-sales/entities/daily-sale.entity';
import { DrawerDailySessionEntity } from '../drawer-daily-sessions/entities/drawer-daily-session.entity';
import { DrawerTransactionEntity } from '../drawer-transactions/entities/drawer-transaction.entity';
import { DrawerEntity } from '../drawers/entities/drawer.entity';
import { EmployeeEntity } from '../employees/entities/employee.entity';
import { ExpenseEntity } from '../expenses/entities/expense.entity';
import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';
import { VaultEntity } from '../vaults/entities/vault.entity';
import { WarehouseEntity } from '../warehouses/entities/warehouse.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { BranchEntity } from './entities/branch.entity';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(BranchEntity)
    private readonly branchRepository: Repository<BranchEntity>,
    @InjectRepository(DrawerEntity)
    private readonly drawerRepository: Repository<DrawerEntity>,
    @InjectRepository(BankAccountEntity)
    private readonly bankAccountRepository: Repository<BankAccountEntity>,
    @InjectRepository(VaultEntity)
    private readonly vaultRepository: Repository<VaultEntity>,
    @InjectRepository(WarehouseEntity)
    private readonly warehouseRepository: Repository<WarehouseEntity>,
    @InjectRepository(EmployeeEntity)
    private readonly employeeRepository: Repository<EmployeeEntity>,
    @InjectRepository(DailySaleEntity)
    private readonly dailySaleRepository: Repository<DailySaleEntity>,
    @InjectRepository(ExpenseEntity)
    private readonly expenseRepository: Repository<ExpenseEntity>,
    @InjectRepository(PurchaseInvoiceEntity)
    private readonly purchaseInvoiceRepository: Repository<PurchaseInvoiceEntity>,
    @InjectRepository(DrawerDailySessionEntity)
    private readonly drawerSessionRepository: Repository<DrawerDailySessionEntity>,
    @InjectRepository(DrawerTransactionEntity)
    private readonly drawerTransactionRepository: Repository<DrawerTransactionEntity>,
    @InjectRepository(BankAccountTransactionEntity)
    private readonly bankTransactionRepository: Repository<BankAccountTransactionEntity>,
  ) {}

  findAll() {
    return this.branchRepository.find({
      order: { name: 'ASC' },
    });
  }

  findById(id: string) {
    return this.branchRepository.findOne({ where: { id } });
  }

  async findByIdOrFail(id: string) {
    const branch = await this.findById(id);
    if (!branch) throw new NotFoundException('Branch was not found.');
    return branch;
  }

  findByCode(code: string) {
    return this.branchRepository.findOne({ where: { code: code.toUpperCase() } });
  }

  async create(createBranchDto: CreateBranchDto) {
    const code = createBranchDto.code?.trim().toUpperCase() || (await this.generateBranchCode(createBranchDto.name));
    const existingBranch = await this.findByCode(code);

    if (existingBranch) {
      throw new ConflictException('A branch with this code already exists.');
    }

    const branch = this.branchRepository.create({
      ...createBranchDto,
      code,
      isActive: createBranchDto.isActive ?? true,
    });

    return this.branchRepository.save(branch);
  }

  async update(id: string, updateBranchDto: UpdateBranchDto) {
    const branch = await this.findByIdOrFail(id);
    const code = updateBranchDto.code?.trim().toUpperCase();

    if (code) {
      const existingBranch = await this.branchRepository.findOne({ where: { code, id: Not(id) } });
      if (existingBranch) throw new ConflictException('A branch with this code already exists.');
    }

    Object.assign(branch, {
      ...updateBranchDto,
      code: code ?? branch.code,
      name: updateBranchDto.name ?? branch.name,
      isActive: updateBranchDto.isActive ?? branch.isActive,
    });

    return this.branchRepository.save(branch);
  }

  async remove(id: string) {
    const branch = await this.findByIdOrFail(id);
    const linkedRecords = await this.countLinkedRecords(id);

    if (linkedRecords > 0) {
      branch.isActive = false;
      await this.branchRepository.save(branch);
      return {
        id,
        deleted: false,
        deactivated: true,
        linkedRecords,
        message: 'تم تعطيل الفرع بدلا من حذفه لأنه مرتبط بسجلات تشغيلية أو مالية سابقة.',
      };
    }

    await this.branchRepository.remove(branch);
    return { id, deleted: true, deactivated: false, linkedRecords };
  }

  private async generateBranchCode(name: string) {
    const baseCode =
      name
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\p{L}\p{N}-]/gu, '')
        .slice(0, 20)
        .toUpperCase() || 'BRANCH';
    let code = baseCode;
    let index = 1;

    while (await this.findByCode(code)) {
      index += 1;
      code = `${baseCode}-${index}`;
    }

    return code;
  }

  private async countLinkedRecords(branchId: string) {
    const counts = await Promise.all([
      this.drawerRepository.count({ where: { branchId } }),
      this.bankAccountRepository.count({ where: { branchId } }),
      this.vaultRepository.count({ where: { branchId } }),
      this.employeeRepository.count({ where: { defaultBranchId: branchId } }),
      this.dailySaleRepository.count({ where: { branchId } }),
      this.expenseRepository.count({ where: { branchId } }),
      this.purchaseInvoiceRepository.count({ where: { branchId } }),
      this.drawerSessionRepository.count({ where: { branchId } }),
      this.drawerTransactionRepository.count({ where: { branchId } }),
      this.bankTransactionRepository.count({ where: { branchId } }),
    ]);

    return counts.reduce((sum, count) => sum + count, 0);
  }
}
