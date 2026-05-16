import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BranchEntity } from '../branches/entities/branch.entity';
import { DailySalesClosingService, DailySalesClosingOperationChange } from '../daily-sales/daily-sales-closing.service';
import { ItemEntity } from '../items/entities/item.entity';
import { PurchaseInvoiceItemEntity } from '../purchase-invoice-items/entities/purchase-invoice-item.entity';
import { SupplierRepresentativeEntity } from '../supplier-representatives/entities/supplier-representative.entity';
import { SupplierPaymentsService } from '../supplier-payments/supplier-payments.service';
import { StockMovementType } from '../stock-movements/entities/stock-movement.entity';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import { SupplierEntity } from '../suppliers/entities/supplier.entity';
import { WarehouseEntity } from '../warehouses/entities/warehouse.entity';
import { CreatePurchaseInvoiceDto } from './dto/create-purchase-invoice.dto';
import { UpdatePurchaseInvoiceDto } from './dto/update-purchase-invoice.dto';
import {
  PurchaseInvoiceApprovalLogEntry,
  PurchaseInvoiceApprovalSnapshot,
  PurchaseInvoiceEntity,
  PurchaseInvoiceStatus,
} from './entities/purchase-invoice.entity';

type PurchaseInvoiceFilters = {
  branchId?: string;
  supplierId?: string;
  status?: PurchaseInvoiceStatus;
  categoryId?: string;
  invoiceDateFrom?: string;
  invoiceDateTo?: string;
  search?: string;
};

