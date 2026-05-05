import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ItemEntity } from '../items/entities/item.entity';
import { WarehouseEntity } from '../warehouses/entities/warehouse.entity';
import { CreateManualStockMovementDto } from './dto/create-manual-stock-movement.dto';
import { StockMovementEntity, StockMovementType } from './entities/stock-movement.entity';

type MovementInput = {
  movementDate: string;
  warehouseId: string;
  itemId: string;
  unitId?: string | null;
  movementType: StockMovementType;
  quantityIn?: number;
  quantityOut?: number;
  sourceType: string;
  sourceId?: string | null;
  sourceLineId?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
};

@Injectable()
export class StockMovementsService {
  constructor(
    @InjectRepository(StockMovementEntity)
    private readonly stockMovementRepository: Repository<StockMovementEntity>,
    @InjectRepository(ItemEntity)
    private readonly itemRepository: Repository<ItemEntity>,
    @InjectRepository(WarehouseEntity)
    private readonly warehouseRepository: Repository<WarehouseEntity>,
  ) {}

  findAll(filters: { warehouseId?: string; itemId?: string; dateFrom?: string; dateTo?: string; movementType?: string }) {
    const query = this.stockMovementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.warehouse', 'warehouse')
      .leftJoinAndSelect('movement.item', 'item')
      .leftJoinAndSelect('movement.unit', 'unit')
      .orderBy('movement.movement_date', 'DESC')
      .addOrderBy('movement.created_at', 'DESC');

    if (filters.warehouseId) query.andWhere('movement.warehouse_id = :warehouseId', { warehouseId: filters.warehouseId });
    if (filters.itemId) query.andWhere('movement.item_id = :itemId', { itemId: filters.itemId });
    if (filters.dateFrom) query.andWhere('movement.movement_date >= :dateFrom', { dateFrom: filters.dateFrom });
    if (filters.dateTo) query.andWhere('movement.movement_date <= :dateTo', { dateTo: filters.dateTo });
    if (filters.movementType) query.andWhere('movement.movement_type = :movementType', { movementType: filters.movementType });

    return query.getMany();
  }

  async currentStock(warehouseId?: string) {
    const parameters: unknown[] = [];
    const warehouseFilter = warehouseId ? 'WHERE movement.warehouse_id = $1' : '';

    if (warehouseId) parameters.push(warehouseId);

    return this.stockMovementRepository.query(
      `
        SELECT
          movement.warehouse_id AS "warehouseId",
          warehouse.name AS "warehouseName",
          movement.item_id AS "itemId",
          item.code AS "itemCode",
          item.name AS "itemName",
          unit.name AS "unitName",
          COALESCE(SUM(movement.quantity_in - movement.quantity_out), 0)::numeric AS "quantity",
          MAX(movement.movement_date) AS "latestMovementDate"
        FROM stock_movements movement
        JOIN warehouses warehouse ON warehouse.id = movement.warehouse_id
        JOIN items item ON item.id = movement.item_id
        LEFT JOIN units unit ON unit.id = item.unit_id
        ${warehouseFilter}
        GROUP BY movement.warehouse_id, warehouse.name, movement.item_id, item.code, item.name, unit.name
        ORDER BY item.name ASC
      `,
      parameters,
    );
  }

  async stockCard(filters: { warehouseId: string; itemId: string; dateFrom?: string; dateTo?: string }) {
    const opening = await this.sumBefore(filters.warehouseId, filters.itemId, filters.dateFrom);
    const movements = await this.findAll(filters);
    const totals = this.groupTotals(movements);
    const closingBalance = opening + Number(totals.quantityIn) - Number(totals.quantityOut);

    return {
      openingBalance: this.roundQuantity(opening),
      closingBalance: this.roundQuantity(closingBalance),
      totals,
      movements,
    };
  }

