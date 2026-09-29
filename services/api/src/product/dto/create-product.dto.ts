// 产品新增入参（PRD §7.1）：主图必填、类目单选必填（上架类目）、企业选填、
// 英文留空自动翻译、状态默认草稿(0)；产品详情 ≤15000 字防 TEXT 列溢出
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsNotEmpty({ message: '产品名称不能为空' })
  @MaxLength(200, { message: '产品名称不能超过 200 字' })
  nameZh!: string;

  @IsOptional()
  @MaxLength(200, { message: '英文名称不能超过 200 字符' })
  nameEn?: string;

  @IsInt({ message: '所属类目 ID 须为整数' })
  categoryId!: number;

  @IsOptional()
  @IsInt({ message: '关联企业 ID 须为整数' })
  @Min(1, { message: '关联企业 ID 无效' })
  companyId?: number;

  @IsNotEmpty({ message: '请上传产品主图' })
  @IsUrl({ require_protocol: true }, { message: '主图地址格式不正确' })
  @MaxLength(255, { message: '主图地址过长' })
  mainImage!: string;

  @IsOptional()
  @IsArray({ message: '产品图集格式不正确' })
  @ArrayMaxSize(10, { message: '产品图集最多 10 张' })
  @IsUrl({ require_protocol: true }, { each: true, message: '产品图集图片地址格式不正确' })
  images?: string[];

  @IsOptional()
  @MaxLength(200, { message: '产品简介不能超过 200 字' })
  introZh?: string;

  @IsOptional()
  @MaxLength(200, { message: '英文简介不能超过 200 字符' })
  introEn?: string;

  @IsNotEmpty({ message: '产品详情不能为空' })
  @MaxLength(15000, { message: '产品详情不能超过 15000 字' })
  detailZh!: string;

  @IsOptional()
  @MaxLength(15000, { message: '英文详情不能超过 15000 字' })
  detailEn?: string;

  @IsOptional()
  @MaxLength(100, { message: '参考价格不能超过 100 字' })
  priceRef?: string;

  @IsOptional()
  @MaxLength(100, { message: '起订量不能超过 100 字' })
  moq?: string;

  @IsOptional()
  @IsInt({ message: '排序值须为整数' })
  @Min(0, { message: '排序值不能为负数' })
  sort?: number;

  @IsOptional()
  @IsIn([0, 1, 2], { message: '状态取值无效' })
  status?: number;
}
