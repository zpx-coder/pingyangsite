// 翻译服务单元测试（任务 1.12，PRD §5.2.5「失败不阻塞保存」）：
//   - translateSafe 成功时返回与入参一一对应的译文，空串占位保留；
//   - 失败返回 null 并留 audit 日志，绝不向上抛出、不阻塞业务保存。
import { TranslationService } from './translation.service';
import type { AppLoggerService } from '../logger/app-logger.service';
import type { MtDriver } from './translation.types';

function makeDriver() {
  return {
    name: 'mock' as const,
    translate: jest.fn(async (texts: string[]) => texts.map((text) => `[en] ${text}`)),
  } as unknown as MtDriver;
}

function makeService() {
  const driver = makeDriver();
  const logger = { audit: jest.fn() } as unknown as AppLoggerService;
  return { service: new TranslationService(driver, logger), driver, logger };
}

describe('TranslationService.translateSafe', () => {
  it('成功：空串占位保留、译文与入参一一对应', async () => {
    const { service, driver } = makeService();
    const result = await service.translateSafe(['你好', '', '  ', '世界'], 'zh', 'en');
    expect(driver.translate).toHaveBeenCalledWith(['你好', '世界'], 'zh', 'en');
    expect(result).toEqual(['[en] 你好', '', '', '[en] 世界']);
  });

  it('全部为空文本时直接返回空串数组，不调用驱动', async () => {
    const { service, driver } = makeService();
    await expect(service.translateSafe(['', '  '], 'zh', 'en')).resolves.toEqual(['', '']);
    expect(driver.translate).not.toHaveBeenCalled();
  });

  it('空数组直接返回空数组', async () => {
    const { service, driver } = makeService();
    await expect(service.translateSafe([], 'zh', 'en')).resolves.toEqual([]);
    expect(driver.translate).not.toHaveBeenCalled();
  });

  it('失败：返回 null 并留 audit 日志（Error 取 name 作原因）', async () => {
    const { service, driver, logger } = makeService();
    (driver.translate as jest.Mock).mockRejectedValueOnce(new Error('network down'));
    await expect(service.translateSafe(['你好'], 'zh', 'en')).resolves.toBeNull();
    expect(logger.audit).toHaveBeenCalledWith('translate', 'system', {
      result: 'fail',
      driver: 'mock',
      source: 'zh',
      target: 'en',
      reason: 'Error',
    });
  });

  it('失败：非 Error 异常 reason 记为 unknown', async () => {
    const { service, driver, logger } = makeService();
    (driver.translate as jest.Mock).mockRejectedValueOnce('boom');
    await expect(service.translateSafe(['你好'], 'zh', 'en')).resolves.toBeNull();
    expect(logger.audit).toHaveBeenCalledWith(
      'translate',
      'system',
      expect.objectContaining({ result: 'fail', reason: 'unknown' }),
    );
  });
});
