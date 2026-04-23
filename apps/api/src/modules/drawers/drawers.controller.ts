import { Controller } from '@nestjs/common';
import { DrawersService } from './drawers.service';

@Controller('drawers')
export class DrawersController {
  constructor(private readonly drawersService: DrawersService) {}
}
