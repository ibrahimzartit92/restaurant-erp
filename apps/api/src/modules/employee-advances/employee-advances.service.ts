import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  DrawerTransactionDirection,
  DrawerTransactionEntity,
  DrawerTransactionType,
} from '../drawer-transactions/entities/drawer-transaction.entity';
import { DrawerEntity } from '../drawers/entities/drawer.entity';
import { EmployeesService } from '../employees/employees.service';
import { CreateEmployeeAdvanceDto } from './dto/create-employee-advance.dto';
import { UpdateEmployeeAdvanceDto } from './dto/update-employee-advance.dto';
import { EmployeeAdvanceEntity } from './entities/employee-advance.entity';

@Injectable()
export class EmployeeAdvancesService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(EmployeeAdvanceEntity)
    private readonly advanceRepository: Repository<EmployeeAdvanceEntity>,
    @InjectRepository(DrawerEntity)
    private readonly drawerRepository: Repository<DrawerEntity>,
    private readonly employeesService: EmployeesService,
  ) {}

  async findAll(filters: {
    search?: string;
    employeeId?: string;
    payrollMonth?: string;
    payrollYear?: string;
  }) {
    const query = this.advanceRepository
      .createQueryBuilder('advance')
      .leftJoinAndSelect('advance.employee', 'employee')
      .orderBy('advance.advance_date', 'DESC')
      .addOrderBy('advance.created_at', 'DESC');

    if (filters.search?.trim()) {
      query.andWhere('(employee.full_name ILIKE :search OR employee.employee_number ILIKE :search)', {
        search: `%${filters.search.trim()}%`,
      });
    }

    if (filters.employeeId) {
      query.andWhere('advance.employee_id = :employeeId', { employeeId: filters.employeeId });
    }

    if (filters.payrollMonth) {
      query.andWhere('advance.payroll_month = :payrollMonth', { payrollMonth: Number(filters.payrollMonth) });
    }

    if (filters.payrollYear) {
      query.andWhere('advance.payroll_year = :payrollYear', { payrollYear: Number(filters.payrollYear) });
    }

    return query.getMany();
  }

  async findByIdOrFail(id: string) {
    const advance = await this.advanceRepository.findOne({ where: { id } });

    if (!advance) {
      throw new NotFoundException('Employee advance was not found.');
    }

    return advance;
  }

  async create(createDto: CreateEmployeeAdvanceDto) {
    const employee = await this.employeesService.findByIdOrFail(createDto.employeeId);

    const advance = this.advanceRepository.create({
      employeeId: employee.id,
      advanceDate: createDto.advanceDate,
      amount: Number(createDto.amount),
      drawerId: await this.resolveDrawerId(createDto.drawerId, employee.defaultBranchId),
      payrollMonth: createDto.payrollMonth ?? null,
      payrollYear: createDto.payrollYear ?? null,
      notes: this.normalizeOptionalText(createDto.notes),
    });

    return this.dataSource.transaction(async (manager) => {
      const savedAdvance = await manager.getRepository(EmployeeAdvanceEntity).save(advance);
      await this.recreateFinancialMovement(savedAdvance, manager);
      return savedAdvance;
    });
  }

  async update(id: string, updateDto: UpdateEmployeeAdvanceDto) {
    const advance = await this.findByIdOrFail(id);

    const employee = updateDto.employeeId
      ? await this.employeesService.findByIdOrFail(updateDto.employeeId)
      : advance.employee;

    Object.assign(advance, {
      employeeId: updateDto.employeeId ?? advance.employeeId,
      advanceDate: updateDto.advanceDate ?? advance.advanceDate,
      amount: updateDto.amount !== undefined ? Number(updateDto.amount) : advance.amount,
      drawerId:
        updateDto.drawerId !== undefined
          ? await this.resolveDrawerId(updateDto.drawerId, employee.defaultBranchId)
          : advance.drawerId,
      payrollMonth: updateDto.payrollMonth !== undefined ? updateDto.payrollMonth : advance.payrollMonth,
      payrollYear: updateDto.payrollYear !== undefined ? updateDto.payrollYear : advance.payrollYear,
      notes: updateDto.notes !== undefined ? this.normalizeOptionalText(updateDto.notes) : advance.notes,
    });

    return this.dataSource.transaction(async (manager) => {
      const savedAdvance = await manager.getRepository(EmployeeAdvanceEntity).save(advance);
      await this.recreateFinancialMovement(savedAdvance, manager);
      return savedAdvance;
    });
  }

  private async resolveDrawerId(drawerId?: string | null, branchId?: string | null) {
    if (drawerId) {
      const drawer = await this.drawerRepository.findOne({ where: { id: drawerId } });

      if (!drawer) {
        throw new NotFoundException('Drawer was not found.');
      }

      return drawer.id;
    }

    if (!branchId) {
      return null;
    }

    const branchDrawer = await this.drawerRepository.findOne({ where: { branchId } });
    return branchDrawer?.id ?? null;
  }

  private async recreateFinancialMovement(advance: EmployeeAdvanceEntity, manager = this.dataSource.manager) {
    await manager
      .getRepository(DrawerTransactionEntity)
      .delete({ sourceType: 'employee_advance', sourceId: advance.id });

    if (!advance.drawerId) {
      return;
    }

    const drawer = await manager.getRepository(DrawerEntity).findOne({ where: { id: advance.drawerId } });

    if (!drawer) {
      return;
    }

    await manager.getRepository(DrawerTransactionEntity).save({
      drawerId: advance.drawerId,
      branchId: drawer.branchId,
      transactionDate: advance.advanceDate,
      transactionType: DrawerTransactionType.EmployeeAdvanceCash,
      direction: DrawerTransactionDirection.Out,
      amount: advance.amount,
      sourceType: 'employee_advance',
      sourceId: advance.id,
      description: `سلفة موظف ${advance.employee?.fullName ?? ''}`.trim(),
      notes: advance.notes,
    });
  }

  private normalizeOptionalText(value?: string | null) {
    const normalizedValue = value?.trim();
    return normalizedValue ? normalizedValue : null;
  }
}
