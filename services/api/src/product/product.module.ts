import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductPublicController } from './product.public.controller';
import { ProductService } from './product.service';

@Module({
  controllers: [ProductController, ProductPublicController],
  providers: [ProductService],
})
export class ProductModule {}
