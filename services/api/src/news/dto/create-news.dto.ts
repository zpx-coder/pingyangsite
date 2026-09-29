// 新闻新增入参（PRD §7.4.1）：标题中文必填英文自动翻译、正文富文本必填、
// 发布时间必填（默认当前，可定时未来）、状态默认草稿(0)
import { IsBoolean, IsDateString, IsIn, IsNotEmpty, IsOptional, IsUrl, MaxLength } from 'class-validator';

export class CreateNewsDto {
  @IsNotEmpty({ message: '新闻标题不能为空' })
  @MaxLength(200, { message: '新闻标题不能超过 200 字' })
  titleZh!: string;

  @IsOptional()
  @MaxLength(200, { message: '英文标题不能超过 200 字符' })
  titleEn?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true }, { message: '封面图地址格式不正确' })
  @MaxLength(255, { message: '封面图地址过长' })
  coverUrl?: string;

  @IsOptional()
  @MaxLength(200, { message: '摘要不能超过 200 字' })
  summaryZh?: string;

  @IsOptional()
  @MaxLength(200, { message: '英文摘要不能超过 200 字符' })
  summaryEn?: string;

  @IsNotEmpty({ message: '新闻正文不能为空' })
  @MaxLength(15000, { message: '新闻正文不能超过 15000 字' })
  contentZh!: string;

  @IsOptional()
  @MaxLength(15000, { message: '英文正文不能超过 15000 字' })
  contentEn?: string;

  @IsDateString({}, { message: '发布时间格式不正确' })
  publishTime!: string;

  @IsOptional()
  @IsBoolean({ message: '置顶取值无效' })
  isTop?: boolean;

  @IsOptional()
  @IsIn([0, 1], { message: '状态取值无效' })
  status?: number;
}
