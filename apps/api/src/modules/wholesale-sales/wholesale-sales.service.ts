import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import ExcelJS = require('exceljs');
import puppeteer from 'puppeteer';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  BankAccountTransactionDirection,
  BankAccountTransactionEntity,
  BankAccountTransactionType,
} from '../bank-account-transactions/entities/bank-account-transaction.entity';
import { BankAccountEntity } from '../bank-accounts/entities/bank-account.entity';
import { BranchEntity } from '../branches/entities/branch.entity';
import { CustomerEntity } from '../customers/entities/customer.entity';
import { DailySalesClosingService, DailySalesClosingOperationChange } from '../daily-sales/daily-sales-closing.service';
import {
  DrawerTransactionDirection,
  DrawerTransactionEntity,
  DrawerTransactionType,
} from '../drawer-transactions/entities/drawer-transaction.entity';
import { DrawerEntity } from '../drawers/entities/drawer.entity';
import { ItemEntity } from '../items/entities/item.entity';
import { StockMovementType } from '../stock-movements/entities/stock-movement.entity';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import { VaultTransactionDirection, VaultTransactionEntity, VaultTransactionType } from '../vaults/entities/vault-transaction.entity';
import { VaultsService } from '../vaults/vaults.service';
import { WarehouseEntity } from '../warehouses/entities/warehouse.entity';
import { CreateWholesaleSalesInvoiceDto } from './dto/create-wholesale-sales-invoice.dto';
import { CreateWholesaleSalesPaymentBatchDto } from './dto/create-wholesale-sales-payment-batch.dto';
import { CreateWholesaleSalesPaymentDto } from './dto/create-wholesale-sales-payment.dto';
import { TransferWholesaleCashToVaultDto } from './dto/transfer-cash-to-vault.dto';
import { UpdateWholesaleSalesInvoiceDto } from './dto/update-wholesale-sales-invoice.dto';
import { WholesaleSalesInvoiceItemEntity } from './entities/wholesale-sales-invoice-item.entity';
import {
  WholesaleSalesDocumentStatus,
  WholesaleSalesInvoiceEntity,
  WholesaleSalesPaymentStatus,
} from './entities/wholesale-sales-invoice.entity';
import { WholesaleSalesPaymentEntity, WholesaleSalesPaymentMethod } from './entities/wholesale-sales-payment.entity';

type WholesaleSalesFilters = {
  customerId?: string;
  warehouseId?: string;
  branchId?: string;
  documentStatus?: string;
  paymentStatus?: string;
  invoiceDateFrom?: string;
  invoiceDateTo?: string;
  search?: string;
  collectionDateSort?: 'asc' | 'desc';
};

