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
import { FinancialPaymentMethod } from '../shared/payment-allocation.dto';
import { UndoActionEntity } from '../undo-actions/entities/undo-action.entity';
import { UndoActionsService } from '../undo-actions/undo-actions.service';
import {
  VaultTransactionDirection,
  VaultTransactionEntity,
  VaultTransactionType,
} from '../vaults/entities/vault-transaction.entity';
import { VaultsService } from '../vaults/vaults.service';
import { CreateSupplierPaymentBatchDto } from './dto/create-supplier-payment-batch.dto';
import { PurchaseInvoiceEntity, PurchaseInvoiceStatus } from '../purchase-invoices/entities/purchase-invoice.entity';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { UpdateSupplierPaymentDto } from './dto/update-supplier-payment.dto';
import { SupplierPaymentEntity, SupplierPaymentMethod } from './entities/supplier-payment.entity';

type SupplierPaymentFilters = {
  purchaseInvoiceId?: string;
  branchId?: string;
  supplierId?: string;
  paymentMethod?: SupplierPaymentMethod;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

@Injectable()
export class SupplierPaymentsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(SupplierPaymentEntity)
    private readonly supplierPaymentRepository: Repository<SupplierPaymentEntity>,
    @InjectRepository(PurchaseInvoiceEntity)
    private readonly purchaseInvoiceRepository: Repository<PurchaseInvoiceEntity>,
    @InjectRepository(BranchEntity)
    private readonly branchRepository: Repository<BranchEntity>,
    @InjectRepository(DrawerEntity)
    private readonly drawerRepository: Repository<DrawerEntity>,
    @InjectRepository(BankAccountEntity)
    private readonly bankAccountRepository: Repository<BankAccountEntity>,
    private readonly vaultsService: VaultsService,
    private readonly undoActionsService: UndoActionsService,
  ) {}

  findAll(filters: SupplierPaymentFilters = {}) {
    const query = this.supplierPaymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.branch', 'branch')
      .leftJoinAndSelect('payment.purchaseInvoice', 'invoice')
      .leftJoinAndSelect('invoice.supplier', 'supplier')
      .orderBy('payment.paymentDate', 'DESC')
      .addOrderBy('payment.paymentNumber', 'DESC');

    if (filters.purchaseInvoiceId) {
      query.andWhere('payment.purchase_invoice_id = :purchaseInvoiceId', {
        purchaseInvoiceId: filters.purchaseInvoiceId,
      });
    }

    if (filters.branchId) {
      query.andWhere('payment.branch_id = :branchId', { branchId: filters.branchId });
    }

    if (filters.supplierId) {
      query.andWhere('invoice.supplier_id = :supplierId', { supplierId: filters.supplierId });
    }

    if (filters.paymentMethod) {
      query.andWhere('payment.payment_method = :paymentMethod', { paymentMethod: filters.paymentMethod });
    }

    if (filters.dateFrom) {
      query.andWhere('payment.payment_date >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      query.andWhere('payment.payment_date <= :dateTo', { dateTo: filters.dateTo });
    }

    const search = filters.search?.trim();
    if (search) {
      query.andWhere(
        '(payment.payment_number ILIKE :search OR payment.reference_number ILIKE :search OR invoice.invoice_number ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    return query.getMany();
  }

  async findByIdOrFail(id: string) {
    const payment = await this.supplierPaymentRepository.findOne({ where: { id } });

    if (!payment) {
      throw new NotFoundException('Supplier payment was not found.');
    }

    return payment;
  }

  async create(createSupplierPaymentDto: CreateSupplierPaymentDto) {
    if (!createSupplierPaymentDto.purchaseInvoiceId) {
      throw new BadRequestException('Purchase invoice is required.');
    }

    const purchaseInvoiceId = createSupplierPaymentDto.purchaseInvoiceId;

    await this.ensureCodeIsAvailable(createSupplierPaymentDto.paymentNumber);
    const invoice = await this.validatePaymentReferences(createSupplierPaymentDto);
    const paymentNumber =
      createSupplierPaymentDto.paymentNumber?.toUpperCase() ?? (await this.generatePaymentNumber());

    if (createSupplierPaymentDto.amount > invoice.remainingAmount) {
      throw new BadRequestException('Payment amount cannot be greater than the invoice remaining amount.');
    }

    return this.dataSource.transaction(async (manager) => {
      const paymentRepository = manager.getRepository(SupplierPaymentEntity);
      const invoiceRepository = manager.getRepository(PurchaseInvoiceEntity);

      const payment = paymentRepository.create({
        paymentNumber,
        purchaseInvoiceId,
        branchId: createSupplierPaymentDto.branchId,
        paymentDate: createSupplierPaymentDto.paymentDate,
        paymentMethod: createSupplierPaymentDto.paymentMethod,
        drawerId: createSupplierPaymentDto.drawerId ?? null,
        bankAccountId: createSupplierPaymentDto.bankAccountId ?? null,
        vaultId: createSupplierPaymentDto.vaultId ?? null,
        amount: createSupplierPaymentDto.amount,
        referenceNumber: createSupplierPaymentDto.referenceNumber ?? null,
        notes: createSupplierPaymentDto.notes ?? null,
      });

      const savedPayment = await paymentRepository.save(payment);
      await this.recreateFinancialMovement(savedPayment, manager);
      await this.recalculateInvoicePaymentState(
        purchaseInvoiceId,
        invoiceRepository,
        paymentRepository,
      );

      return paymentRepository.findOneOrFail({ where: { id: savedPayment.id } });
    });
  }

  async createBatch(createSupplierPaymentBatchDto: CreateSupplierPaymentBatchDto) {
    const paymentRows = createSupplierPaymentBatchDto.payments ?? [];
    const invoice = await this.purchaseInvoiceRepository.findOne({
      where: { id: createSupplierPaymentBatchDto.purchaseInvoiceId },
    });
    if (!invoice) {
      throw new NotFoundException('Purchase invoice was not found.');
    }

    if (paymentRows.length === 0) {
      return [];
    }

    const total = paymentRows.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
    if (this.roundMoney(total) > invoice.remainingAmount) {
      throw new BadRequestException('Payment amount cannot be greater than the invoice remaining amount.');
    }

    const normalizedPayments = paymentRows.map((payment) => ({
      purchaseInvoiceId: createSupplierPaymentBatchDto.purchaseInvoiceId,
      branchId: createSupplierPaymentBatchDto.branchId,
      paymentDate: payment.paymentDate ?? createSupplierPaymentBatchDto.paymentDate,
      paymentMethod:
        payment.paymentMethod === FinancialPaymentMethod.Cash
          ? SupplierPaymentMethod.Cash
          : payment.paymentMethod === FinancialPaymentMethod.Bank
            ? SupplierPaymentMethod.Bank
            : SupplierPaymentMethod.Vault,
      drawerId: payment.drawerId ?? null,
      bankAccountId: payment.bankAccountId ?? null,
      vaultId: payment.vaultId ?? null,
      amount: payment.amount,
      referenceNumber: payment.referenceNumber ?? null,
      notes: payment.notes ?? createSupplierPaymentBatchDto.notes ?? null,
    }));

    for (const payment of normalizedPayments) {
      await this.validatePaymentReferences(payment);
    }

    return this.dataSource.transaction(async (manager) => {
      const paymentRepository = manager.getRepository(SupplierPaymentEntity);
      const invoiceRepository = manager.getRepository(PurchaseInvoiceEntity);
      const savedPayments: SupplierPaymentEntity[] = [];

      for (const payment of normalizedPayments) {
        const savedPayment = await paymentRepository.save(
          paymentRepository.create({
            ...payment,
            paymentNumber: await this.generatePaymentNumber(paymentRepository),
          }),
        );
        await this.recreateFinancialMovement(savedPayment, manager);
        savedPayments.push(savedPayment);
      }

      await this.recalculateInvoicePaymentState(
        createSupplierPaymentBatchDto.purchaseInvoiceId,
        invoiceRepository,
        paymentRepository,
      );

      return paymentRepository.find({
        where: savedPayments.map((payment) => ({ id: payment.id })),
        order: { paymentDate: 'DESC', paymentNumber: 'DESC' },
      });
    });
  }

  async update(id: string, updateSupplierPaymentDto: UpdateSupplierPaymentDto) {
    const payment = await this.findByIdOrFail(id);

    await this.ensureCodeIsAvailable(updateSupplierPaymentDto.paymentNumber, id);
    const invoice = await this.validatePaymentReferences({
      ...payment,
      ...updateSupplierPaymentDto,
      purchaseInvoiceId: payment.purchaseInvoiceId,
    });
    const newAmount = updateSupplierPaymentDto.amount ?? payment.amount;
    const otherPayments = await this.supplierPaymentRepository.find({
      where: { purchaseInvoiceId: payment.purchaseInvoiceId },
    });
    const paidByOtherPayments = otherPayments
      .filter((otherPayment) => otherPayment.id !== payment.id)
      .reduce((sum, otherPayment) => sum + otherPayment.amount, 0);

    if (paidByOtherPayments + newAmount > invoice.totalAmount) {
      throw new BadRequestException('Payment amount cannot make the invoice overpaid.');
    }

    Object.assign(payment, {
      ...updateSupplierPaymentDto,
      paymentNumber: updateSupplierPaymentDto.paymentNumber?.toUpperCase() ?? payment.paymentNumber,
    });

    const savedPayment = await this.dataSource.transaction(async (manager) => {
      const paymentRepository = manager.getRepository(SupplierPaymentEntity);
      const saved = await paymentRepository.save(payment);
      await this.recreateFinancialMovement(saved, manager);
      await this.recalculateInvoicePaymentState(
        payment.purchaseInvoiceId,
        manager.getRepository(PurchaseInvoiceEntity),
        paymentRepository,
      );
      return saved;
    });

    return this.findByIdOrFail(savedPayment.id);
  }

  async remove(id: string, reverseFinancialEffect = false, vaultId?: string | null) {
    const payment = await this.findByIdOrFail(id);
    const purchaseInvoiceId = payment.purchaseInvoiceId;
    await this.dataSource.transaction(async (manager) => {
      if (reverseFinancialEffect) {
        await this.recordFinancialReversalToVault(payment, vaultId, manager);
      } else {
        await this.deleteFinancialMovement(payment.id, manager);
      }
      await manager.getRepository(SupplierPaymentEntity).remove(payment);
      await this.recalculateInvoicePaymentState(
        purchaseInvoiceId,
        manager.getRepository(PurchaseInvoiceEntity),
        manager.getRepository(SupplierPaymentEntity),
      );
      await this.undoActionsService.record({
        actionType: reverseFinancialEffect ? 'delete_with_vault_reversal' : 'delete_only',
        entityType: 'supplier_payment',
        entityId: payment.id,
        recordSummary: payment.paymentNumber,
        snapshot: this.toSnapshot(payment),
        reverseToVault: reverseFinancialEffect,
        vaultTransactionSourceType: reverseFinancialEffect ? 'supplier_payment_vault_reversal' : null,
        vaultTransactionSourceId: reverseFinancialEffect ? payment.id : null,
      });
    });

    return { id };
  }

  async restoreFromUndo(action: UndoActionEntity) {
    const restoredPayment = this.supplierPaymentRepository.create(action.snapshot as Partial<SupplierPaymentEntity>);

    return this.dataSource.transaction(async (manager) => {
      await this.vaultsService.deleteFinancialMovement('supplier_payment_vault_reversal', restoredPayment.id, manager);
      const saved = await manager.getRepository(SupplierPaymentEntity).save(restoredPayment);
      await this.recreateFinancialMovement(saved, manager);
      await this.recalculateInvoicePaymentState(
        saved.purchaseInvoiceId,
        manager.getRepository(PurchaseInvoiceEntity),
        manager.getRepository(SupplierPaymentEntity),
      );
      return saved;
    });
  }

  async reversePaymentsForInvoice(purchaseInvoiceId: string, manager = this.dataSource.manager, vaultId?: string | null) {
    const payments = await manager.getRepository(SupplierPaymentEntity).find({ where: { purchaseInvoiceId } });

    for (const payment of payments) {
      await this.recordFinancialReversalToVault(payment, vaultId, manager);
    }

    return payments;
  }

  private async recreateFinancialMovement(payment: SupplierPaymentEntity, manager = this.dataSource.manager) {
    await this.deleteFinancialMovement(payment.id, manager);

    if (payment.paymentMethod === SupplierPaymentMethod.Cash && payment.drawerId) {
      await manager.getRepository(DrawerTransactionEntity).save({
        drawerId: payment.drawerId,
        branchId: payment.branchId,
        transactionDate: payment.paymentDate,
        transactionType: DrawerTransactionType.SupplierPaymentCash,
        direction: DrawerTransactionDirection.Out,
        amount: payment.amount,
        sourceType: 'supplier_payment',
        sourceId: payment.id,
        description: `دفعة مورد ${payment.paymentNumber}`,
        notes: payment.notes,
      });
    }

    if (payment.paymentMethod === SupplierPaymentMethod.Bank && payment.bankAccountId) {
      await manager.getRepository(BankAccountTransactionEntity).save({
        bankAccountId: payment.bankAccountId,
        transactionDate: payment.paymentDate,
        transactionType: BankAccountTransactionType.SupplierPaymentBank,
        direction: BankAccountTransactionDirection.Outgoing,
        amount: payment.amount,
        branchId: payment.branchId,
        sourceType: 'supplier_payment',
        sourceId: payment.id,
        referenceNumber: payment.referenceNumber,
        description: `دفعة مورد ${payment.paymentNumber}`,
        notes: payment.notes,
      });
    }
    if (payment.paymentMethod === SupplierPaymentMethod.Vault && payment.vaultId) {
      await this.vaultsService.recordTransaction(
        {
          vaultId: payment.vaultId,
          transactionDate: payment.paymentDate,
          transactionType: VaultTransactionType.SupplierPayment,
          direction: VaultTransactionDirection.Out,
          amount: payment.amount,
          branchId: payment.branchId,
          sourceType: 'supplier_payment',
          sourceId: payment.id,
          referenceNumber: payment.referenceNumber,
          description: `دفعة مورد ${payment.paymentNumber}`,
          notes: payment.notes,
        },
        manager,
      );
    }
  }

  private async recordFinancialReversal(payment: SupplierPaymentEntity, manager = this.dataSource.manager) {
    const today = new Date().toISOString().slice(0, 10);

    if (payment.paymentMethod === SupplierPaymentMethod.Cash && payment.drawerId) {
      const existingReversal = await manager.getRepository(DrawerTransactionEntity).findOne({
        where: { sourceType: 'supplier_payment_reversal', sourceId: payment.id },
      });
      if (existingReversal) {
        return;
      }

      await manager.getRepository(DrawerTransactionEntity).save({
        drawerId: payment.drawerId,
        branchId: payment.branchId,
        transactionDate: today,
        transactionType: DrawerTransactionType.SupplierPaymentCashReversal,
        direction: DrawerTransactionDirection.In,
        amount: payment.amount,
        sourceType: 'supplier_payment_reversal',
        sourceId: payment.id,
        description: `عكس دفعة مورد ${payment.paymentNumber}`,
        notes: payment.notes,
      });
    }

    if (payment.paymentMethod === SupplierPaymentMethod.Bank && payment.bankAccountId) {
      const existingReversal = await manager.getRepository(BankAccountTransactionEntity).findOne({
        where: { sourceType: 'supplier_payment_reversal', sourceId: payment.id },
      });
      if (existingReversal) {
        return;
      }

      await manager.getRepository(BankAccountTransactionEntity).save({
        bankAccountId: payment.bankAccountId,
        transactionDate: today,
        transactionType: BankAccountTransactionType.SupplierPaymentBankReversal,
        direction: BankAccountTransactionDirection.Incoming,
        amount: payment.amount,
        branchId: payment.branchId,
        sourceType: 'supplier_payment_reversal',
        sourceId: payment.id,
        referenceNumber: payment.referenceNumber,
        description: `عكس دفعة مورد ${payment.paymentNumber}`,
        notes: payment.notes,
      });
    }
    if (payment.paymentMethod === SupplierPaymentMethod.Vault && payment.vaultId) {
      const existingReversal = await manager.getRepository(VaultTransactionEntity).findOne({
        where: { sourceType: 'supplier_payment_reversal', sourceId: payment.id },
      });
      if (existingReversal) {
        return;
      }
      await this.vaultsService.recordTransaction(
        {
          vaultId: payment.vaultId,
          transactionDate: today,
          transactionType: VaultTransactionType.SupplierPayment,
          direction: VaultTransactionDirection.In,
          amount: payment.amount,
          branchId: payment.branchId,
          sourceType: 'supplier_payment_reversal',
          sourceId: payment.id,
          referenceNumber: payment.referenceNumber,
          description: `عكس دفعة مورد ${payment.paymentNumber}`,
          notes: payment.notes,
        },
        manager,
      );
    }
  }

  private async recordFinancialReversalToVault(
    payment: SupplierPaymentEntity,
    vaultId?: string | null,
    manager = this.dataSource.manager,
  ) {
    await this.deleteFinancialMovement(payment.id, manager);
    await this.vaultsService.recordFinancialReturnToVault(
      {
        vaultId,
        amount: payment.amount,
        branchId: payment.branchId,
        sourceType: 'supplier_payment_vault_reversal',
        sourceId: payment.id,
        referenceNumber: payment.referenceNumber ?? payment.paymentNumber,
        description: `استرجاع دفعة مورد إلى الخزنة ${payment.paymentNumber}`,
        notes: payment.notes,
      },
      manager,
    );
  }

  private async deleteFinancialMovement(paymentId: string, manager = this.dataSource.manager) {
    await Promise.all([
      manager.getRepository(DrawerTransactionEntity).delete({ sourceType: 'supplier_payment', sourceId: paymentId }),
      manager
        .getRepository(BankAccountTransactionEntity)
        .delete({ sourceType: 'supplier_payment', sourceId: paymentId }),
      this.vaultsService.deleteFinancialMovement('supplier_payment', paymentId, manager),
    ]);
  }

  private async validatePaymentReferences(data: {
    purchaseInvoiceId?: string;
    branchId: string;
    paymentMethod: SupplierPaymentMethod;
    drawerId?: string | null;
    bankAccountId?: string | null;
    vaultId?: string | null;
  }) {
    const invoice = await this.purchaseInvoiceRepository.findOne({ where: { id: data.purchaseInvoiceId } });

    if (!invoice) {
      throw new NotFoundException('Purchase invoice was not found.');
    }

    if (invoice.status === PurchaseInvoiceStatus.Cancelled) {
      throw new BadRequestException('Cannot add payments to a cancelled invoice.');
    }

    if (invoice.branchId !== data.branchId) {
      throw new BadRequestException('Payment branch must match the invoice branch.');
    }

    const branch = await this.branchRepository.findOne({ where: { id: data.branchId } });

    if (!branch) {
      throw new NotFoundException('Branch was not found.');
    }

    if (data.paymentMethod === SupplierPaymentMethod.Cash) {
      if (!data.drawerId) {
        throw new BadRequestException('Cash supplier payments require drawerId.');
      }

      const drawer = await this.drawerRepository.findOne({ where: { id: data.drawerId } });

      if (!drawer) {
        throw new NotFoundException('Drawer was not found.');
      }
    }

    if (data.paymentMethod === SupplierPaymentMethod.Bank) {
      if (!data.bankAccountId) {
        throw new BadRequestException('Bank supplier payments require bankAccountId.');
      }

      const bankAccount = await this.bankAccountRepository.findOne({ where: { id: data.bankAccountId } });

      if (!bankAccount) {
        throw new NotFoundException('Bank account was not found.');
      }
    }

    if (data.paymentMethod === SupplierPaymentMethod.Vault) {
      if (!(data as { vaultId?: string | null }).vaultId) {
        throw new BadRequestException('Vault supplier payments require vaultId.');
      }
      await this.vaultsService.findEntityByIdOrFail((data as { vaultId: string }).vaultId);
    }

    return invoice;
  }

  private async recalculateInvoicePaymentState(
    purchaseInvoiceId: string,
    invoiceRepository = this.purchaseInvoiceRepository,
    paymentRepository = this.supplierPaymentRepository,
  ) {
    const invoice = await invoiceRepository.findOneOrFail({ where: { id: purchaseInvoiceId } });
    const payments = await paymentRepository.find({ where: { purchaseInvoiceId } });

    invoice.paidAmount = this.roundMoney(payments.reduce((sum, payment) => sum + payment.amount, 0));
    invoice.remainingAmount = this.roundMoney(invoice.totalAmount - invoice.paidAmount);
    invoice.lastPaymentDate =
      payments
        .map((payment) => payment.paymentDate)
        .sort()
        .at(-1) ?? null;

    if (invoice.status !== PurchaseInvoiceStatus.Cancelled) {
      invoice.status = this.resolveInvoiceStatus(invoice.totalAmount, invoice.paidAmount);
    }

    await invoiceRepository.save(invoice);
  }

  private async ensureCodeIsAvailable(paymentNumber?: string, currentId?: string) {
    if (!paymentNumber) {
      return;
    }

    const existingPayment = await this.supplierPaymentRepository.findOne({
      where: { paymentNumber: paymentNumber.toUpperCase() },
    });

    if (existingPayment && existingPayment.id !== currentId) {
      throw new ConflictException('A supplier payment with this number already exists.');
    }
  }

  private async generatePaymentNumber(repository = this.supplierPaymentRepository) {
    const today = new Date();
    const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await repository.count();

    return `SP-${yyyymmdd}-${String(count + 1).padStart(5, '0')}`;
  }

  private resolveInvoiceStatus(totalAmount: number, paidAmount: number) {
    if (paidAmount <= 0) {
      return PurchaseInvoiceStatus.Open;
    }

    if (paidAmount >= totalAmount) {
      return PurchaseInvoiceStatus.Paid;
    }

    return PurchaseInvoiceStatus.PartiallyPaid;
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private toSnapshot(payment: SupplierPaymentEntity) {
    return {
      id: payment.id,
      paymentNumber: payment.paymentNumber,
      purchaseInvoiceId: payment.purchaseInvoiceId,
      branchId: payment.branchId,
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      drawerId: payment.drawerId,
      bankAccountId: payment.bankAccountId,
      vaultId: payment.vaultId,
      amount: payment.amount,
      referenceNumber: payment.referenceNumber,
      notes: payment.notes,
    };
  }
}
