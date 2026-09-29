// 全局翻译模块：按 MT_MODE 环境变量装配驱动（任务 1.4 验收：
// mock 模式零网络请求不消耗配额；切 real 仅改环境变量，凭证缺失拒绝启动）。
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MtDriver } from './translation.types';
import { MockDriver } from './mock.driver';
import { AliyunDriver } from './aliyun.driver';
import { TranslationService } from './translation.service';
import { MT_DRIVER } from './translation.constants';

@Global()
@Module({
  providers: [
    {
      provide: MT_DRIVER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): MtDriver =>
        config.get<string>('mt.mode', 'mock') === 'real' ? new AliyunDriver(config) : new MockDriver(),
    },
    TranslationService,
  ],
  exports: [MT_DRIVER, TranslationService],
})
export class TranslationModule {}
