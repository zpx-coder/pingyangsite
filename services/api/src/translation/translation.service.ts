// 翻译服务（任务 1.4，方案 §5.3）：
//   - translateSafe：业务模块在保存时调用的统一入口——翻译失败返回 null 并留审计日志，
//     绝不阻塞保存（PRD §5.2.5「失败不阻塞保存」）；
//   - 业务模块写入译文后调用 markMachineFields 打机器翻译标记。
import { Inject, Injectable } from '@nestjs/common';
import { AppLoggerService } from '../logger/app-logger.service';
import type { MtDriver, MtLanguage } from './translation.types';
import { MT_DRIVER } from './translation.constants';

@Injectable()
export class TranslationService {
  constructor(
    @Inject(MT_DRIVER) private readonly driver: MtDriver,
    private readonly logger: AppLoggerService,
  ) {}

  /** 翻译统一入口：成功返回与入参一一对应的译文；失败返回 null（不抛出、不阻塞保存） */
  async translateSafe(texts: string[], source: MtLanguage, target: MtLanguage): Promise<string[] | null> {
    const nonEmpty = texts.filter((text) => text.trim() !== '');
    if (nonEmpty.length === 0) {
      return texts.map(() => '');
    }
    try {
      const translated = await this.driver.translate(nonEmpty, source, target);
      let index = 0;
      return texts.map((text) => (text.trim() === '' ? '' : translated[index++]));
    } catch (err) {
      // 降级：翻译失败仅留审计日志，保存流程不受影响
      this.logger.audit('translate', 'system', {
        result: 'fail',
        driver: this.driver.name,
        source,
        target,
        reason: err instanceof Error ? err.name : 'unknown',
      });
      return null;
    }
  }
}