  async betweenCountsReport(filters: { warehouseId: string; dateFrom?: string; dateTo?: string }) {
    const rows = await this.stockMovementRepository.query(
      `
        WITH movement_totals AS (
          SELECT
            item_id,
            SUM(CASE WHEN movement_date < COALESCE($2::date, '1900-01-01'::date) THEN quantity_in - quantity_out ELSE 0 END) AS opening_quantity,
            SUM(CASE WHEN movement_type = 'purchase_in' AND movement_date BETWEEN COALESCE($2::date, '1900-01-01'::date) AND COALESCE($3::date, '2999-12-31'::date) THEN quantity_in ELSE 0 END) AS purchased_quantity,
            SUM(CASE WHEN movement_type = 'transfer_in' AND movement_date BETWEEN COALESCE($2::date, '1900-01-01'::date) AND COALESCE($3::date, '2999-12-31'::date) THEN quantity_in ELSE 0 END) AS transfer_in_quantity,
            SUM(CASE WHEN movement_type = 'transfer_out' AND movement_date BETWEEN COALESCE($2::date, '1900-01-01'::date) AND COALESCE($3::date, '2999-12-31'::date) THEN quantity_out ELSE 0 END) AS transfer_out_quantity,
            SUM(CASE WHEN movement_type = 'manual_out' AND movement_date BETWEEN COALESCE($2::date, '1900-01-01'::date) AND COALESCE($3::date, '2999-12-31'::date) THEN quantity_out ELSE 0 END) AS consumed_quantity,
            SUM(CASE WHEN movement_type = 'stock_count_adjustment' AND movement_date BETWEEN COALESCE($2::date, '1900-01-01'::date) AND COALESCE($3::date, '2999-12-31'::date) THEN quantity_in - quantity_out ELSE 0 END) AS adjustment_quantity,
            SUM(CASE WHEN movement_date <= COALESCE($3::date, '2999-12-31'::date) THEN quantity_in - quantity_out ELSE 0 END) AS theoretical_ending_quantity
          FROM stock_movements
          WHERE warehouse_id = $1
          GROUP BY item_id
        ),
        latest_counts AS (
          SELECT DISTINCT ON (sci.item_id)
            sci.item_id,
            sci.counted_quantity,
            sc.count_date
          FROM stock_count_items sci
          JOIN stock_counts sc ON sc.id = sci.stock_count_id
          WHERE sc.warehouse_id = $1
            AND sc.count_date BETWEEN COALESCE($2::date, '1900-01-01'::date) AND COALESCE($3::date, '2999-12-31'::date)
            AND sc.status = 'completed'
          ORDER BY sci.item_id, sc.count_date DESC, sc.created_at DESC
        )
        SELECT
          item.id AS "itemId",
          item.code AS "itemCode",
          item.name AS "itemName",
          unit.name AS "unitName",
          COALESCE(movement_totals.opening_quantity, 0)::numeric AS "openingQuantity",
          COALESCE(movement_totals.purchased_quantity, 0)::numeric AS "purchasedQuantity",
          COALESCE(movement_totals.transfer_in_quantity, 0)::numeric AS "transferInQuantity",
          COALESCE(movement_totals.transfer_out_quantity, 0)::numeric AS "transferOutQuantity",
          COALESCE(movement_totals.consumed_quantity, 0)::numeric AS "consumedQuantity",
          COALESCE(movement_totals.adjustment_quantity, 0)::numeric AS "adjustmentQuantity",
          COALESCE(movement_totals.theoretical_ending_quantity, 0)::numeric AS "theoreticalEndingQuantity",
          latest_counts.counted_quantity AS "actualCountedQuantity",
          latest_counts.count_date AS "actualCountDate"
        FROM movement_totals
        JOIN items item ON item.id = movement_totals.item_id
        LEFT JOIN units unit ON unit.id = item.unit_id
        LEFT JOIN latest_counts ON latest_counts.item_id = item.id
        ORDER BY item.name ASC
      `,
      [filters.warehouseId, filters.dateFrom ?? null, filters.dateTo ?? null],
    );

    return rows.map((row: Record<string, string | number | null>) => ({
      ...row,
      difference:
        row.actualCountedQuantity === null || row.actualCountedQuantity === undefined
          ? null
          : this.roundQuantity(Number(row.actualCountedQuantity) - Number(row.theoreticalEndingQuantity)),
    }));
  }

  async createManualMovement(dto: CreateManualStockMovementDto) {
    await this.ensureReferences(dto.warehouseId, dto.itemId);
    const quantity = Number(dto.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException('الكمية يجب أن تكون أكبر من صفر.');
    }

    return this.createMovement({
      movementDate: dto.movementDate,
      warehouseId: dto.warehouseId,
      itemId: dto.itemId,
      movementType: dto.movementType,
      quantityIn: dto.movementType === StockMovementType.ManualIn ? quantity : 0,
      quantityOut: dto.movementType === StockMovementType.ManualOut ? quantity : 0,
      sourceType: 'manual',
      referenceNumber: dto.reason,
      notes: dto.notes ?? null,
    });
  }

