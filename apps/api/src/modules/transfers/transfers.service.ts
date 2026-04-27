import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { BranchesService } from '../branches/branches.service';
import { ItemsService } from '../items/items.service';
import { WarehousesService } from '../warehouses/warehouses.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { UpdateTransferDto } from './dto/update-transfer.dto';
import { BranchTransferItemEntity } from './entities/transfer-item.entity';
import { BranchTransferStatus, TransferEntity } from './entities/transfer.entity';

@Injectable()
export class TransfersService {
  constructor(
    @InjectRepository(TransferEntity)
    private readonly transferRepository: Repository<TransferEntity>,
    @InjectRepository(BranchTransferItemEntity)
    private readonly transferItemRepository: Repository<BranchTransferItemEntity>,
    private readonly branchesService: BranchesService,
    private readonly warehousesService: WarehousesService,
    private readonly itemsService: ItemsService,
  ) {}

  findAll(filters: {
    search?: string;
    fromBranchId?: string;
    toBranchId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const query = this.transferRepository
      .createQueryBuilder('transfer')
      .leftJoinAndSelect('transfer.fromBranch', 'fromBranch')
      .leftJoinAndSelect('transfer.toBranch', 'toBranch')
      .leftJoinAndSelect('transfer.fromWarehouse', 'fromWarehouse')
      .leftJoinAndSelect('transfer.toWarehouse', 'toWarehouse')
      .leftJoinAndSelect('transfer.items', 'items')
      .leftJoinAndSelect('items.item', 'item')
      .orderBy('transfer.transfer_date', 'DESC')
      .addOrderBy('transfer.created_at', 'DESC');

    if (filters.search?.trim()) {
      query.andWhere(
        '(transfer.transfer_number ILIKE :search OR fromBranch.name ILIKE :search OR toBranch.name ILIKE :search)',
        { search: `%${filters.search.trim()}%` },
      );
    }

    if (filters.fromBranchId) {
      query.andWhere('transfer.from_branch_id = :fromBranchId', { fromBranchId: filters.fromBranchId });
    }

    if (filters.toBranchId) {
      query.andWhere('transfer.to_branch_id = :toBranchId', { toBranchId: filters.toBranchId });
    }

    if (filters.dateFrom) {
      query.andWhere('transfer.transfer_date >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      query.andWhere('transfer.transfer_date <= :dateTo', { dateTo: filters.dateTo });
    }

    return query.getMany();
  }

  async findByIdOrFail(id: string) {
    const transfer = await this.transferRepository.findOne({
      where: { id },
      relations: {
        items: { item: true },
      },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer was not found.');
    }

    return transfer;
  }

  async create(createTransferDto: CreateTransferDto) {
    const transferNumber = createTransferDto.transferNumber.trim().toUpperCase();
    await this.ensureTransferNumberIsAvailable(transferNumber);
    await this.validateReferences(createTransferDto);

    const items = await this.prepareItems(createTransferDto.items);
    const totalCostAmount = items.reduce((sum, item) => sum + item.lineTotal, 0);

    const transfer = this.transferRepository.create({
      transferNumber,
      transferDate: createTransferDto.transferDate,
      fromBranchId: createTransferDto.fromBranchId,
      toBranchId: createTransferDto.toBranchId,
      fromWarehouseId: createTransferDto.fromWarehouseId,
      toWarehouseId: createTransferDto.toWarehouseId,
      status: createTransferDto.status ?? BranchTransferStatus.Completed,
      totalCostAmount,
      notes: this.normalizeOptionalText(createTransferDto.notes),
      items: items.map((item) => this.transferItemRepository.create(item)),
    });

    return this.transferRepository.save(transfer);
  }

  async update(id: string, updateTransferDto: UpdateTransferDto) {
    const transfer = await this.findByIdOrFail(id);
    const transferNumber = updateTransferDto.transferNumber?.trim().toUpperCase();

    if (transferNumber) {
      await this.ensureTransferNumberIsAvailable(transferNumber, id);
    }

    const mergedData: CreateTransferDto = {
      transferNumber: transferNumber ?? transfer.transferNumber,
      transferDate: updateTransferDto.transferDate ?? transfer.transferDate,
      fromBranchId: updateTransferDto.fromBranchId ?? transfer.fromBranchId,
      toBranchId: updateTransferDto.toBranchId ?? transfer.toBranchId,
      fromWarehouseId: updateTransferDto.fromWarehouseId ?? transfer.fromWarehouseId,
      toWarehouseId: updateTransferDto.toWarehouseId ?? transfer.toWarehouseId,
      status: updateTransferDto.status ?? transfer.status,
      notes: updateTransferDto.notes !== undefined ? updateTransferDto.notes : transfer.notes,
      items:
        updateTransferDto.items ??
        transfer.items.map((item) => ({
          itemId: item.itemId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          notes: item.notes,
        })),
    };

    await this.validateReferences(mergedData);
    const items = await this.prepareItems(mergedData.items);
    const totalCostAmount = items.reduce((sum, item) => sum + item.lineTotal, 0);

    transfer.transferNumber = mergedData.transferNumber;
    transfer.transferDate = mergedData.transferDate;
    transfer.fromBranchId = mergedData.fromBranchId;
    transfer.toBranchId = mergedData.toBranchId;
    transfer.fromWarehouseId = mergedData.fromWarehouseId;
    transfer.toWarehouseId = mergedData.toWarehouseId;
    transfer.status = mergedData.status ?? BranchTransferStatus.Completed;
    transfer.totalCostAmount = totalCostAmount;
    transfer.notes = this.normalizeOptionalText(mergedData.notes);
    await this.transferItemRepository.delete({ branchTransferId: transfer.id });
    transfer.items = items.map((item) => this.transferItemRepository.create(item));

    return this.transferRepository.save(transfer);
  }

  private async validateReferences(data: CreateTransferDto) {
    if (data.fromBranchId === data.toBranchId) {
      throw new BadRequestException('Source and destination branches must be different.');
    }

    if (data.fromWarehouseId === data.toWarehouseId) {
      throw new BadRequestException('Source and destination warehouses must be different.');
    }

    const [fromBranch, toBranch, fromWarehouse, toWarehouse] = await Promise.all([
      this.branchesService.findById(data.fromBranchId),
      this.branchesService.findById(data.toBranchId),
      this.warehousesService.findByIdOrFail(data.fromWarehouseId),
      this.warehousesService.findByIdOrFail(data.toWarehouseId),
    ]);

    if (!fromBranch || !toBranch) {
      throw new NotFoundException('The selected branch was not found.');
    }

    if (!fromWarehouse || !toWarehouse) {
      throw new NotFoundException('The selected warehouse was not found.');
    }
  }

  private async prepareItems(items: CreateTransferDto['items']) {
    return Promise.all(
      items.map(async (item) => {
        const material = await this.itemsService.findByIdOrFail(item.itemId);
        const quantity = Number(item.quantity);
        const unitCost = Number(item.unitCost);

        return {
          itemId: material.id,
          quantity,
          unitCost,
          lineTotal: Number((quantity * unitCost).toFixed(2)),
          notes: this.normalizeOptionalText(item.notes),
        };
      }),
    );
  }

  private async ensureTransferNumberIsAvailable(transferNumber: string, currentId?: string) {
    const existingTransfer = await this.transferRepository.findOne({
      where: { transferNumber, ...(currentId ? { id: Not(currentId) } : {}) },
    });

    if (existingTransfer) {
      throw new ConflictException('A transfer with this number already exists.');
    }
  }

  private normalizeOptionalText(value?: string | null) {
    const normalizedValue = value?.trim();
    return normalizedValue ? normalizedValue : null;
  }
}
