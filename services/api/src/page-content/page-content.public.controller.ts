// 官网页面内容读取接口（公开，PRD §6 各页取用，缓存优先即时生效）：
//   GET /api/v1/public/pages       全部配置项（{ key: 配置对象 } 映射）
//   GET /api/v1/public/pages/:key  单配置项
import { Controller, Get, Param } from '@nestjs/common';
import { PageContentService } from './page-content.service';

@Controller('api/v1/public/pages')
export class PageContentPublicController {
  constructor(private readonly pages: PageContentService) {}

  @Get()
  publicAll() {
    return this.pages.publicAll();
  }

  @Get(':key')
  publicOne(@Param('key') key: string) {
    return this.pages.publicOne(key);
  }
}
