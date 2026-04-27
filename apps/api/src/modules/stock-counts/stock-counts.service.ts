import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { BranchesService } from '../branches/branches.service';
import { ItemsService } from '../items/items.service';
import { WarehousesService } from '../warehouses/warehouses.service';
import { CreateStockCountDto } from './dto/create-stock-count.dto';
import { UpdateStockCountDto } from './dto/update-stock-count.dto';
import { StockCountItemEntity } from './entities/stock-count-item.entity';
import { StockCountEntity, StockCountStatus } from './entities/stock-count.entity';

@Injectable()
export class StockCountsService {
  constructor(
    @InjectRepository(StockCountEntity)
    private readonly stockCountRepository: Repository<StockCountEntity>,
    @InjectRepository(StockCountItemEntity)
    private readonly stockCountItemRepository: Repository<StockCountItemEntity>,
    private readonly branchesService: BranchesService,
    private readonly warehousesService: WarehousesService,
    private readonly itemsService: ItemsService,
  ) {}

  findAll(filters: {
    search?: string;
    branchId?: string;
    warehouseId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const query = this.stockCountRepository
      .createQueryBuilder('stockCount')
      .leftJoinAndSelect('stockCount.branch', 'branch')
      .leftJoinAndSelect('stockCount.warehouse', 'warehouse')
      .leftJoinAndSelect('stockCount.items', 'items')
      .leftJoinAndSelect('items.item', 'item')
      .orderBy('stockCount.count_date', 'DESC')
      .addOrderBy('stockCount.created_at', 'DESC');

    if (filters.search?.trim()) {
      query.andWhere(
        '(stockCount.count_number ILIKE :search OR branch.name ILIKE :search OR warehouse.name ILIKE :search)',
        { search: `%${filters.search.trim()}%` },
      );
    }

    if (filters.branchId) {
      query.andWhere('stockCount.branch_id = :branchId', { branchId: filters.branchId });
    }

    if (filters.warehouseId) {
      query.andWhere('stockCount.warehouse_id = :warehouseId', { warehouseId: filters.warehouseId });
    }

    if (filters.dateFrom) {
      query.andWhere('stockCount.count_date >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      query.andWhere('stockCount.count_date <= :dateTo', { dateTo: filters.dateTo });
    }

    return query.getMany();
  }

  async findByIdOrFail(id: string) {
    const stockCount = await this.stockCountRepository.findOne({
      where: { id },
      relations: {
        items: { item: true },
      },
    });

    if (!stockCount) {
      throw new NotFoundException('Stock count was not found.');
    }

    return stockCount;
  }

  async create(createDto: CreateStockCountDto) {
    const countNumber = createDto.countNumber.trim().toUpperCase();
    await this.ensureCountNumberIsAvailable(countNumber);
    await this.validateReferences(createDto.branchId, createDto.warehouseId);

    const items = await this.prepareItems(createDto.items);

    const stockCount = this.stockCountRepository.create({
      countNumber,
      branchId: createDto.branchId,
      warehouseId: createDto.warehouseId,
      countDate: createDto.countDate,
      status: createDto.status ?? StockCountStatus.Completed,
      notes: this.normalizeOptionalText(createDto.notes),
      items: items.map((item) => this.stockCountItemRepository.create(item)),
    });

    return this.stockCountRepository.save(stockCount);
  }

  async update(id: string, updateDto: UpdateStockCountDto) {
    const stockCount = await this.findByIdOrFail(id);
    const countNumber = updateDto.countNumber?.trim().toUpperCase();

    if (countNumber) {
      await this.ensureCountNumberIsAvailable(countNumber, id);
    }

    const mergedItems =
      updateDto.items ??
      stockCount.items.map((item) => ({
        itemId: item.itemId,
        systemQuantity: item.systemQuantity,
        countedQuantity: item.countedQuantity,
        notes: item.notes,
      }));

    const branchId = updateDto.branchId ?? stockCount.branchId;
    const warehouseId = updateDto.warehouseId ?? stockCount.warehouseId;

    await this.validateReferences(branchId, warehouseId);
    const items = await this.prepareItems(mergedItems);

    stockCount.countNumber = countNumber ?? stockCount.countNumber;
    stockCount.branchId = branchId;
    stockCount.warehouseId = warehouseId;
    stockCount.countDate = updateDto.countDate ?? stockCount.countDate;
    stockCount.status = updateDto.status ?? stockCount.status;
    stockCount.notes = updateDto.notes !== undefined ? this.normalizeOptionalText(updateDto.notes) : stockCount.notes;

    await this.stockCountItemRepository.delete({ stockCountId: stockCount.id });
    stockCount.items = items.map((item) => this.stockCountItemRepository.create(item));

    return this.stockCountRepository.save(stockCount);
  }

  private async validateReferences(branchId: string, warehouseId: string) {
    const [branch, warehouse] = await Promise.all([
      this.branchesService.findById(branchId),
      this.warehousesService.findByIdOrFail(warehouseId),
    ]);

    if (!branch) {
      throw new NotFoundException('The selected branch was not found.');
    }

    if (!warehouse) {
      throw new NotFoundException('The selected warehouse was not found.');
    }
  }

  private async prepareItems(items: CreateStockCountDto['items']) {
    return Promise.all(
      items.map(async (item) => {
        const material = await this.itemsService.findByIdOrFail(item.itemId);
        const systemQuantity = Number(item.systemQuantity);
        const countedQuantity = Number(item.countedQuantity);
        const differenceQuantity = Number((countedQuantity - systemQuantity).toFixed(3));
        const estimatedCostDifference = Number((differenceQuantity * Number(material.costPrice ?? 0)).toFixed(2));

        return {
          itemId: material.id,
          systemQuantity,
          countedQuantity,
          differenceQuantity,
          estimatedCostDifference,
          notes: this.normalizeOptionalText(item.notes),
        };
      }),
    );
  }

  private async ensureCountNumberIsAvailable(countNumber: string, currentId?: string) {
    const existingStockCount = await this.stockCountRepository.findOne({
      where: { countNumber, ...(currentId ? { id: Not(currentId) } : {}) },
    });

    if (existingStockCount) {
      throw new ConflictException('A stock count with this number already exists.');
    }
  }

  private normalizeOptionalText(value?: string | null) {
    const normalizedValue = value?.trim();
    return normalizedValue ? normalizedValue : null;
  }
}
