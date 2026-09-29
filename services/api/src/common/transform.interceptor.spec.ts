// 统一响应拦截器单元测试（任务 1.12）：
//   - 控制器返回值自动包装 { code: 0, message: 'ok', data }；
//   - 已含 code/message/data 三字段的返回值原样透传（如控制器自定义 message 的响应）。
import { firstValueFrom, of } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { TransformInterceptor } from './transform.interceptor';

function intercept(data: unknown): Promise<unknown> {
  const next = { handle: () => of(data) } as unknown as CallHandler;
  return firstValueFrom(new TransformInterceptor().intercept({} as unknown as ExecutionContext, next));
}

describe('TransformInterceptor', () => {
  it('普通对象包装为统一结构', async () => {
    await expect(intercept({ id: 1, name: '企业A' })).resolves.toEqual({
      code: 0,
      message: 'ok',
      data: { id: 1, name: '企业A' },
    });
  });

  it('null 数据包装为 data: null', async () => {
    await expect(intercept(null)).resolves.toEqual({ code: 0, message: 'ok', data: null });
  });

  it('数组与标量同样包装', async () => {
    await expect(intercept([1, 2])).resolves.toEqual({ code: 0, message: 'ok', data: [1, 2] });
    await expect(intercept('ok')).resolves.toEqual({ code: 0, message: 'ok', data: 'ok' });
  });

  it('已含三字段的响应原样透传（保留自定义 message）', async () => {
    const body = { code: 0, message: '已退出登录', data: null };
    await expect(intercept(body)).resolves.toBe(body);
  });

  it('缺少任一字段的对象视为业务数据包装', async () => {
    await expect(intercept({ code: 1, message: 'x' })).resolves.toEqual({
      code: 0,
      message: 'ok',
      data: { code: 1, message: 'x' },
    });
  });
});