  async replaceSourceMovements(sourceType: string, sourceId: string, movements: MovementInput[], manager?: EntityManager) {
    const repository = manager?.getRepository(StockMovementEntity) ?? this.stockMovementRepository;
    await repository.delete({ sourceType, sourceId });

    for (const movement of movements) {
      await this.createMovement(movement, manager);
    }
  }

  async createMovement(input: MovementInput, manager?: EntityManager) {
    const repository = manager?.getRepository(StockMovementEntity) ?? this.stockMovementRepository;
    const currentBalance = await this.getCurrentBalance(input.warehouseId, input.itemId, manager);
    const quantityIn = this.roundQuantity(Number(input.quantityIn ?? 0));
    const quantityOut = this.roundQuantity(Number(input.quantityOut ?? 0));
    const balanceAfter = this.roundQuantity(currentBalance + quantityIn - quantityOut);

    if (quantityIn <= 0 && quantityOut <= 0) {
      throw new BadRequestException('حركة المخزون يجب أن تحتوي كمية داخلة أو خارجة.');
    }

    return repository.save(
      repository.create({
        ...input,
        unitId: input.unitId ?? null,
        quantityIn,
        quantityOut,
        balanceAfter,
        sourceId: input.sourceId ?? null,
        sourceLineId: input.sourceLineId ?? null,
        referenceNumber: input.referenceNumber ?? null,
        notes: input.notes ?? null,
      }),
    );
  }

  private async ensureReferences(warehouseId: string, itemId: string) {
    const [warehouse, item] = await Promise.all([
      this.warehouseRepository.findOne({ where: { id: warehouseId } }),
      this.itemRepository.findOne({ where: { id: itemId } }),
    ]);

    if (!warehouse) throw new NotFoundException('المخزن غير موجود.');
    if (!item) throw new NotFoundException('المادة غير موجودة.');
  }

  private async getCurrentBalance(warehouseId: string, itemId: string, manager?: EntityManager) {
    const repository = manager?.getRepository(StockMovementEntity) ?? this.stockMovementRepository;
    const result = await repository
      .createQueryBuilder('movement')
      .select('COALESCE(SUM(movement.quantity_in - movement.quantity_out), 0)', 'balance')
      .where('movement.warehouse_id = :warehouseId', { warehouseId })
      .andWhere('movement.item_id = :itemId', { itemId })
      .getRawOne<{ balance: string }>();

    return Number(result?.balance ?? 0);
  }

  private async sumBefore(warehouseId: string, itemId: string, dateFrom?: string) {
    if (!dateFrom) return 0;
    const result = await this.stockMovementRepository
      .createQueryBuilder('movement')
      .select('COALESCE(SUM(movement.quantity_in - movement.quantity_out), 0)', 'balance')
      .where('movement.warehouse_id = :warehouseId', { warehouseId })
      .andWhere('movement.item_id = :itemId', { itemId })
      .andWhere('movement.movement_date < :dateFrom', { dateFrom })
      .getRawOne<{ balance: string }>();

    return Number(result?.balance ?? 0);
  }

  private groupTotals(movements: StockMovementEntity[]) {
    const empty = {
      purchasesIn: 0,
      transfersIn: 0,
      transfersOut: 0,
      manualOut: 0,
      adjustments: 0,
      quantityIn: 0,
      quantityOut: 0,
    };

    return movements.reduce((totals, movement) => {
      totals.quantityIn += Number(movement.quantityIn);
      totals.quantityOut += Number(movement.quantityOut);
      if (movement.movementType === StockMovementType.PurchaseIn) totals.purchasesIn += Number(movement.quantityIn);
      if (movement.movementType === StockMovementType.TransferIn) totals.transfersIn += Number(movement.quantityIn);
      if (movement.movementType === StockMovementType.TransferOut) totals.transfersOut += Number(movement.quantityOut);
      if (movement.movementType === StockMovementType.ManualOut) totals.manualOut += Number(movement.quantityOut);
      if (movement.movementType === StockMovementType.StockCountAdjustment) {
        totals.adjustments += Number(movement.quantityIn) - Number(movement.quantityOut);
      }
      return totals;
    }, empty);
  }

  private roundQuantity(value: number) {
    return Math.round((value + Number.EPSILON) * 1000) / 1000;
  }
}
