// 存储驱动统一接口（任务 1.3 验收：本地与 OSS 两种驱动接口一致，切换仅改环境变量）
import type { StoredObject, UploadSource, UploadScope } from './storage.types';

export interface StorageDriver {
  readonly name: 'local' | 'oss';

  /** 落存储：本地驱动缩略图生成在此完成；OSS 驱动缩略图为按需裁剪 URL */
  save(source: UploadSource, scope: UploadScope): Promise<StoredObject>;

  /** 删除存储对象（图片替换/内容清理时调用；本地驱动一并清理缩略图） */
  delete(key: string): Promise<void>;
}
