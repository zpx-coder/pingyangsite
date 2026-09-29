// 新闻新增入参（PRD §7.4.1）：标题中文必填英文自动翻译、正文富文本必填、
// 发布时间必填（默认当前，可定时未来）、状态默认草稿(0)
import { IsBoolean, IsDateString, IsIn, IsNotEmpty, IsOptional, IsUrl, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNewsDto {
  @ApiProperty({ description: '新闻标题（中文，必填）', example: '平阳产业带企业亮相广交会' })
  @IsNotEmpty({ message: '新闻标题不能为空' })
  @MaxLength(200, { message: '新闻标题不能超过 200 字' })
  titleZh!: string;

  @ApiPropertyOptional({ description: '新闻标题（英文，不填自动翻译）', example: 'Pingyang Industries at Canton Fair' })
  @IsOptional()
  @MaxLength(200, { message: '英文标题不能超过 200 字符' })
  titleEn?: string;

  @ApiPropertyOptional({ description: '封面图地址', example: 'https://example.com/news-cover.jpg' })
  @IsOptional()
  @IsUrl({ require_protocol: true }, { message: '封面图地址格式不正确' })
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

  @ApiProperty({ description: '新闻正文（中文，必填）', example: '<p>新闻正文内容</p>' })
  @IsNotEmpty({ message: '新闻正文不能为空' })
  @MaxLength(15000, { message: '新闻正文不能超过 15000 字' })
  contentZh!: string;

  @ApiPropertyOptional({ description: '新闻正文（英文，不填自动翻译）', example: '<p>News content</p>' })
  @IsOptional()
  @MaxLength(15000, { message: '英文正文不能超过 15000 字' })
  contentEn?: string;

  @ApiProperty({ description: '发布时间（ISO 8601 日期，可定时未来）', example: '2026-09-29T10:00:00Z' })
  @IsDateString({}, { message: '发布时间格式不正确' })
  publishTime!: string;

  @ApiPropertyOptional({ description: '是否置顶，默认 false', example: false })
  @IsOptional()
  @IsBoolean({ message: '置顶取值无效' })
  isTop?: boolean;

  @ApiPropertyOptional({ description: '状态：0 草稿，1 已发布，默认 0', example: 0 })
  @IsOptional()
  @IsIn([0, 1], { message: '状态取值无效' })
  status?: number;
}