export type WholesaleAggregationFilters = {
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type WholesaleCollectedSalesSummary = {
  total: number;
  rows: Array<{
    date: string;
    branchId: string;
    amount: number;
  }>;
};

export type WholesaleReceivablesSummary = {
  total: number;
};

@Injectable()
export class WholesaleSalesService {
  private readonly logger = new Logger(WholesaleSalesService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(WholesaleSalesInvoiceEntity)
    private readonly invoiceRepository: Repository<WholesaleSalesInvoiceEntity>,
    @InjectRepository(WholesaleSalesInvoiceItemEntity)
    private readonly invoiceItemRepository: Repository<WholesaleSalesInvoiceItemEntity>,
    @InjectRepository(WholesaleSalesPaymentEntity)
    private readonly paymentRepository: Repository<WholesaleSalesPaymentEntity>,
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
    @InjectRepository(BranchEntity)
    private readonly branchRepository: Repository<BranchEntity>,
    @InjectRepository(WarehouseEntity)
    private readonly warehouseRepository: Repository<WarehouseEntity>,
    @InjectRepository(ItemEntity)
    private readonly itemRepository: Repository<ItemEntity>,
    @InjectRepository(DrawerEntity)
    private readonly drawerRepository: Repository<DrawerEntity>,
    @InjectRepository(BankAccountEntity)
    private readonly bankAccountRepository: Repository<BankAccountEntity>,
    private readonly stockMovementsService: StockMovementsService,
    private readonly vaultsService: VaultsService,
    private readonly dailySalesClosingService: DailySalesClosingService,
  ) {}

  findAll(filters: WholesaleSalesFilters = {}) {
    const query = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.customer', 'customer')
      .leftJoinAndSelect('invoice.branch', 'branch')
      .leftJoinAndSelect('invoice.warehouse', 'warehouse')
      .leftJoinAndSelect('invoice.items', 'invoiceItem')
      .leftJoinAndSelect('invoiceItem.item', 'item');

    const latestPaymentDateSubquery = query
      .subQuery()
      .select('MAX(payment.payment_date)')
      .from(WholesaleSalesPaymentEntity, 'payment')
      .where('payment.invoice_id = invoice.id')
      .getQuery();

    query.addSelect(latestPaymentDateSubquery, 'latestPaymentDate');

    if (filters.customerId) query.andWhere('invoice.customer_id = :customerId', { customerId: filters.customerId });
    if (filters.warehouseId) query.andWhere('invoice.warehouse_id = :warehouseId', { warehouseId: filters.warehouseId });
    if (filters.branchId) query.andWhere('invoice.branch_id = :branchId', { branchId: filters.branchId });
    if (filters.documentStatus) query.andWhere('invoice.document_status = :documentStatus', { documentStatus: filters.documentStatus });
    if (filters.paymentStatus) query.andWhere('invoice.payment_status = :paymentStatus', { paymentStatus: filters.paymentStatus });
    if (filters.invoiceDateFrom) query.andWhere('invoice.invoice_date >= :invoiceDateFrom', { invoiceDateFrom: filters.invoiceDateFrom });
    if (filters.invoiceDateTo) query.andWhere('invoice.invoice_date <= :invoiceDateTo', { invoiceDateTo: filters.invoiceDateTo });

    const search = filters.search?.trim();
    if (search) {
      query.andWhere('(invoice.invoice_number ILIKE :search OR customer.name ILIKE :search OR customer.phone ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (filters.collectionDateSort) {
      const direction = filters.collectionDateSort.toUpperCase() as 'ASC' | 'DESC';
      query
        .orderBy(`CASE WHEN ${latestPaymentDateSubquery} IS NULL THEN 1 ELSE 0 END`, 'ASC')
        .addOrderBy(latestPaymentDateSubquery, direction)
        .addOrderBy('invoice.invoice_date', 'DESC')
        .addOrderBy('invoice.invoice_number', 'DESC');
    } else {
      query.orderBy('invoice.invoice_date', 'DESC').addOrderBy('invoice.invoice_number', 'DESC');
    }

    return query.getRawAndEntities().then(({ raw, entities }) =>
      entities.map((invoice, index) => ({
        ...invoice,
        latestPaymentDate: raw[index]?.latestPaymentDate ?? null,
      })),
    );
  }

  async findDetails(id: string) {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: {
        customer: true,
        branch: true,
        warehouse: true,
        items: { item: { unit: true }, unit: true },
        payments: { drawer: true, vault: true, bankAccount: true, branch: true },
      },
    });

    if (!invoice) throw new NotFoundException('فاتورة بيع الجملة غير موجودة.');
    return {
      ...invoice,
      stockWarnings: await this.stockWarnings(invoice),
    };
  }

  async create(dto: CreateWholesaleSalesInvoiceDto) {
    await this.ensureInvoiceNumberAvailable(dto.invoiceNumber ?? undefined);
    await this.validateHeader(dto.customerId, dto.branchId, dto.warehouseId);
    await this.validateItems(dto.items.map((item) => item.itemId));

    const invoiceNumber = dto.invoiceNumber?.trim().toUpperCase() || (await this.generateInvoiceNumber());
    const subtotalAmount = this.roundMoney(dto.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
    const discountAmount = this.roundMoney(dto.discountAmount ?? 0);
    const totalAmount = this.roundMoney(Math.max(subtotalAmount - discountAmount, 0));

    const createdInvoiceId = await this.dataSource.transaction(async (manager) => {
      const invoiceRepository = manager.getRepository(WholesaleSalesInvoiceEntity);
      const itemRepository = manager.getRepository(WholesaleSalesInvoiceItemEntity);
      const invoice = await invoiceRepository.save(
        invoiceRepository.create({
          invoiceNumber,
          customerId: dto.customerId,
          branchId: dto.branchId,
          warehouseId: dto.warehouseId,
          invoiceDate: dto.invoiceDate,
          dueDate: this.optionalText(dto.dueDate),
          documentStatus: dto.documentStatus ?? WholesaleSalesDocumentStatus.Draft,
          paymentStatus: WholesaleSalesPaymentStatus.Unpaid,
          subtotalAmount,
          discountAmount,
          totalAmount,
          paidAmount: 0,
          remainingAmount: totalAmount,
          notes: this.optionalText(dto.notes),
        }),
      );

      const lines = await itemRepository.save(
        dto.items.map((line) =>
          itemRepository.create({
            invoiceId: invoice.id,
            itemId: line.itemId,
            unitId: line.unitId ?? null,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: this.roundMoney(line.quantity * line.unitPrice),
            notes: this.optionalText(line.notes),
          }),
        ),
      );

      if (invoice.documentStatus === WholesaleSalesDocumentStatus.Approved) {
        await this.replaceInventoryMovements(invoice, lines, manager);
      }

      return invoice.id;
    });

    return this.findDetails(createdInvoiceId);
  }

  async update(id: string, dto: UpdateWholesaleSalesInvoiceDto) {
    const invoice = await this.invoiceRepository.findOne({ where: { id }, relations: { items: true } });
    if (!invoice) throw new NotFoundException('فاتورة بيع الجملة غير موجودة.');
    await this.ensureInvoiceNumberAvailable(dto.invoiceNumber ?? undefined, id);
    await this.validateHeader(dto.customerId ?? invoice.customerId, dto.branchId ?? invoice.branchId, dto.warehouseId ?? invoice.warehouseId);

    Object.assign(invoice, {
      invoiceNumber: dto.invoiceNumber?.trim().toUpperCase() ?? invoice.invoiceNumber,
      customerId: dto.customerId ?? invoice.customerId,
      branchId: dto.branchId ?? invoice.branchId,
      warehouseId: dto.warehouseId ?? invoice.warehouseId,
      invoiceDate: dto.invoiceDate ?? invoice.invoiceDate,
      dueDate: dto.dueDate !== undefined ? this.optionalText(dto.dueDate) : invoice.dueDate,
      documentStatus: dto.documentStatus ?? invoice.documentStatus,
      discountAmount: dto.discountAmount !== undefined ? this.roundMoney(dto.discountAmount) : invoice.discountAmount,
      notes: dto.notes !== undefined ? this.optionalText(dto.notes) : invoice.notes,
    });
    invoice.totalAmount = this.roundMoney(Math.max(invoice.subtotalAmount - invoice.discountAmount, 0));
    await this.ensureNotOverpaid(invoice);
    this.applyPaymentStatus(invoice);

    return this.dataSource.transaction(async (manager) => {
      const saved = await manager.getRepository(WholesaleSalesInvoiceEntity).save(invoice);
      if (saved.documentStatus === WholesaleSalesDocumentStatus.Approved) {
        await this.replaceInventoryMovements(saved, invoice.items, manager);
      } else {
        await this.stockMovementsService.replaceSourceMovements('wholesale_sales_invoice', saved.id, [], manager);
      }
      return this.findDetails(saved.id);
    });
  }

  async approve(id: string) {
    const invoice = await this.invoiceRepository.findOne({ where: { id }, relations: { items: true } });
    if (!invoice) throw new NotFoundException('فاتورة بيع الجملة غير موجودة.');
    invoice.documentStatus = WholesaleSalesDocumentStatus.Approved;
    return this.dataSource.transaction(async (manager) => {
      const saved = await manager.getRepository(WholesaleSalesInvoiceEntity).save(invoice);
      await this.replaceInventoryMovements(saved, invoice.items, manager);
      return this.findDetails(saved.id);
    });
  }

  async cancel(id: string) {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: { payments: { drawer: true, vault: true, bankAccount: true }, customer: true },
    });
    if (!invoice) throw new NotFoundException('فاتورة بيع الجملة غير موجودة.');
    return this.dataSource.transaction(async (manager) => {
      await this.stockMovementsService.replaceSourceMovements('wholesale_sales_invoice', invoice.id, [], manager);
      for (const payment of invoice.payments ?? []) {
        await this.reversePaymentFinancialMovement(payment, invoice, manager);
        await this.dailySalesClosingService.recordPostCloseChanges(this.paymentClosingChanges(payment, 'cancelled'), manager);
      }
      invoice.documentStatus = WholesaleSalesDocumentStatus.Cancelled;
      return manager.getRepository(WholesaleSalesInvoiceEntity).save(invoice);
    });
  }

  async getWholesaleCollectedSalesSummary(filters: WholesaleAggregationFilters = {}): Promise<WholesaleCollectedSalesSummary> {
    const query = this.paymentRepository
      .createQueryBuilder('payment')
      .innerJoin('payment.invoice', 'invoice')
      .select('payment.payment_date', 'date')
      .addSelect('payment.branch_id', 'branchId')
      .addSelect('COALESCE(SUM(payment.amount), 0)', 'amount')
      .where('invoice.document_status = :approved', { approved: WholesaleSalesDocumentStatus.Approved })
      .groupBy('payment.payment_date')
      .addGroupBy('payment.branch_id')
      .orderBy('payment.payment_date', 'ASC');

    if (filters.branchId) query.andWhere('payment.branch_id = :branchId', { branchId: filters.branchId });
    if (filters.dateFrom) query.andWhere('payment.payment_date >= :dateFrom', { dateFrom: filters.dateFrom });
    if (filters.dateTo) query.andWhere('payment.payment_date <= :dateTo', { dateTo: filters.dateTo });

    const rows = (await query.getRawMany<{ date: string; branchId: string; amount: string }>()).map((row) => ({
      date: row.date,
      branchId: row.branchId,
      amount: this.roundMoney(Number(row.amount ?? 0)),
    }));

    return {
      rows,
      total: this.roundMoney(rows.reduce((sum, row) => sum + row.amount, 0)),
    };
  }

  async getWholesaleReceivablesSummary(filters: Pick<WholesaleAggregationFilters, 'branchId'> = {}): Promise<WholesaleReceivablesSummary> {
    const query = this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('COALESCE(SUM(invoice.remaining_amount), 0)', 'total')
      .where('invoice.document_status = :approved', { approved: WholesaleSalesDocumentStatus.Approved })
      .andWhere('invoice.remaining_amount > 0');

    if (filters.branchId) query.andWhere('invoice.branch_id = :branchId', { branchId: filters.branchId });

    const row = await query.getRawOne<{ total: string }>();
    return { total: this.roundMoney(Number(row?.total ?? 0)) };
  }

  async remove(id: string) {
    const invoice = await this.invoiceRepository.findOne({ where: { id }, relations: { payments: true } });
    if (!invoice) throw new NotFoundException('فاتورة بيع الجملة غير موجودة.');
    if (invoice.documentStatus === WholesaleSalesDocumentStatus.Approved || invoice.payments.length > 0) {
      throw new BadRequestException('لا يمكن حذف فاتورة معتمدة أو عليها تحصيلات. استخدم الإلغاء بدل الحذف.');
    }
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(WholesaleSalesInvoiceItemEntity).delete({ invoiceId: id });
      await manager.getRepository(WholesaleSalesInvoiceEntity).remove(invoice);
    });
    return { id };
  }

  async addPayment(invoiceId: string, dto: CreateWholesaleSalesPaymentDto) {
    return this.createPayments(
      { invoiceId, branchId: dto.branchId, paymentDate: dto.paymentDate, payments: [dto] },
      { includeDetails: false },
    );
  }

  async addPaymentBatch(dto: CreateWholesaleSalesPaymentBatchDto) {
    return this.createPayments(dto);
  }

  async transferCashToVault(invoiceId: string, dto: TransferWholesaleCashToVaultDto) {
    const invoice = await this.invoiceRepository.findOne({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('فاتورة بيع الجملة غير موجودة.');
    const cashCollected = await this.cashCollectedAmount(invoiceId);
    const transferable = this.roundMoney(cashCollected - invoice.cashTransferredAmount);
    if (dto.amount > transferable) {
      throw new BadRequestException('مبلغ التحويل أكبر من النقد المتاح للتحويل لهذه الفاتورة.');
    }
    const drawer = await this.drawerRepository.findOne({ where: { id: dto.drawerId } });
    if (!drawer) throw new NotFoundException('الدرج غير موجود.');
    await this.vaultsService.findEntityByIdOrFail(dto.vaultId);

    return this.dataSource.transaction(async (manager) => {
      await manager.getRepository(DrawerTransactionEntity).save({
        drawerId: dto.drawerId,
        branchId: invoice.branchId,
        transactionDate: dto.transferDate,
        transactionType: DrawerTransactionType.TransferToVault,
        direction: DrawerTransactionDirection.Out,
        amount: dto.amount,
        sourceType: 'wholesale_sales_cash_transfer',
        sourceId: invoice.id,
        description: `تحويل تحصيل نقدي لفاتورة بيع جملة ${invoice.invoiceNumber} إلى الخزنة`,
        notes: this.optionalText(dto.notes),
      });
      await this.vaultsService.recordTransaction(
        {
          vaultId: dto.vaultId,
          transactionDate: dto.transferDate,
          transactionType: VaultTransactionType.DepositFromDrawer,
          direction: VaultTransactionDirection.In,
          amount: dto.amount,
          branchId: invoice.branchId,
          drawerId: dto.drawerId,
          sourceType: 'wholesale_sales_cash_transfer',
          sourceId: invoice.id,
          referenceNumber: invoice.invoiceNumber,
          description: `استلام تحصيل نقدي لفاتورة بيع جملة ${invoice.invoiceNumber}`,
          notes: this.optionalText(dto.notes),
        },
        manager,
      );
      invoice.cashTransferredAmount = this.roundMoney(invoice.cashTransferredAmount + dto.amount);
      return manager.getRepository(WholesaleSalesInvoiceEntity).save(invoice);
    });
  }

  async exportInvoice(id: string, format: 'excel' | 'pdf') {
    const invoice = await this.findDetails(id);
    if (format === 'pdf') {
      this.logger.log(`Reached wholesale single invoice PDF export branch. invoiceId=${id}`);
      return this.exportInvoicePdf(invoice);
    }
    return this.exportInvoiceExcel(invoice);
  }

  async exportList(filters: WholesaleSalesFilters, format: 'excel' | 'pdf') {
    const invoices = await this.findAll(filters);
    return format === 'pdf' ? this.exportListPdf(invoices) : this.exportListExcel(invoices);
  }

  private async createPayments(
    dto: { invoiceId: string; branchId: string; paymentDate: string; payments: CreateWholesaleSalesPaymentDto[] },
    options: { includeDetails?: boolean } = {},
  ) {
    const invoice = await this.invoiceRepository.findOne({ where: { id: dto.invoiceId }, relations: { customer: true } });
    if (!invoice) throw new NotFoundException('فاتورة بيع الجملة غير موجودة.');
    if (invoice.documentStatus === WholesaleSalesDocumentStatus.Cancelled) {
      throw new BadRequestException('لا يمكن إضافة تحصيلات إلى فاتورة ملغاة.');
    }
    if (invoice.branchId !== dto.branchId) {
      throw new BadRequestException('فرع التحصيل يجب أن يطابق فرع الفاتورة.');
    }
    const total = this.roundMoney(dto.payments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0));
    if (total > invoice.remainingAmount) {
      throw new BadRequestException('مجموع التحصيلات لا يمكن أن يتجاوز المتبقي من الفاتورة.');
    }

    for (const payment of dto.payments) {
      await this.validatePaymentSource(payment);
    }

    const savedPaymentIds = await this.dataSource.transaction(async (manager) => {
      const paymentRepository = manager.getRepository(WholesaleSalesPaymentEntity);
      const paymentIds: string[] = [];
      for (const row of dto.payments) {
        const saved = await paymentRepository.save(
          paymentRepository.create({
            paymentNumber: row.paymentNumber?.trim().toUpperCase() || (await this.generatePaymentNumber(paymentRepository)),
            invoiceId: dto.invoiceId,
            branchId: dto.branchId,
            paymentDate: row.paymentDate ?? dto.paymentDate,
            paymentMethod: row.paymentMethod,
            drawerId: row.paymentMethod === WholesaleSalesPaymentMethod.Cash ? row.drawerId ?? null : null,
            vaultId: row.paymentMethod === WholesaleSalesPaymentMethod.Vault ? row.vaultId ?? null : null,
            bankAccountId: row.paymentMethod === WholesaleSalesPaymentMethod.Bank ? row.bankAccountId ?? null : null,
            amount: Number(row.amount),
            referenceNumber: this.optionalText(row.referenceNumber),
            notes: this.optionalText(row.notes),
          }),
        );
        paymentIds.push(saved.id);
        await this.recreatePaymentMovement(saved, manager, invoice);
        await this.dailySalesClosingService.recordPostCloseChanges(this.paymentClosingChanges(saved, 'created'), manager);
      }
      await this.recalculatePaymentState(dto.invoiceId, manager);
      return paymentIds;
    });

    if (options.includeDetails === false) {
      const refreshedInvoice = await this.invoiceRepository.findOneOrFail({
        where: { id: dto.invoiceId },
        select: {
          id: true,
          paidAmount: true,
          remainingAmount: true,
          paymentStatus: true,
        },
      });

      return {
        invoiceId: dto.invoiceId,
        paymentIds: savedPaymentIds,
        paidAmount: refreshedInvoice.paidAmount,
        remainingAmount: refreshedInvoice.remainingAmount,
        paymentStatus: refreshedInvoice.paymentStatus,
      };
    }

    return this.findDetails(dto.invoiceId);
  }

  private async recreatePaymentMovement(
    payment: WholesaleSalesPaymentEntity,
    manager = this.dataSource.manager,
    invoice?: WholesaleSalesInvoiceEntity,
  ) {
    const movementLabel = invoice
      ? `فاتورة بيع جملة ${invoice.invoiceNumber}${invoice.customer?.name ? ` - العميل: ${invoice.customer.name}` : ''}`
      : `تحصيل بيع جملة ${payment.paymentNumber}`;

    await Promise.all([
      manager.getRepository(DrawerTransactionEntity).delete({ sourceType: 'wholesale_sales_payment', sourceId: payment.id }),
      manager.getRepository(BankAccountTransactionEntity).delete({ sourceType: 'wholesale_sales_payment', sourceId: payment.id }),
      this.vaultsService.deleteFinancialMovement('wholesale_sales_payment', payment.id, manager),
    ]);

    if (payment.paymentMethod === WholesaleSalesPaymentMethod.Cash && payment.drawerId) {
      await manager.getRepository(DrawerTransactionEntity).save({
        drawerId: payment.drawerId,
        branchId: payment.branchId,
        transactionDate: payment.paymentDate,
        transactionType: DrawerTransactionType.WholesaleSalesCashCollection,
        direction: DrawerTransactionDirection.In,
        amount: payment.amount,
        sourceType: 'wholesale_sales_payment',
        sourceId: payment.id,
        description: `تحصيل وارد إلى الدرج - ${movementLabel}`,
        notes: payment.notes,
      });
    }

    if (payment.paymentMethod === WholesaleSalesPaymentMethod.Bank && payment.bankAccountId) {
      await manager.getRepository(BankAccountTransactionEntity).save({
        bankAccountId: payment.bankAccountId,
        transactionDate: payment.paymentDate,
        transactionType: BankAccountTransactionType.WholesaleSalesReceiptBank,
        direction: BankAccountTransactionDirection.Incoming,
        amount: payment.amount,
        branchId: payment.branchId,
        sourceType: 'wholesale_sales_payment',
        sourceId: payment.id,
        referenceNumber: payment.referenceNumber,
        description: `تحصيل وارد إلى الحساب البنكي - ${movementLabel}`,
        notes: payment.notes,
      });
    }

    if (payment.paymentMethod === WholesaleSalesPaymentMethod.Vault && payment.vaultId) {
      await this.vaultsService.recordTransaction(
        {
          vaultId: payment.vaultId,
          transactionDate: payment.paymentDate,
          transactionType: VaultTransactionType.ManualDeposit,
          direction: VaultTransactionDirection.In,
          amount: payment.amount,
          branchId: payment.branchId,
          sourceType: 'wholesale_sales_payment',
          sourceId: payment.id,
          referenceNumber: payment.referenceNumber ?? payment.paymentNumber,
          description: `تحصيل وارد إلى الخزنة - ${movementLabel}`,
          notes: payment.notes,
        },
        manager,
      );
    }
  }

  private paymentClosingChanges(
    payment: WholesaleSalesPaymentEntity,
    actionType: DailySalesClosingOperationChange['actionType'],
  ): DailySalesClosingOperationChange[] {
    return [
      {
        branchId: payment.branchId,
        effectiveDate: payment.paymentDate,
        operationType: 'wholesale_collection',
        actionType,
        amount: Number(payment.amount ?? 0),
        reference: payment.referenceNumber ?? payment.paymentNumber,
        operationId: payment.id,
      },
    ];
  }

  private async reversePaymentFinancialMovement(
    payment: WholesaleSalesPaymentEntity,
    invoice: WholesaleSalesInvoiceEntity,
    manager: EntityManager,
  ) {
    const sourceType = 'wholesale_sales_payment_cancel';
    const existingReversal = await Promise.all([
      manager.getRepository(DrawerTransactionEntity).findOne({ where: { sourceType, sourceId: payment.id } }),
      manager.getRepository(BankAccountTransactionEntity).findOne({ where: { sourceType, sourceId: payment.id } }),
      manager.getRepository(VaultTransactionEntity).findOne({ where: { sourceType, sourceId: payment.id } }),
    ]);
    if (existingReversal.some(Boolean)) return;

    const reversalDate = new Date().toISOString().slice(0, 10);
    const customerLabel = invoice.customer?.name ? ` - العميل: ${invoice.customer.name}` : '';
    const description = `عكس تحصيل فاتورة بيع جملة ${invoice.invoiceNumber}${customerLabel}`;

    if (payment.paymentMethod === WholesaleSalesPaymentMethod.Cash && payment.drawerId) {
      await manager.getRepository(DrawerTransactionEntity).save({
        drawerId: payment.drawerId,
        branchId: payment.branchId,
        transactionDate: reversalDate,
        transactionType: DrawerTransactionType.Withdrawal,
        direction: DrawerTransactionDirection.Out,
        amount: Number(payment.amount),
        sourceType,
        sourceId: payment.id,
        description,
        notes: payment.notes,
      });
    }

    if (payment.paymentMethod === WholesaleSalesPaymentMethod.Bank && payment.bankAccountId) {
      await manager.getRepository(BankAccountTransactionEntity).save({
        bankAccountId: payment.bankAccountId,
        transactionDate: reversalDate,
        transactionType: BankAccountTransactionType.RefundBank,
        direction: BankAccountTransactionDirection.Outgoing,
        amount: Number(payment.amount),
        branchId: payment.branchId,
        sourceType,
        sourceId: payment.id,
        referenceNumber: payment.referenceNumber ?? payment.paymentNumber,
        description,
        notes: payment.notes,
      });
    }

    if (payment.paymentMethod === WholesaleSalesPaymentMethod.Vault && payment.vaultId) {
      await this.vaultsService.recordTransaction(
        {
          vaultId: payment.vaultId,
          transactionDate: reversalDate,
          transactionType: VaultTransactionType.ManualWithdrawal,
          direction: VaultTransactionDirection.Out,
          amount: Number(payment.amount),
          branchId: payment.branchId,
          sourceType,
          sourceId: payment.id,
          referenceNumber: payment.referenceNumber ?? payment.paymentNumber,
          description,
          notes: payment.notes,
        },
        manager,
      );
    }
  }

  private async replaceInventoryMovements(
    invoice: WholesaleSalesInvoiceEntity,
    lines: WholesaleSalesInvoiceItemEntity[],
    manager: EntityManager,
  ) {
    await this.stockMovementsService.replaceSourceMovements(
      'wholesale_sales_invoice',
      invoice.id,
      lines.map((line) => ({
        movementDate: invoice.invoiceDate,
        warehouseId: invoice.warehouseId,
        itemId: line.itemId,
        unitId: line.unitId,
        movementType: StockMovementType.WholesaleSaleOut,
        quantityOut: line.quantity,
        sourceType: 'wholesale_sales_invoice',
        sourceId: invoice.id,
        sourceLineId: line.id,
        referenceNumber: invoice.invoiceNumber,
        notes: invoice.notes,
      })),
      manager,
    );
  }

  private async stockWarnings(invoice: WholesaleSalesInvoiceEntity) {
    const stockRows = (await this.stockMovementsService.currentStock(invoice.warehouseId)) as {
      itemId: string;
      quantity: string | number;
    }[];
    const stockByItem = new Map(stockRows.map((row) => [row.itemId, Number(row.quantity ?? 0)]));
    return (invoice.items ?? [])
      .map((line) => ({
        itemId: line.itemId,
        itemName: line.item?.name ?? '',
        requestedQuantity: line.quantity,
        availableQuantity: stockByItem.get(line.itemId) ?? 0,
      }))
      .filter((warning) => warning.availableQuantity < warning.requestedQuantity);
  }

  private async recalculatePaymentState(invoiceId: string, manager = this.dataSource.manager) {
    const invoice = await manager.getRepository(WholesaleSalesInvoiceEntity).findOneOrFail({ where: { id: invoiceId } });
    const payments = await manager.getRepository(WholesaleSalesPaymentEntity).find({ where: { invoiceId } });
    invoice.paidAmount = this.roundMoney(payments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0));
    await this.ensureNotOverpaid(invoice);
    this.applyPaymentStatus(invoice);
    await manager.getRepository(WholesaleSalesInvoiceEntity).save(invoice);
  }

  private applyPaymentStatus(invoice: WholesaleSalesInvoiceEntity) {
    invoice.remainingAmount = Math.max(this.roundMoney(Number(invoice.totalAmount ?? 0) - Number(invoice.paidAmount ?? 0)), 0);
    if (invoice.paidAmount <= 0) invoice.paymentStatus = WholesaleSalesPaymentStatus.Unpaid;
    else if (invoice.remainingAmount <= 0) invoice.paymentStatus = WholesaleSalesPaymentStatus.Paid;
    else invoice.paymentStatus = WholesaleSalesPaymentStatus.PartiallyPaid;
  }

  private async ensureNotOverpaid(invoice: WholesaleSalesInvoiceEntity) {
    if (Number(invoice.paidAmount ?? 0) > Number(invoice.totalAmount ?? 0)) {
      throw new BadRequestException('المحصل لا يمكن أن يتجاوز إجمالي الفاتورة.');
    }
  }

  private async validateHeader(customerId: string, branchId: string, warehouseId: string) {
    const [customer, branch, warehouse] = await Promise.all([
      this.customerRepository.findOne({ where: { id: customerId } }),
      this.branchRepository.findOne({ where: { id: branchId } }),
      this.warehouseRepository.findOne({ where: { id: warehouseId } }),
    ]);
    if (!customer) throw new NotFoundException('العميل غير موجود.');
    if (!branch) throw new NotFoundException('الفرع غير موجود.');
    if (!warehouse) throw new NotFoundException('المخزن غير موجود.');
  }

  private async validateItems(itemIds: string[]) {
    const items = await this.itemRepository.find({ where: itemIds.map((id) => ({ id })) });
    if (items.length !== new Set(itemIds).size) throw new NotFoundException('إحدى مواد الفاتورة غير موجودة.');
  }

  private async validatePaymentSource(payment: CreateWholesaleSalesPaymentDto) {
    const selectedDestinations = [payment.drawerId, payment.vaultId, payment.bankAccountId].filter(Boolean).length;
    if (selectedDestinations !== 1) {
      throw new BadRequestException('يجب اختيار جهة مستلمة واحدة فقط لكل تحصيل: درج أو خزنة أو حساب بنكي.');
    }

    if (payment.paymentMethod === WholesaleSalesPaymentMethod.Cash) {
      if (!payment.drawerId) throw new BadRequestException('التحصيل إلى الدرج يحتاج درجًا محددًا.');
      const drawer = await this.drawerRepository.findOne({ where: { id: payment.drawerId } });
      if (!drawer) throw new NotFoundException('الدرج غير موجود.');
    }

    if (payment.paymentMethod === WholesaleSalesPaymentMethod.Vault) {
      if (!payment.vaultId) throw new BadRequestException('تحصيل الخزنة يحتاج خزنة محددة.');
      await this.vaultsService.findEntityByIdOrFail(payment.vaultId);
    }

    if (payment.paymentMethod === WholesaleSalesPaymentMethod.Bank) {
      if (!payment.bankAccountId) throw new BadRequestException('التحصيل البنكي يحتاج حسابًا بنكيًا.');
      const account = await this.bankAccountRepository.findOne({ where: { id: payment.bankAccountId } });
      if (!account) throw new NotFoundException('الحساب البنكي غير موجود.');
    }
  }
  private async cashCollectedAmount(invoiceId: string) {
    const payments = await this.paymentRepository.find({ where: { invoiceId, paymentMethod: WholesaleSalesPaymentMethod.Cash } });
    return this.roundMoney(payments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0));
  }

  private async ensureInvoiceNumberAvailable(invoiceNumber?: string, currentId?: string) {
    if (!invoiceNumber) return;
    const existing = await this.invoiceRepository.findOne({ where: { invoiceNumber: invoiceNumber.toUpperCase() } });
    if (existing && existing.id !== currentId) throw new ConflictException('رقم فاتورة بيع الجملة مستخدم من قبل.');
  }

  private async generateInvoiceNumber(repository = this.invoiceRepository) {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `WS-${stamp}-${String((await repository.count()) + 1).padStart(5, '0')}`;
  }

  private async generatePaymentNumber(repository = this.paymentRepository) {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `WSP-${stamp}-${String((await repository.count()) + 1).padStart(5, '0')}`;
  }

  private async exportInvoiceExcel(invoice: WholesaleSalesInvoiceEntity & { stockWarnings?: unknown[] }) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('فاتورة بيع جملة', {
      views: [{ rightToLeft: true, showGridLines: false }],
      pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });
    worksheet.columns = [
      { header: 'المادة', key: 'item', width: 28 },
      { header: 'الكمية', key: 'quantity', width: 14 },
      { header: 'سعر الوحدة', key: 'unitPrice', width: 16 },
      { header: 'الإجمالي', key: 'lineTotal', width: 16 },
      { header: 'ملاحظات', key: 'notes', width: 24 },
    ];
    worksheet.mergeCells('A1:E1');
    worksheet.getCell('A1').value = 'مطعم الجود';
    worksheet.getCell('A1').font = { bold: true, size: 18 };
    worksheet.getCell('A2').value = `رقم الفاتورة: ${invoice.invoiceNumber}`;
    worksheet.getCell('A3').value = `التاريخ: ${invoice.invoiceDate}`;
    worksheet.getCell('C2').value = `العميل: ${invoice.customer?.name ?? ''}`;
    worksheet.getCell('C3').value = `المخزن: ${invoice.warehouse?.name ?? ''}`;
    worksheet.getCell('E2').value = `حالة التحصيل: ${this.paymentStatusLabel(invoice.paymentStatus)}`;
    let rowIndex = 5;
    worksheet.getRow(rowIndex).values = ['المادة', 'الكمية', 'سعر الوحدة', 'الإجمالي', 'ملاحظات'];
    worksheet.getRow(rowIndex).font = { bold: true };
    for (const line of invoice.items ?? []) {
      rowIndex += 1;
      worksheet.getRow(rowIndex).values = [line.item?.name ?? line.itemId, line.quantity, line.unitPrice, line.lineTotal, line.notes ?? ''];
    }
    rowIndex += 2;
    worksheet.getCell(rowIndex, 3).value = 'إجمالي الفاتورة';
    worksheet.getCell(rowIndex, 4).value = invoice.totalAmount;
    worksheet.getRow(rowIndex).font = { bold: true };

    if (invoice.payments?.length) {
      rowIndex += 3;
      worksheet.getCell(rowIndex, 1).value = 'تحصيلات الفاتورة';
      worksheet.getRow(rowIndex).font = { bold: true };
      rowIndex += 1;
      worksheet.getRow(rowIndex).values = ['رقم التحصيل', 'التاريخ', 'الجهة المستلمة', 'المبلغ', 'المرجع'];
      worksheet.getRow(rowIndex).font = { bold: true };
      for (const payment of invoice.payments) {
        rowIndex += 1;
        worksheet.getRow(rowIndex).values = [
          payment.paymentNumber,
          payment.paymentDate,
          this.collectionDestinationLabel(payment),
          payment.amount,
          payment.referenceNumber ?? '',
        ];
      }
    }

    const body = Buffer.from(await workbook.xlsx.writeBuffer());
    return {
      body,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `${invoice.invoiceNumber}.xlsx`,
    };
  }

  private async exportListExcel(invoices: Array<WholesaleSalesInvoiceEntity & { latestPaymentDate?: string | null }>) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('فواتير بيع الجملة', {
      views: [{ rightToLeft: true, showGridLines: false }],
      pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });
    worksheet.columns = [
      { header: 'رقم الفاتورة', key: 'invoiceNumber', width: 18 },
      { header: 'التاريخ', key: 'invoiceDate', width: 14 },
      { header: 'تاريخ التحصيل', key: 'latestPaymentDate', width: 16 },
      { header: 'العميل', key: 'customer', width: 28 },
      { header: 'المخزن', key: 'warehouse', width: 22 },
      { header: 'حالة الفاتورة', key: 'documentStatus', width: 16 },
      { header: 'حالة التحصيل', key: 'paymentStatus', width: 18 },
      { header: 'الإجمالي', key: 'totalAmount', width: 16 },
      { header: 'المحصل', key: 'paidAmount', width: 16 },
      { header: 'المتبقي للتحصيل', key: 'remainingAmount', width: 18 },
    ];
    worksheet.spliceRows(1, 0, ['مطعم الجود - تقرير فواتير بيع الجملة']);
    worksheet.mergeCells('A1:J1');
    worksheet.getCell('A1').font = { bold: true, size: 16 };
    invoices.forEach((invoice) => {
      worksheet.addRow({
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        latestPaymentDate: invoice.latestPaymentDate ?? '-',
        customer: invoice.customer?.name ?? '',
        warehouse: invoice.warehouse?.name ?? '',
        documentStatus: this.documentStatusLabel(invoice.documentStatus),
        paymentStatus: this.paymentStatusLabel(invoice.paymentStatus),
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        remainingAmount: invoice.remainingAmount,
      });
    });
    return {
      body: Buffer.from(await workbook.xlsx.writeBuffer()),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: 'wholesale-sales-invoices.xlsx',
    };
  }

  private async exportListPdf(invoices: Array<WholesaleSalesInvoiceEntity & { latestPaymentDate?: string | null }>) {
    const rows = invoices
      .map(
        (invoice) => `<tr>
          <td>${this.escapeHtml(invoice.invoiceNumber)}</td>
          <td>${this.escapeHtml(invoice.invoiceDate)}</td>
          <td>${this.escapeHtml(invoice.customer?.name ?? '')}</td>
          <td>${this.escapeHtml(invoice.warehouse?.name ?? '')}</td>
          <td>${this.documentStatusLabel(invoice.documentStatus)}</td>
          <td>${this.paymentStatusLabel(invoice.paymentStatus)}</td>
          <td>${this.formatPdfMoney(invoice.totalAmount)}</td>
          <td>${this.formatPdfMoney(invoice.remainingAmount)}</td>
        </tr>`,
      )
      .join('');
    const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8" />
      <style>
        body { font-family: Arial, Tahoma, sans-serif; color: #17212b; margin: 0; }
        main { padding: 28px; }
        h1 { color: #14746f; margin: 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 12px; }
        th { background: #14746f; color: #fff; }
        th, td { border: 1px solid #d9e3ec; padding: 8px; text-align: right; }
      </style></head><body><main>
      <h1>مطعم الجود</h1><h2>تقرير فواتير بيع الجملة</h2>
      <table><thead><tr><th>رقم الفاتورة</th><th>التاريخ</th><th>تاريخ التحصيل</th><th>العميل</th><th>المخزن</th><th>حالة الفاتورة</th><th>حالة التحصيل</th><th>الإجمالي</th><th>المتبقي للتحصيل</th></tr></thead>
      <tbody>${rows}</tbody></table></main></body></html>`;
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      return {
        body: Buffer.from(await page.pdf({ format: 'A4', landscape: false, printBackground: true })),
        contentType: 'application/pdf',
        filename: 'wholesale-sales-invoices.pdf',
      };
    } finally {
      await browser.close();
    }
  }

  private async exportInvoicePdf(invoice: WholesaleSalesInvoiceEntity & { stockWarnings?: unknown[] }) {
    this.logger.log(`Preparing wholesale single invoice PDF. invoiceId=${invoice.id}`);
    const rows = (invoice.items ?? [])
      .map(
        (line) => `
          <tr>
            <td>${this.escapeHtml(line.item?.name ?? line.itemId)}</td>
            <td>${this.formatPdfMoney(line.quantity)}</td>
            <td>${this.formatPdfMoney(line.unitPrice)}</td>
            <td>${this.formatPdfMoney(line.lineTotal)}</td>
          </tr>`,
      )
      .join('');
    const html = `<!doctype html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: "Arial", "Tahoma", sans-serif; color: #17212b; margin: 0; }
            .page { padding: 28px; }
            h1 { margin: 0; color: #14746f; font-size: 28px; }
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; margin: 20px 0; }
            .meta div { border: 1px solid #d9e3ec; border-radius: 8px; padding: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th { background: #14746f; color: white; }
            th, td { border: 1px solid #d9e3ec; padding: 10px; text-align: right; }
            .total { margin-top: 18px; display: flex; justify-content: flex-start; font-size: 18px; font-weight: 800; }
          </style>
        </head>
        <body>
          <main class="page">
            <h1>مطعم الجود</h1>
            <h2>فاتورة بيع جملة</h2>
            <section class="meta">
              <div>رقم الفاتورة: ${this.escapeHtml(invoice.invoiceNumber)}</div>
              <div>تاريخ الإنشاء: ${this.escapeHtml(invoice.invoiceDate)}</div>
              <div>العميل: ${this.escapeHtml(invoice.customer?.name ?? '')}</div>
              <div>المخزن: ${this.escapeHtml(invoice.warehouse?.name ?? '')}</div>
              <div>حالة الفاتورة: ${this.documentStatusLabel(invoice.documentStatus)}</div>
              <div>حالة التحصيل: ${this.paymentStatusLabel(invoice.paymentStatus)}</div>
            </section>
            <table>
              <thead><tr><th>المادة</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
            <div class="total">إجمالي الفاتورة: ${this.formatPdfMoney(invoice.totalAmount)}</div>
            ${this.invoicePaymentsHtml(invoice)}
          </main>
        </body>
      </html>`;
    let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
    try {
      this.logger.log(`Before puppeteer launch for wholesale invoice PDF. invoiceId=${invoice.id}`);
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      this.logger.log(`After browser launch for wholesale invoice PDF. invoiceId=${invoice.id}`);
      const page = await browser.newPage();
      this.logger.log(`Before page.setContent for wholesale invoice PDF. invoiceId=${invoice.id}`);
      await page.setContent(html, { waitUntil: 'networkidle0' });
      this.logger.log(`Before page.pdf for wholesale invoice PDF. invoiceId=${invoice.id}`);
      const body = Buffer.from(await page.pdf({ format: 'A4', landscape: false, printBackground: true }));
      return { body, contentType: 'application/pdf', filename: `${invoice.invoiceNumber}.pdf` };
    } catch (error) {
      this.logger.error(
        `Wholesale invoice PDF export failed. invoiceId=${invoice.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('تعذر إنشاء ملف PDF لفاتورة بيع الجملة. تحقق من توفر متصفح Puppeteer داخل بيئة التشغيل.');
    } finally {
      if (browser) await browser.close();
    }
  }

  private documentStatusLabel(status: WholesaleSalesDocumentStatus) {
    return status === WholesaleSalesDocumentStatus.Approved ? 'معتمدة' : status === WholesaleSalesDocumentStatus.Cancelled ? 'ملغاة' : 'مسودة';
  }

  private collectionDestinationLabel(payment: WholesaleSalesPaymentEntity) {
    if (payment.paymentMethod === WholesaleSalesPaymentMethod.Cash) return payment.drawer?.name ? `درج: ${payment.drawer.name}` : 'درج';
    if (payment.paymentMethod === WholesaleSalesPaymentMethod.Vault) return payment.vault?.name ? `خزنة: ${payment.vault.name}` : 'خزنة';
    return payment.bankAccount?.name ? `حساب بنكي: ${payment.bankAccount.name}` : 'حساب بنكي';
  }

  private invoicePaymentsHtml(invoice: WholesaleSalesInvoiceEntity) {
    if (!invoice.payments?.length) return '';
    const rows = invoice.payments
      .map(
        (payment) => `<tr>
          <td>${this.escapeHtml(payment.paymentNumber)}</td>
          <td>${this.escapeHtml(payment.paymentDate)}</td>
          <td>${this.escapeHtml(this.collectionDestinationLabel(payment))}</td>
          <td>${this.formatPdfMoney(payment.amount)}</td>
          <td>${this.escapeHtml(payment.referenceNumber ?? '')}</td>
        </tr>`,
      )
      .join('');
    return `<h3>تحصيلات الفاتورة</h3>
      <table><thead><tr><th>رقم التحصيل</th><th>التاريخ</th><th>الجهة المستلمة</th><th>المبلغ</th><th>المرجع</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  private paymentStatusLabel(status: WholesaleSalesPaymentStatus) {
    return status === WholesaleSalesPaymentStatus.Paid
      ? 'محصلة بالكامل'
      : status === WholesaleSalesPaymentStatus.PartiallyPaid
        ? 'محصلة جزئيًا'
        : 'غير محصلة';
  }

  private escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);
  }

  private formatPdfMoney(value: number | string | null | undefined) {
    return Number(value ?? 0).toFixed(2);
  }

  private optionalText(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private roundMoney(value: number) {
    return Math.round((Number(value ?? 0) + Number.EPSILON) * 100) / 100;
  }
}



