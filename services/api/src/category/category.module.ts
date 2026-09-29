import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryPublicController } from './category.public.controller';
import { CategoryService } from './category.service';

@Module({
  controllers: [CategoryController, CategoryPublicController],
  providers: [CategoryService],
})
export class CategoryModule {}
