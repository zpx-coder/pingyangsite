// 官网读取接口（公开，PRD §6.1）：上架类目按排序升序，供首页卡片/导航/类目页使用
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoryService } from './category.service';

@ApiTags('类目')
@Controller('api/v1/public/categories')
export class CategoryPublicController {
  constructor(private readonly category: CategoryService) {}

  @ApiOperation({ summary: '上架类目列表' })
  @Get()
  listPublished() {
    return this.category.listPublished();
  }
}
