import { Controller } from '@nestjs/common';
import { SupplierPaymentsService } from './supplier-payments.service';

@Controller('supplier-payments')
export class SupplierPaymentsController {
  constructor(private readonly supplierPaymentsService: SupplierPaymentsService) {}
}
