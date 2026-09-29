// 存储适配层公共类型（任务 1.3，方案 §4.5）：
//   - LocalDriver 与 OssDriver 实现同一 StorageDriver 接口，切换仅改 STORAGE_DRIVER；
//   - StoredObject 的 url / thumbnailUrl 可直接写入数据库（images 等 TEXT 列）。
export type UploadScope = 'product' | 'company' | 'news' | 'content' | 'video';

/** multer diskStorage 暂存后的文件描述（最小字段集，不依赖 @types/multer） */
export interface StagedFile {
  /** 暂存磁盘路径（驱动保存成功后由编排层清理） */
  path: string;
  /** 客户端原始文件名（仅用于 audit 留痕，服务端命名不采用） */
  originalname: string;
  size: number;
  mimetype?: string;
}

/** 经校验与魔数嗅探后的上传源（服务端命名唯一依据是 detectedExt，非客户端声明） */
export interface UploadSource {
  tempPath: string;
  originalName: string;
  size: number;
  /** 魔数嗅探确定的媒体大类 */
  detectedKind: 'image' | 'video';
  /** 魔数嗅探确定的真实扩展名（不含点）：jpg / png / webp / mp4 */
  detectedExt: string;
}

/** 驱动统一返回结构 */
export interface StoredObject {
  /** 存储键（scope/yyyymm/uuid.ext），删除与排查用 */
  key: string;
  /** 原文件公开地址 */
  url: string;
  /** 图片缩略图地址；视频为 null（PRD：视频封面由运营单独上传） */
  thumbnailUrl: string | null;
}
