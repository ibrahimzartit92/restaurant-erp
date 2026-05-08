import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WholesaleSalesInvoiceEntity } from '../wholesale-sales/entities/wholesale-sales-invoice.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerEntity } from './entities/customer.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
    @InjectRepository(WholesaleSalesInvoiceEntity)
    private readonly invoiceRepository: Repository<WholesaleSalesInvoiceEntity>,
  ) {}

  findAll(filters: { search?: string; active?: string } = {}) {
    const query = this.customerRepository.createQueryBuilder('customer').orderBy('customer.name', 'ASC');

    if (filters.search?.trim()) {
      query.andWhere('(customer.name ILIKE :search OR customer.phone ILIKE :search)', {
        search: `%${filters.search.trim()}%`,
      });
    }

    if (filters.active === 'true' || filters.active === 'false') {
      query.andWhere('customer.is_active = :isActive', { isActive: filters.active === 'true' });
    }

    return query.getMany();
  }

  async findByIdOrFail(id: string) {
    const customer = await this.customerRepository.findOne({ where: { id } });
    if (!customer) throw new NotFoundException('العميل غير موجود.');
    return customer;
  }

  create(dto: CreateCustomerDto) {
    const customer = this.customerRepository.create({
      name: dto.name.trim(),
      phone: this.optionalText(dto.phone),
      address: this.optionalText(dto.address),
      isActive: dto.isActive ?? true,
      notes: this.optionalText(dto.notes),
    });

    return this.customerRepository.save(customer);
  }

  async update(id: string, dto: UpdateCustomerDto) {
    const customer = await this.findByIdOrFail(id);
    Object.assign(customer, {
      name: dto.name !== undefined ? dto.name.trim() : customer.name,
      phone: dto.phone !== undefined ? this.optionalText(dto.phone) : customer.phone,
      address: dto.address !== undefined ? this.optionalText(dto.address) : customer.address,
      isActive: dto.isActive ?? customer.isActive,
      notes: dto.notes !== undefined ? this.optionalText(dto.notes) : customer.notes,
    });

    return this.customerRepository.save(customer);
  }

  async remove(id: string) {
    const customer = await this.findByIdOrFail(id);
    const linkedInvoices = await this.invoiceRepository.count({ where: { customerId: id } });

    if (linkedInvoices > 0) {
      customer.isActive = false;
      await this.customerRepository.save(customer);
      return {
        id,
        archived: true,
        message: 'تم أرشفة العميل لأنه مرتبط بفواتير بيع محفوظة.',
      };
    }

    await this.customerRepository.remove(customer);
    return { id, archived: false };
  }

  private optionalText(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }
}
