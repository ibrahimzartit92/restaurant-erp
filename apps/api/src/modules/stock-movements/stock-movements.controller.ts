import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CreateManualStockMovementDto } from './dto/create-manual-stock-movement.dto';
import { StockMovementsService } from './stock-movements.service';

@Controller('stock-movements')
export class StockMovementsController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  @Get()
  findAll(
    @Query('warehouseId') warehouseId?: string,
    @Query('itemId') itemId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('movementType') movementType?: string,
  ) {
    return this.stockMovementsService.findAll({ warehouseId, itemId, dateFrom, dateTo, movementType });
  }

  @Get('current-stock')
  currentStock(@Query('warehouseId') warehouseId?: string) {
    return this.stockMovementsService.currentStock(warehouseId);
  }

  @Get('stock-card')
  stockCard(
    @Query('warehouseId') warehouseId: string,
    @Query('itemId') itemId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.stockMovementsService.stockCard({ warehouseId, itemId, dateFrom, dateTo });
  }

  @Get('between-counts')
  betweenCounts(@Query('warehouseId') warehouseId: string, @Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.stockMovementsService.betweenCountsReport({ warehouseId, dateFrom, dateTo });
  }

  @Post('manual')
  createManualMovement(@Body() dto: CreateManualStockMovementDto) {
    return this.stockMovementsService.createManualMovement(dto);
  }
}
