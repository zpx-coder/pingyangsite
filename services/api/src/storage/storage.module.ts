// 全局存储模块：按 STORAGE_DRIVER 环境变量装配驱动（任务 1.3 验收：
// 本地与 OSS 两种驱动接口一致，切换仅改环境变量，无代码改动）。
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { StorageDriver } from './storage-driver.interface';
import { LocalDriver } from './local.driver';
import { OssDriver } from './oss.driver';

export const STORAGE_DRIVER = Symbol('STORAGE_DRIVER');

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_DRIVER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): StorageDriver =>
        config.get<string>('storage.driver', 'local') === 'oss' ? new OssDriver(config) : new LocalDriver(config),
    },
  ],
  exports: [STORAGE_DRIVER],
})
export class StorageModule {}
