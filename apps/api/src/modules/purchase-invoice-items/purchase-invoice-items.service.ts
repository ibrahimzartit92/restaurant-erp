import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ItemEntity } from '../items/entities/item.entity';
import { PurchaseInvoiceEntity, PurchaseInvoiceStatus } from '../purchase-invoices/entities/purchase-invoice.entity';
import { CreatePurchaseInvoiceItemDto } from './dto/create-purchase-invoice-item.dto';
import { UpdatePurchaseInvoiceItemDto } from './dto/update-purchase-invoice-item.dto';
import { PurchaseInvoiceItemEntity } from './entities/purchase-invoice-item.entity';

@Injectable()
export class PurchaseInvoiceItemsService {
  constructor(
    @InjectRepository(PurchaseInvoiceItemEntity)
    private readonly purchaseInvoiceItemRepository: Repository<PurchaseInvoiceItemEntity>,
    @InjectRepository(PurchaseInvoiceEntity)
    private readonly purchaseInvoiceRepository: Repository<PurchaseInvoiceEntity>,
    @InjectRepository(ItemEntity)
    private readonly itemRepository: Repository<ItemEntity>,
  ) {}

  findAll(purchaseInvoiceId?: string) {
    return this.purchaseInvoiceItemRepository.find({
      where: purchaseInvoiceId ? { purchaseInvoiceId } : undefined,
      order: { createdAt: 'ASC' },
    });
  }

  async findByIdOrFail(id: string) {
    const line = await this.purchaseInvoiceItemRepository.findOne({ where: { id } });

    if (!line) {
      throw new NotFoundException('Purchase invoice item was not found.');
    }

    return line;
  }

  async create(createPurchaseInvoiceItemDto: CreatePurchaseInvoiceItemDto) {
    await this.ensureInvoiceExists(createPurchaseInvoiceItemDto.purchaseInvoiceId);
    await this.ensureItemExists(createPurchaseInvoiceItemDto.itemId);

    const line = this.purchaseInvoiceItemRepository.create({
      ...createPurchaseInvoiceItemDto,
      lineTotal:
        createPurchaseInvoiceItemDto.lineTotal ??
        this.roundMoney(createPurchaseInvoiceItemDto.quantity * createPurchaseInvoiceItemDto.unitPrice),
      notes: createPurchaseInvoiceItemDto.notes ?? null,
    });

    const savedLine = await this.purchaseInvoiceItemRepository.save(line);
    await this.recalculateInvoiceTotals(savedLine.purchaseInvoiceId);

    return this.findByIdOrFail(savedLine.id);
  }

  async update(id: string, updatePurchaseInvoiceItemDto: UpdatePurchaseInvoiceItemDto) {
    const line = await this.findByIdOrFail(id);

    if (updatePurchaseInvoiceItemDto.itemId) {
      await this.ensureItemExists(updatePurchaseInvoiceItemDto.itemId);
    }

    Object.assign(line, updatePurchaseInvoiceItemDto);

    if (
      updatePurchaseInvoiceItemDto.lineTotal === undefined &&
      (updatePurchaseInvoiceItemDto.quantity !== undefined || updatePurchaseInvoiceItemDto.unitPrice !== undefined)
    ) {
      line.lineTotal = this.roundMoney(line.quantity * line.unitPrice);
    }

    const savedLine = await this.purchaseInvoiceItemRepository.save(line);
    await this.recalculateInvoiceTotals(savedLine.purchaseInvoiceId);

    return this.findByIdOrFail(savedLine.id);
  }

  async remove(id: string) {
    const line = await this.findByIdOrFail(id);
    const purchaseInvoiceId = line.purchaseInvoiceId;
    await this.purchaseInvoiceItemRepository.remove(line);
    await this.recalculateInvoiceTotals(purchaseInvoiceId);

    return { id };
  }

  private async ensureInvoiceExists(id: string) {
    const invoice = await this.purchaseInvoiceRepository.findOne({ where: { id } });

    if (!invoice) {
      throw new NotFoundException('Purchase invoice was not found.');
    }
  }

  private async ensureItemExists(id: string) {
    const item = await this.itemRepository.findOne({ where: { id } });

    if (!item) {
      throw new NotFoundException('Item was not found.');
    }
  }

  private async recalculateInvoiceTotals(purchaseInvoiceId: string) {
    const invoice = await this.purchaseInvoiceRepository.findOneOrFail({ where: { id: purchaseInvoiceId } });
    const lines = await this.purchaseInvoiceItemRepository.find({ where: { purchaseInvoiceId } });

    invoice.subtotalAmount = this.roundMoney(lines.reduce((sum, line) => sum + line.lineTotal, 0));
    invoice.totalAmount = this.roundMoney(Math.max(invoice.subtotalAmount - invoice.discountAmount, 0));
    invoice.remainingAmount = this.roundMoney(invoice.totalAmount - invoice.paidAmount);

    if (invoice.status !== PurchaseInvoiceStatus.Cancelled) {
      invoice.status = this.resolveInvoiceStatus(invoice.totalAmount, invoice.paidAmount);
    }

    await this.purchaseInvoiceRepository.save(invoice);
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
