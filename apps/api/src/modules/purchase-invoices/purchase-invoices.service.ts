import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BranchEntity } from '../branches/entities/branch.entity';
import { ItemEntity } from '../items/entities/item.entity';
import { PurchaseInvoiceItemEntity } from '../purchase-invoice-items/entities/purchase-invoice-item.entity';
import { SupplierRepresentativeEntity } from '../supplier-representatives/entities/supplier-representative.entity';
import { SupplierEntity } from '../suppliers/entities/supplier.entity';
import { WarehouseEntity } from '../warehouses/entities/warehouse.entity';
import { CreatePurchaseInvoiceDto } from './dto/create-purchase-invoice.dto';
import { UpdatePurchaseInvoiceDto } from './dto/update-purchase-invoice.dto';
import { PurchaseInvoiceEntity, PurchaseInvoiceStatus } from './entities/purchase-invoice.entity';

type PurchaseInvoiceFilters = {
  branchId?: string;
  supplierId?: string;
  status?: PurchaseInvoiceStatus;
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
  ) {}

  findAll(filters: PurchaseInvoiceFilters) {
    const query = this.purchaseInvoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.branch', 'branch')
      .leftJoinAndSelect('invoice.warehouse', 'warehouse')
      .leftJoinAndSelect('invoice.supplier', 'supplier')
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
        items: { item: true },
        payments: { branch: true, drawer: true, bankAccount: true },
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

      await itemRepository.save(lines);

      return invoiceRepository.findOneOrFail({
        where: { id: savedInvoice.id },
        relations: {
          items: { item: true },
          payments: { branch: true, drawer: true, bankAccount: true },
        },
      });
    });
  }

  async update(id: string, updatePurchaseInvoiceDto: UpdatePurchaseInvoiceDto) {
    const invoice = await this.findByIdOrFail(id);
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

    Object.assign(invoice, {
      ...updatePurchaseInvoiceDto,
      invoiceNumber: updatePurchaseInvoiceDto.invoiceNumber?.toUpperCase() ?? invoice.invoiceNumber,
      supplierId: nextSupplierId,
      supplierRepresentativeId: nextSupplierRepresentativeId,
    });

    if (updatePurchaseInvoiceDto.supplierId === null) {
      invoice.isMiscellaneous = true;
    }

    const totalAmount =
      updatePurchaseInvoiceDto.discountAmount === undefined
        ? invoice.totalAmount
        : this.roundMoney(Math.max(invoice.subtotalAmount - updatePurchaseInvoiceDto.discountAmount, 0));

    invoice.totalAmount = totalAmount;

    if (invoice.paidAmount > invoice.totalAmount) {
      throw new BadRequestException('Paid amount cannot be greater than the invoice total.');
    }

    invoice.remainingAmount = this.roundMoney(totalAmount - invoice.paidAmount);
    invoice.status = updatePurchaseInvoiceDto.status ?? this.resolveInvoiceStatus(totalAmount, invoice.paidAmount);

    return this.purchaseInvoiceRepository.save(invoice);
  }

  async remove(id: string) {
    const invoice = await this.findByIdOrFail(id);
    await this.purchaseInvoiceRepository.remove(invoice);

    return { id };
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
