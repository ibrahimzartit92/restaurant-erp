import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BankAccountEntity } from '../bank-accounts/entities/bank-account.entity';
import { BranchEntity } from '../branches/entities/branch.entity';
import { DrawerEntity } from '../drawers/entities/drawer.entity';
import { PurchaseInvoiceEntity, PurchaseInvoiceStatus } from '../purchase-invoices/entities/purchase-invoice.entity';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { UpdateSupplierPaymentDto } from './dto/update-supplier-payment.dto';
import { SupplierPaymentEntity, SupplierPaymentMethod } from './entities/supplier-payment.entity';

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
  ) {}

  findAll(purchaseInvoiceId?: string, branchId?: string) {
    return this.supplierPaymentRepository.find({
      where: {
        ...(purchaseInvoiceId ? { purchaseInvoiceId } : {}),
        ...(branchId ? { branchId } : {}),
      },
      order: { paymentDate: 'DESC', paymentNumber: 'DESC' },
    });
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
        amount: createSupplierPaymentDto.amount,
        referenceNumber: createSupplierPaymentDto.referenceNumber ?? null,
        notes: createSupplierPaymentDto.notes ?? null,
      });

      const savedPayment = await paymentRepository.save(payment);
      await this.recalculateInvoicePaymentState(
        purchaseInvoiceId,
        invoiceRepository,
        paymentRepository,
      );

      return paymentRepository.findOneOrFail({ where: { id: savedPayment.id } });
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

    const savedPayment = await this.supplierPaymentRepository.save(payment);
    await this.recalculateInvoicePaymentState(payment.purchaseInvoiceId);

    return this.findByIdOrFail(savedPayment.id);
  }

  async remove(id: string) {
    const payment = await this.findByIdOrFail(id);
    const purchaseInvoiceId = payment.purchaseInvoiceId;
    await this.supplierPaymentRepository.remove(payment);
    await this.recalculateInvoicePaymentState(purchaseInvoiceId);

    return { id };
  }

  private async validatePaymentReferences(data: {
    purchaseInvoiceId?: string;
    branchId: string;
    paymentMethod: SupplierPaymentMethod;
    drawerId?: string | null;
    bankAccountId?: string | null;
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

  private async generatePaymentNumber() {
    const today = new Date();
    const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.supplierPaymentRepository.count();

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
}
