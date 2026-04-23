import { Controller } from '@nestjs/common';
import { DailySalesService } from './daily-sales.service';

@Controller('daily-sales')
export class DailySalesController {
  constructor(private readonly dailySalesService: DailySalesService) {}
}
