// 新闻编辑入参：全部可选，仅更新传入字段
import { IsBoolean, IsDateString, IsIn, IsOptional, Matches, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IMAGE_URL_PATTERN } from '../../common/image-url.constants';

export class UpdateNewsDto {
  @ApiPropertyOptional({ description: '新闻标题（中文）', example: '平阳产业带企业亮相广交会' })
  @IsOptional()
  @MaxLength(200, { message: '新闻标题不能超过 200 字' })
  titleZh?: string;

  @ApiPropertyOptional({ description: '新闻标题（英文）', example: 'Pingyang Industries at Canton Fair' })
  @IsOptional()
  @MaxLength(200, { message: '英文标题不能超过 200 字符' })
  titleEn?: string;

  @ApiPropertyOptional({
    description: '封面图地址（http/https 绝对地址或站内相对路径，如 /img/n1.jpg）',
    example: 'https://example.com/news-cover.jpg',
  })
  @IsOptional()
  @Matches(IMAGE_URL_PATTERN, { message: '封面图地址格式不正确' })
  @MaxLength(255, { message: '封面图地址过长' })
  coverUrl?: string;

  @ApiPropertyOptional({ description: '摘要（中文）', example: '平阳产业带最新动态' })
  @IsOptional()
  @MaxLength(200, { message: '摘要不能超过 200 字' })
  summaryZh?: string;

  @ApiPropertyOptional({ description: '摘要（英文）', example: 'Latest news from Pingyang' })
  @IsOptional()
  @MaxLength(200, { message: '英文摘要不能超过 200 字符' })
  summaryEn?: string;

  @ApiPropertyOptional({ description: '新闻正文（中文）', example: '<p>新闻正文内容</p>' })
  @IsOptional()
  @MaxLength(15000, { message: '新闻正文不能超过 15000 字' })
  contentZh?: string;

  @ApiPropertyOptional({ description: '新闻正文（英文）', example: '<p>News content</p>' })
  @IsOptional()
  @MaxLength(15000, { message: '英文正文不能超过 15000 字' })
  contentEn?: string;

  @ApiPropertyOptional({ description: '发布时间（ISO 8601 日期）', example: '2026-09-29T10:00:00Z' })
  @IsOptional()
  @IsDateString({}, { message: '发布时间格式不正确' })
  publishTime?: string;

  @ApiPropertyOptional({ description: '是否置顶', example: false })
  @IsOptional()
  @IsBoolean({ message: '置顶取值无效' })
  isTop?: boolean;

  @ApiPropertyOptional({ description: '状态：0 草稿，1 已发布', example: 1 })
  @IsOptional()
  @IsIn([0, 1], { message: '状态取值无效' })
  status?: number;
}
