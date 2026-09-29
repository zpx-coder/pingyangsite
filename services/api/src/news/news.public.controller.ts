// 官网新闻读取接口（公开，PRD §6.1 / §6.6 / §6.7）：
//   GET /api/v1/public/news/latest  首页新闻 4 条
//   GET /api/v1/public/news         新闻列表（已发布且到达发布时间，置顶优先，12/页）
//   GET /api/v1/public/news/:id     新闻详情（未发布/未到时间/已删除 404）
import { BadRequestException, Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { NewsService } from './news.service';

const PUBLIC_PAGE_SIZE = 12;
const optionalIntPipe = new ParseIntPipe({
  optional: true,
  exceptionFactory: () => new BadRequestException('参数格式不正确'),
});

@Controller('api/v1/public/news')
export class NewsPublicController {
  constructor(private readonly news: NewsService) {}

  // 注意：静态路由须声明在 :id 之前，避免被参数路由吞掉
  @Get('latest')
  latest() {
    return this.news.latest();
  }

  @Get()
  listPublished(
    @Query('page', optionalIntPipe) page: number | undefined,
    @Query('pageSize', optionalIntPipe) pageSize: number | undefined,
  ) {
    return this.news.listPublished(page ?? 1, pageSize ?? PUBLIC_PAGE_SIZE);
  }

  @Get(':id')
  publicDetail(@Param('id', ParseIntPipe) id: number) {
    return this.news.publicDetail(id);
  }
}
