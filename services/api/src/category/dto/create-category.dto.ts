// 类目新增入参（PRD §7.3）：中文必填，英文留空时由翻译服务自动生成（方案 §5.3）
import { IsIn, IsInt, IsNotEmpty, IsOptional, MaxLength, Min } from 'class-validator';

export class CreateCategoryDto {
  @IsNotEmpty({ message: '类目名称不能为空' })
  @MaxLength(200, { message: '类目名称不能超过 200 字' })
  nameZh!: string;

  @IsOptional()
  @MaxLength(200, { message: '英文名称不能超过 200 字符' })
  nameEn?: string;

  @IsOptional()
  @MaxLength(255, { message: '图标地址过长' })
  iconUrl?: string;

  @IsOptional()
  @MaxLength(500, { message: '类目简介不能超过 500 字' })
  introZh?: string;

  @IsOptional()
  @MaxLength(500, { message: '英文简介不能超过 500 字符' })
  introEn?: string;

  @IsOptional()
  @IsInt({ message: '排序值须为整数' })
  @Min(0, { message: '排序值不能为负数' })
  sort?: number;

  @IsOptional()
  @IsIn([0, 1], { message: '状态取值无效' })
  status?: number;
}
