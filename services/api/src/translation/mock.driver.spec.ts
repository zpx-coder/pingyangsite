// Mock 翻译驱动单元测试（任务 1.12）：零网络、输出与入参一一对应
import { MockDriver } from './mock.driver';

describe('MockDriver', () => {
  const driver = new MockDriver();

  it('name 标识为 mock', () => {
    expect(driver.name).toBe('mock');
  });

  it('生成 [target] 样例译文', async () => {
    await expect(driver.translate(['你好', '世界'], 'zh', 'en')).resolves.toEqual(['[en] 你好', '[en] 世界']);
  });

  it('target 为中文时同样工作', async () => {
    await expect(driver.translate(['hello'], 'en', 'zh')).resolves.toEqual(['[zh] hello']);
  });

  it('空串与纯空白原样返回空串', async () => {
    await expect(driver.translate(['', '  ', 'ok'], 'zh', 'en')).resolves.toEqual(['', '', '[en] ok']);
  });

  it('首尾空白被裁剪', async () => {
    await expect(driver.translate(['  你好  '], 'zh', 'en')).resolves.toEqual(['[en] 你好']);
  });
});
