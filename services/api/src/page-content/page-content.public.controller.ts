// 官网页面内容读取接口（公开，PRD §6 各页取用，缓存优先即时生效）：
//   GET /api/v1/public/pages       全部配置项（{ key: 配置对象 } 映射）
//   GET /api/v1/public/pages/:key  单配置项
import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PageContentService } from './page-content.service';

@ApiTags('页面内容')
@Controller('api/v1/public/pages')
export class PageContentPublicController {
  constructor(private readonly pages: PageContentService) {}

  @ApiOperation({ summary: '查询公开页面配置' })
  @Get()
  publicAll() {
    return this.pages.publicAll();
  }

  @ApiOperation({ summary: '查询公开单页配置' })
  @Get(':key')
  publicOne(@Param('key') key: string) {
    return this.pages.publicOne(key);
  }
}
