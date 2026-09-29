// 健康检查控制器单元测试（任务 1.1 验收「空接口返回统一结构」）
import { ResultCode } from '../common/api-response';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('返回统一结构且时间为合法 ISO 串', () => {
    const result = new HealthController().health();
    expect(result.code).toBe(ResultCode.SUCCESS);
    expect(result.message).toBe('ok');
    expect(result.data).not.toBeNull();
    const data = result.data as { status: string; time: string };
    expect(data.status).toBe('ok');
    expect(data.time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(Number.isNaN(Date.parse(data.time))).toBe(false);
  });
});
