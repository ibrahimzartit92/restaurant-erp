import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { SupplierRepresentativeEntity } from './entities/supplier-representative.entity';
import { SupplierRepresentativesController } from './supplier-representatives.controller';
import { SupplierRepresentativesService } from './supplier-representatives.service';

@Module({
  imports: [TypeOrmModule.forFeature([SupplierRepresentativeEntity]), SuppliersModule],
  controllers: [SupplierRepresentativesController],
  providers: [SupplierRepresentativesService],
})
export class SupplierRepresentativesModule {}