@Injectable()
export class PurchaseInvoicesService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(PurchaseInvoiceEntity)
    private readonly purchaseInvoiceRepository: Repository<PurchaseInvoiceEntity>,
    @InjectRepository(BranchEntity)
    private readonly branchRepository: Repository<BranchEntity>,
    @InjectRepository(WarehouseEntity)
    private readonly warehouseRepository: Repository<WarehouseEntity>,
    @InjectRepository(SupplierEntity)
    private readonly supplierRepository: Repository<SupplierEntity>,
    @InjectRepository(SupplierRepresentativeEntity)
    private readonly supplierRepresentativeRepository: Repository<SupplierRepresentativeEntity>,
    @InjectRepository(ItemEntity)
    private readonly itemRepository: Repository<ItemEntity>,
    private readonly supplierPaymentsService: SupplierPaymentsService,
    private readonly stockMovementsService: StockMovementsService,
    private readonly dailySalesClosingService: DailySalesClosingService,
  ) {}

  findAll(filters: PurchaseInvoiceFilters) {
    const query = this.purchaseInvoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.branch', 'branch')
      .leftJoinAndSelect('invoice.warehouse', 'warehouse')
      .leftJoinAndSelect('invoice.supplier', 'supplier')
      .leftJoinAndSelect('invoice.items', 'invoiceItem')
      .leftJoinAndSelect('invoiceItem.item', 'item')
      .leftJoinAndSelect('item.category', 'itemCategory')
      .leftJoinAndSelect('invoice.supplierRepresentative', 'supplierRepresentative')
      .orderBy('invoice.invoiceDate', 'DESC')
      .addOrderBy('invoice.invoiceNumber', 'DESC');

    if (filters.branchId) {
      query.andWhere('invoice.branch_id = :branchId', { branchId: filters.branchId });
    }

    if (filters.supplierId) {
      query.andWhere('invoice.supplier_id = :supplierId', { supplierId: filters.supplierId });
    }

    if (filters.status) {
      query.andWhere('invoice.status = :status', { status: filters.status });
    }

    if (filters.categoryId) {
      query.andWhere('item.category_id = :categoryId', { categoryId: filters.categoryId });
    }

    if (filters.invoiceDateFrom) {
      query.andWhere('invoice.invoice_date >= :invoiceDateFrom', {
        invoiceDateFrom: filters.invoiceDateFrom,
      });
    }

    if (filters.invoiceDateTo) {
      query.andWhere('invoice.invoice_date <= :invoiceDateTo', {
        invoiceDateTo: filters.invoiceDateTo,
      });
    }

    const search = filters.search?.trim();
    if (search) {
      query.andWhere('(invoice.invoice_number ILIKE :search OR invoice.invoice_label ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    return query.getMany();
  }

  async findByIdOrFail(id: string) {
    const invoice = await this.purchaseInvoiceRepository.findOne({ where: { id } });

    if (!invoice) {
      throw new NotFoundException('Purchase invoice was not found.');
    }

    return invoice;
  }

  async findDetails(id: string) {
    const invoice = await this.purchaseInvoiceRepository.findOne({
      where: { id },
      relations: {
        branch: true,
        warehouse: true,
        supplier: true,
        supplierRepresentative: true,
        items: { item: true },
        payments: { branch: true, drawer: true, bankAccount: true, vault: true },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Purchase invoice was not found.');
    }

    return invoice;
  }

  async create(createPurchaseInvoiceDto: CreatePurchaseInvoiceDto) {
    await this.ensureCodeIsAvailable(createPurchaseInvoiceDto.invoiceNumber);
    await this.validateHeaderReferences(createPurchaseInvoiceDto);
    await this.validateInvoiceItems(createPurchaseInvoiceDto.items.map((item) => item.itemId));

    const invoiceNumber =
      createPurchaseInvoiceDto.invoiceNumber?.toUpperCase() ?? (await this.generateInvoiceNumber());
    const subtotalAmount = this.roundMoney(
      createPurchaseInvoiceDto.items.reduce(
        (sum, item) => sum + (item.lineTotal ?? item.quantity * item.unitPrice),
        0,
      ),
    );
    const discountAmount = createPurchaseInvoiceDto.discountAmount ?? 0;
    const totalAmount = this.roundMoney(Math.max(subtotalAmount - discountAmount, 0));
    const paidAmount = createPurchaseInvoiceDto.paidAmount ?? 0;

    if (paidAmount > totalAmount) {
      throw new BadRequestException('Paid amount cannot be greater than the invoice total.');
    }

    const isMiscellaneous = createPurchaseInvoiceDto.supplierId
      ? (createPurchaseInvoiceDto.isMiscellaneous ?? false)
      : true;

    return this.dataSource.transaction(async (manager) => {
      const invoiceRepository = manager.getRepository(PurchaseInvoiceEntity);
      const itemRepository = manager.getRepository(PurchaseInvoiceItemEntity);

      const invoice = invoiceRepository.create({
        invoiceNumber,
        invoiceLabel: createPurchaseInvoiceDto.invoiceLabel ?? null,
        branchId: createPurchaseInvoiceDto.branchId,
        warehouseId: createPurchaseInvoiceDto.warehouseId,
        supplierId: createPurchaseInvoiceDto.supplierId ?? null,
        supplierRepresentativeId: createPurchaseInvoiceDto.supplierRepresentativeId ?? null,
        invoiceDate: createPurchaseInvoiceDto.invoiceDate,
        status: createPurchaseInvoiceDto.status ?? this.resolveInvoiceStatus(totalAmount, paidAmount),
        subtotalAmount,
        discountAmount,
        totalAmount,
        paidAmount,
        remainingAmount: this.roundMoney(totalAmount - paidAmount),
        isMiscellaneous,
        dueDate: createPurchaseInvoiceDto.dueDate ?? null,
        lastPaymentDate: null,
        notes: createPurchaseInvoiceDto.notes ?? null,
      });

      const savedInvoice = await invoiceRepository.save(invoice);

      const lines = createPurchaseInvoiceDto.items.map((line) =>
        itemRepository.create({
          purchaseInvoiceId: savedInvoice.id,
          itemId: line.itemId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineTotal: this.roundMoney(line.lineTotal ?? line.quantity * line.unitPrice),
          notes: line.notes ?? null,
        }),
      );

      const savedLines = await itemRepository.save(lines);
      savedInvoice.approvedSnapshot = this.isApprovedStatus(savedInvoice.status)
        ? this.toApprovalSnapshot(savedInvoice, savedLines)
        : null;
      await invoiceRepository.save(savedInvoice);
      await this.stockMovementsService.replaceSourceMovements(
        'purchase_invoice',
        savedInvoice.id,
        savedLines.map((line) => ({
          movementDate: savedInvoice.invoiceDate,
          warehouseId: savedInvoice.warehouseId,
          itemId: line.itemId,
          unitId: null,
          movementType: StockMovementType.PurchaseIn,
          quantityIn: line.quantity,
          sourceType: 'purchase_invoice',
          sourceId: savedInvoice.id,
          sourceLineId: line.id,
          referenceNumber: savedInvoice.invoiceNumber,
          notes: savedInvoice.notes,
        })),
        manager,
      );
      await this.dailySalesClosingService.recordPostCloseChanges(this.invoiceClosingChanges(savedInvoice, 'created'), manager);

      return invoiceRepository.findOneOrFail({
        where: { id: savedInvoice.id },
        relations: {
          items: { item: true },
          payments: { branch: true, drawer: true, bankAccount: true, vault: true },
        },
      });
    });
  }

  async update(id: string, updatePurchaseInvoiceDto: UpdatePurchaseInvoiceDto) {
    const invoice = await this.purchaseInvoiceRepository.findOne({
      where: { id },
      relations: { items: true, payments: true },
    });
    if (!invoice) {
      throw new NotFoundException('Purchase invoice was not found.');
    }
    if (!this.canEditInvoice(invoice.status)) {
      throw new BadRequestException('لا يمكن تعديل فاتورة شراء معتمدة مباشرة. استخدم إجراء إعادة فتح للتعديل ثم أعد اعتمادها.');
    }
    const previousClosingChanges = this.invoiceClosingChanges(invoice, 'edited');
    await this.ensureCodeIsAvailable(updatePurchaseInvoiceDto.invoiceNumber, id);
    const nextSupplierId =
      updatePurchaseInvoiceDto.supplierId === undefined ? invoice.supplierId : updatePurchaseInvoiceDto.supplierId;
    const nextSupplierRepresentativeId =
      nextSupplierId === null
        ? null
        : updatePurchaseInvoiceDto.supplierRepresentativeId === undefined
          ? invoice.supplierRepresentativeId
          : updatePurchaseInvoiceDto.supplierRepresentativeId;

    await this.validateHeaderReferences({
      branchId: updatePurchaseInvoiceDto.branchId ?? invoice.branchId,
      warehouseId: updatePurchaseInvoiceDto.warehouseId ?? invoice.warehouseId,
      supplierId: nextSupplierId,
      supplierRepresentativeId: nextSupplierRepresentativeId,
    });

    const items = updatePurchaseInvoiceDto.items;
    const headerPatch = { ...updatePurchaseInvoiceDto };
    delete headerPatch.items;

    Object.assign(invoice, {
      ...headerPatch,
      invoiceNumber: updatePurchaseInvoiceDto.invoiceNumber?.toUpperCase() ?? invoice.invoiceNumber,
      supplierId: nextSupplierId,
      supplierRepresentativeId: nextSupplierRepresentativeId,
    });

    if (updatePurchaseInvoiceDto.supplierId === null) {
      invoice.isMiscellaneous = true;
    }

    if (items) {
      await this.validateInvoiceItems(items.map((item) => item.itemId));
      invoice.subtotalAmount = this.calculateSubtotal(items);
    }

    const discountAmount = updatePurchaseInvoiceDto.discountAmount ?? invoice.discountAmount;
    const totalAmount = this.roundMoney(Math.max(invoice.subtotalAmount - discountAmount, 0));
    invoice.discountAmount = discountAmount;
    invoice.totalAmount = totalAmount;

    if (invoice.status !== PurchaseInvoiceStatus.Reopened && invoice.paidAmount > invoice.totalAmount) {
      throw new BadRequestException('إجمالي الفاتورة بعد التعديل أقل من المبلغ المدفوع فعليًا. لا يمكن إعادة الاعتماد قبل معالجة الفرق محاسبيًا.');
    }

    invoice.remainingAmount = this.roundMoney(totalAmount - invoice.paidAmount);
    invoice.status =
      invoice.status === PurchaseInvoiceStatus.Reopened
        ? PurchaseInvoiceStatus.Reopened
        : updatePurchaseInvoiceDto.status ?? this.resolveInvoiceStatus(totalAmount, invoice.paidAmount);

    return this.dataSource.transaction(async (manager) => {
      const invoiceRepository = manager.getRepository(PurchaseInvoiceEntity);
      const itemRepository = manager.getRepository(PurchaseInvoiceItemEntity);
      const saved = await invoiceRepository.save(invoice);

      if (items) {
        await itemRepository.delete({ purchaseInvoiceId: id });
        const savedLines = await itemRepository.save(
          items.map((line) =>
            itemRepository.create({
              purchaseInvoiceId: id,
              itemId: line.itemId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              lineTotal: this.roundMoney(line.lineTotal ?? line.quantity * line.unitPrice),
              notes: line.notes ?? null,
            }),
          ),
        );

        if (saved.status !== PurchaseInvoiceStatus.Reopened) {
          await this.replaceApprovedStockMovements(saved, savedLines, manager);
        }
      }

      if (saved.status !== PurchaseInvoiceStatus.Reopened) {
        await this.dailySalesClosingService.recordPostCloseChanges(
          [...previousClosingChanges, ...this.invoiceClosingChanges(saved, 'edited')],
          manager,
        );
      }

      return invoiceRepository.findOneOrFail({
        where: { id },
        relations: {
          items: { item: true },
          payments: { branch: true, drawer: true, bankAccount: true, vault: true },
        },
      });
    });
  }

  async reopenForEditing(id: string) {
    return this.dataSource.transaction(async (manager) => {
      const invoiceRepository = manager.getRepository(PurchaseInvoiceEntity);
      const invoice = await invoiceRepository.findOne({ where: { id }, relations: { items: true } });
      if (!invoice) {
        throw new NotFoundException('Purchase invoice was not found.');
      }
      if (!this.isApprovedStatus(invoice.status)) {
        throw new BadRequestException('يمكن إعادة فتح فواتير الشراء المعتمدة فقط للتعديل.');
      }

      const snapshot = this.toApprovalSnapshot(invoice, invoice.items ?? []);
      invoice.approvedSnapshot = snapshot;
      invoice.status = PurchaseInvoiceStatus.Reopened;
      invoice.approvalModificationLog = [
        this.buildApprovalLogEntry('reopened', invoice.invoiceNumber, [
          { field: 'status', label: 'الحالة', oldValue: this.statusLabel(snapshot.status), newValue: 'مفتوحة للتعديل' },
        ]),
        ...(invoice.approvalModificationLog ?? []),
      ];
      return invoiceRepository.save(invoice);
    });
  }

  async reapprove(id: string) {
    return this.dataSource.transaction(async (manager) => {
      const invoiceRepository = manager.getRepository(PurchaseInvoiceEntity);
      const invoice = await invoiceRepository.findOne({
        where: { id },
        relations: { items: true, payments: true },
      });
      if (!invoice) {
        throw new NotFoundException('Purchase invoice was not found.');
      }
      if (invoice.status !== PurchaseInvoiceStatus.Reopened) {
        throw new BadRequestException('الفاتورة ليست في حالة إعادة فتح للتعديل.');
      }

      const paidAmount = this.roundMoney(
        (invoice.payments ?? []).reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0),
      );
      if (invoice.totalAmount < paidAmount) {
        throw new BadRequestException('إجمالي الفاتورة بعد التعديل أقل من المبلغ المدفوع فعليًا. لا يمكن إعادة الاعتماد دون معالجة محاسبية صحيحة.');
      }

      const oldSnapshot = invoice.approvedSnapshot;
      const oldClosingChanges = oldSnapshot ? this.snapshotClosingChanges(id, oldSnapshot, 'edited') : [];
      invoice.paidAmount = paidAmount;
      invoice.remainingAmount = this.roundMoney(invoice.totalAmount - paidAmount);
      invoice.lastPaymentDate =
        (invoice.payments ?? [])
          .map((payment) => payment.paymentDate)
          .sort()
          .at(-1) ?? null;
      invoice.status = this.resolveInvoiceStatus(invoice.totalAmount, paidAmount);
      invoice.modifiedAfterApproval = true;
      invoice.approvalRevision = Number(invoice.approvalRevision ?? 0) + 1;

      await this.replaceApprovedStockMovements(invoice, invoice.items ?? [], manager);
      await this.supplierPaymentsService.reapplyPaymentsForInvoiceBranch(invoice.id, invoice.branchId, manager);

      const newSnapshot = this.toApprovalSnapshot(invoice, invoice.items ?? []);
      invoice.approvalModificationLog = [
        this.buildApprovalLogEntry('reapproved', invoice.invoiceNumber, this.diffApprovalSnapshots(oldSnapshot, newSnapshot)),
        ...(invoice.approvalModificationLog ?? []),
      ].slice(0, 50);
      invoice.approvedSnapshot = newSnapshot;

      const saved = await invoiceRepository.save(invoice);
      await this.dailySalesClosingService.recordPostCloseChanges(
        [...oldClosingChanges, ...this.invoiceClosingChanges(saved, 'edited')],
        manager,
      );

      return invoiceRepository.findOneOrFail({
        where: { id },
        relations: {
          items: { item: true },
          payments: { branch: true, drawer: true, bankAccount: true, vault: true },
        },
      });
    });
  }

  async remove(id: string) {
    const invoice = await this.findDetails(id);

    if (invoice.payments.length > 0 || invoice.paidAmount > 0) {
      throw new BadRequestException('لا يمكن حذف فاتورة شراء عليها دفعات. استخدم إلغاء الفاتورة بدلا من الحذف.');
    }

    await this.dataSource.transaction(async (manager) => {
      await this.stockMovementsService.replaceSourceMovements('purchase_invoice', invoice.id, [], manager);
      await manager.getRepository(PurchaseInvoiceItemEntity).delete({ purchaseInvoiceId: invoice.id });
      await manager.getRepository(PurchaseInvoiceEntity).remove(invoice);
      await this.dailySalesClosingService.recordPostCloseChanges(this.invoiceClosingChanges(invoice, 'deleted'), manager);
    });

    return { id };
  }

  async cancel(id: string, vaultId?: string | null) {
    return this.dataSource.transaction(async (manager) => {
      const invoiceRepository = manager.getRepository(PurchaseInvoiceEntity);
      const invoice = await invoiceRepository.findOne({
        where: { id },
        relations: { payments: true },
      });

      if (!invoice) {
        throw new NotFoundException('Purchase invoice was not found.');
      }

      if (invoice.status === PurchaseInvoiceStatus.Cancelled) {
        return invoice;
      }

      if (invoice.payments.length > 0 || invoice.paidAmount > 0) {
        await this.supplierPaymentsService.reversePaymentsForInvoice(invoice.id, manager, vaultId);
      }

      await this.stockMovementsService.replaceSourceMovements('purchase_invoice', invoice.id, [], manager);
      invoice.status = PurchaseInvoiceStatus.Cancelled;
      invoice.remainingAmount = 0;
      await this.dailySalesClosingService.recordPostCloseChanges(this.invoiceClosingChanges(invoice, 'cancelled'), manager);

      return invoiceRepository.save(invoice);
    });
  }

  private invoiceClosingChanges(
    invoice: PurchaseInvoiceEntity,
    actionType: DailySalesClosingOperationChange['actionType'],
  ): DailySalesClosingOperationChange[] {
    return [
      {
        branchId: invoice.branchId,
        effectiveDate: invoice.invoiceDate,
        operationType: 'purchase_invoice',
        actionType,
        amount: Number(invoice.totalAmount ?? 0),
        reference: invoice.invoiceNumber,
        operationId: invoice.id,
      },
    ];
  }

  private snapshotClosingChanges(
    invoiceId: string,
    snapshot: PurchaseInvoiceApprovalSnapshot,
    actionType: DailySalesClosingOperationChange['actionType'],
  ): DailySalesClosingOperationChange[] {
    return [
      {
        branchId: snapshot.branchId,
        effectiveDate: snapshot.invoiceDate,
        operationType: 'purchase_invoice',
        actionType,
        amount: Number(snapshot.totalAmount ?? 0),
        reference: snapshot.invoiceNumber,
        operationId: invoiceId,
      },
    ];
  }

  private canEditInvoice(status: PurchaseInvoiceStatus) {
    return status === PurchaseInvoiceStatus.Draft || status === PurchaseInvoiceStatus.Reopened;
  }

  private isApprovedStatus(status: PurchaseInvoiceStatus) {
    return [
      PurchaseInvoiceStatus.Open,
      PurchaseInvoiceStatus.PartiallyPaid,
      PurchaseInvoiceStatus.Paid,
    ].includes(status);
  }

  private calculateSubtotal(items: { quantity: number; unitPrice: number; lineTotal?: number }[]) {
    return this.roundMoney(
      items.reduce((sum, item) => sum + Number(item.lineTotal ?? item.quantity * item.unitPrice), 0),
    );
  }

  private async replaceApprovedStockMovements(
    invoice: Pick<PurchaseInvoiceEntity, 'id' | 'invoiceDate' | 'warehouseId' | 'invoiceNumber' | 'notes'>,
    lines: Pick<PurchaseInvoiceItemEntity, 'id' | 'itemId' | 'quantity'>[],
    manager = this.dataSource.manager,
  ) {
    await this.stockMovementsService.replaceSourceMovements(
      'purchase_invoice',
      invoice.id,
      lines.map((line) => ({
        movementDate: invoice.invoiceDate,
        warehouseId: invoice.warehouseId,
        itemId: line.itemId,
        unitId: null,
        movementType: StockMovementType.PurchaseIn,
        quantityIn: Number(line.quantity),
        sourceType: 'purchase_invoice',
        sourceId: invoice.id,
        sourceLineId: line.id,
        referenceNumber: invoice.invoiceNumber,
        notes: invoice.notes,
      })),
      manager,
    );
  }

  private toApprovalSnapshot(
    invoice: PurchaseInvoiceEntity,
    items: Pick<PurchaseInvoiceItemEntity, 'id' | 'itemId' | 'quantity' | 'unitPrice' | 'lineTotal' | 'notes'>[],
  ): PurchaseInvoiceApprovalSnapshot {
    return {
      invoiceNumber: invoice.invoiceNumber,
      invoiceLabel: invoice.invoiceLabel,
      branchId: invoice.branchId,
      warehouseId: invoice.warehouseId,
      supplierId: invoice.supplierId,
      supplierRepresentativeId: invoice.supplierRepresentativeId,
      invoiceDate: invoice.invoiceDate,
      status: invoice.status,
      subtotalAmount: Number(invoice.subtotalAmount ?? 0),
      discountAmount: Number(invoice.discountAmount ?? 0),
      totalAmount: Number(invoice.totalAmount ?? 0),
      paidAmount: Number(invoice.paidAmount ?? 0),
      remainingAmount: Number(invoice.remainingAmount ?? 0),
      isMiscellaneous: invoice.isMiscellaneous,
      dueDate: invoice.dueDate,
      lastPaymentDate: invoice.lastPaymentDate,
      notes: invoice.notes,
      items: items.map((item) => ({
        id: item.id,
        itemId: item.itemId,
        quantity: Number(item.quantity ?? 0),
        unitPrice: Number(item.unitPrice ?? 0),
        lineTotal: Number(item.lineTotal ?? 0),
        notes: item.notes ?? null,
      })),
    };
  }

  private buildApprovalLogEntry(
    actionType: PurchaseInvoiceApprovalLogEntry['actionType'],
    reference: string,
    changes: PurchaseInvoiceApprovalLogEntry['changes'],
  ): PurchaseInvoiceApprovalLogEntry {
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      actionType,
      recordedAt: new Date().toISOString(),
      reference,
      user: null,
      changes,
    };
  }

  private diffApprovalSnapshots(
    oldSnapshot: PurchaseInvoiceApprovalSnapshot | null,
    newSnapshot: PurchaseInvoiceApprovalSnapshot,
  ): PurchaseInvoiceApprovalLogEntry['changes'] {
    if (!oldSnapshot) {
      return [{ field: 'approval', label: 'إعادة الاعتماد', oldValue: null, newValue: newSnapshot.totalAmount }];
    }

    const changes: PurchaseInvoiceApprovalLogEntry['changes'] = [];
    const push = (field: string, label: string, oldValue: string | number | null, newValue: string | number | null) => {
      if (String(oldValue ?? '') !== String(newValue ?? '')) {
        changes.push({ field, label, oldValue, newValue });
      }
    };

    push('invoiceDate', 'تاريخ الفاتورة', oldSnapshot.invoiceDate, newSnapshot.invoiceDate);
    push('branchId', 'الفرع', oldSnapshot.branchId, newSnapshot.branchId);
    push('warehouseId', 'المخزن', oldSnapshot.warehouseId, newSnapshot.warehouseId);
    push('supplierId', 'المورد', oldSnapshot.supplierId, newSnapshot.supplierId);
    push('invoiceLabel', 'الوصف', oldSnapshot.invoiceLabel, newSnapshot.invoiceLabel);
    push('subtotalAmount', 'الإجمالي قبل الخصم', oldSnapshot.subtotalAmount, newSnapshot.subtotalAmount);
    push('discountAmount', 'الخصم', oldSnapshot.discountAmount, newSnapshot.discountAmount);
    push('totalAmount', 'إجمالي الفاتورة', oldSnapshot.totalAmount, newSnapshot.totalAmount);
    push('paidAmount', 'المدفوع', oldSnapshot.paidAmount, newSnapshot.paidAmount);
    push('remainingAmount', 'المتبقي', oldSnapshot.remainingAmount, newSnapshot.remainingAmount);
    push('dueDate', 'تاريخ الاستحقاق', oldSnapshot.dueDate, newSnapshot.dueDate);
    push('items', 'مواد الفاتورة', this.itemsSummary(oldSnapshot), this.itemsSummary(newSnapshot));

    return changes.length > 0
      ? changes
      : [{ field: 'approval', label: 'إعادة الاعتماد', oldValue: 'بدون تغيير جوهري', newValue: 'تمت إعادة الاعتماد' }];
  }

  private itemsSummary(snapshot: PurchaseInvoiceApprovalSnapshot) {
    const quantity = this.roundMoney(snapshot.items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0));
    return `${snapshot.items.length} مادة / كمية ${quantity}`;
  }

  private statusLabel(status: PurchaseInvoiceStatus) {
    if (status === PurchaseInvoiceStatus.Draft) return 'مسودة';
    if (status === PurchaseInvoiceStatus.Open) return 'مفتوحة';
    if (status === PurchaseInvoiceStatus.PartiallyPaid) return 'مدفوعة جزئيًا';
    if (status === PurchaseInvoiceStatus.Paid) return 'مدفوعة';
    if (status === PurchaseInvoiceStatus.Reopened) return 'مفتوحة للتعديل';
    return 'ملغاة';
  }

  private async validateHeaderReferences(data: {
    branchId: string;
    warehouseId: string;
    supplierId?: string | null;
    supplierRepresentativeId?: string | null;
  }) {
    const [branch, warehouse] = await Promise.all([
      this.branchRepository.findOne({ where: { id: data.branchId } }),
      this.warehouseRepository.findOne({ where: { id: data.warehouseId } }),
    ]);

    if (!branch) {
      throw new NotFoundException('Branch was not found.');
    }

    if (!warehouse) {
      throw new NotFoundException('Warehouse was not found.');
    }

    if (!data.supplierId && data.supplierRepresentativeId) {
      throw new BadRequestException('A supplier representative requires a supplier.');
    }

    if (data.supplierId) {
      const supplier = await this.supplierRepository.findOne({ where: { id: data.supplierId } });

      if (!supplier) {
        throw new NotFoundException('Supplier was not found.');
      }
    }

    if (data.supplierRepresentativeId) {
      const representative = await this.supplierRepresentativeRepository.findOne({
        where: { id: data.supplierRepresentativeId },
      });

      if (!representative) {
        throw new NotFoundException('Supplier representative was not found.');
      }

      if (representative.supplierId !== data.supplierId) {
        throw new BadRequestException('Supplier representative does not belong to the selected supplier.');
      }
    }
  }

  private async validateInvoiceItems(itemIds: string[]) {
    const foundItems = await this.itemRepository.find({
      where: itemIds.map((id) => ({ id })),
      select: { id: true },
    });

    if (foundItems.length !== new Set(itemIds).size) {
      throw new NotFoundException('One or more invoice items were not found.');
    }
  }

  private async ensureCodeIsAvailable(invoiceNumber?: string, currentId?: string) {
    if (!invoiceNumber) {
      return;
    }

    const existingInvoice = await this.purchaseInvoiceRepository.findOne({
      where: { invoiceNumber: invoiceNumber.toUpperCase() },
    });

    if (existingInvoice && existingInvoice.id !== currentId) {
      throw new ConflictException('A purchase invoice with this number already exists.');
    }
  }

  private async generateInvoiceNumber() {
    const today = new Date();
    const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.purchaseInvoiceRepository.count();

    return `PI-${yyyymmdd}-${String(count + 1).padStart(5, '0')}`;
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
}
