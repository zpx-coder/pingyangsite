// 官网企业读取接口（公开，PRD §6.5 / 计划 §5.2）：
//   GET /api/v1/public/companies          类目页企业列表（仅上架，categoryId 可选，12/页）
//   GET /api/v1/public/companies/:id      企业详情（含类目标签与分页产品列表）
import { BadRequestException, Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { CompanyService } from './company.service';

const PUBLIC_PAGE_SIZE = 12;
// 可选参数：缺省时不校验；传入非法值返回中文错误消息
const optionalIntPipe = new ParseIntPipe({
  optional: true,
  exceptionFactory: () => new BadRequestException('参数格式不正确'),
});

@Controller('api/v1/public/companies')
export class CompanyPublicController {
  constructor(private readonly company: CompanyService) {}

  @Get()
  listPublished(
    @Query('categoryId', optionalIntPipe) categoryId: number | undefined,
    @Query('page', optionalIntPipe) page: number | undefined,
    @Query('pageSize', optionalIntPipe) pageSize: number | undefined,
  ) {
    return this.company.listPublished(categoryId ?? 0, page ?? 1, pageSize ?? PUBLIC_PAGE_SIZE);
  }

  @Get(':id')
  publicDetail(
    @Param('id', ParseIntPipe) id: number,
    @Query('page', optionalIntPipe) page: number | undefined,
    @Query('pageSize', optionalIntPipe) pageSize: number | undefined,
  ) {
    return this.company.publicDetail(id, page ?? 1, pageSize ?? PUBLIC_PAGE_SIZE);
  }
}
