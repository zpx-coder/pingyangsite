// 官网产品读取接口（公开，PRD §6.3 / §6.4）：
//   GET /api/v1/public/products          类目页产品列表（仅已发布，categoryId 可选，12/页）
//   GET /api/v1/public/products/:id      产品详情（下架/删除后 404；含该企业其他产品）
import { BadRequestException, Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ProductService } from './product.service';

const PUBLIC_PAGE_SIZE = 12;
// 可选参数：缺省时不校验；传入非法值返回中文错误消息
const optionalIntPipe = new ParseIntPipe({
  optional: true,
  exceptionFactory: () => new BadRequestException('参数格式不正确'),
});

@Controller('api/v1/public/products')
export class ProductPublicController {
  constructor(private readonly product: ProductService) {}

  @Get()
  listPublished(
    @Query('categoryId', optionalIntPipe) categoryId: number | undefined,
    @Query('page', optionalIntPipe) page: number | undefined,
    @Query('pageSize', optionalIntPipe) pageSize: number | undefined,
  ) {
    return this.product.listPublished(categoryId ?? 0, page ?? 1, pageSize ?? PUBLIC_PAGE_SIZE);
  }

  @Get(':id')
  publicDetail(@Param('id', ParseIntPipe) id: number) {
    return this.product.publicDetail(id);
  }
}
