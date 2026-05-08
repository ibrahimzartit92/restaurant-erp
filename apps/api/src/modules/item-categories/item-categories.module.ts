import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemEntity } from '../items/entities/item.entity';
import { ItemCategoryEntity } from './entities/item-category.entity';
import { ItemCategoriesController } from './item-categories.controller';
import { ItemCategoriesService } from './item-categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([ItemCategoryEntity, ItemEntity])],
  controllers: [ItemCategoriesController],
  providers: [ItemCategoriesService],
  exports: [ItemCategoriesService],
})
export class ItemCategoriesModule {}
