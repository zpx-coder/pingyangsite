// 统一响应结构单元测试（计划 §5.2）
import { fail, ok, ResultCode } from './api-response';

describe('api-response', () => {
  it('ok 返回 code=0 与数据', () => {
    expect(ok({ id: 1 })).toEqual({ code: ResultCode.SUCCESS, message: 'ok', data: { id: 1 } });
  });

  it('ok 支持自定义消息', () => {
    expect(ok(null, '已退出登录')).toEqual({ code: 0, message: '已退出登录', data: null });
  });

  it('fail 返回业务码与 null 数据', () => {
    expect(fail(40000, '参数不正确')).toEqual({ code: 40000, message: '参数不正确', data: null });
  });

  it('结果码符合计划 §5.2 约定', () => {
    expect(ResultCode).toEqual({
      SUCCESS: 0,
      BAD_REQUEST: 40000,
      UNAUTHORIZED: 40100,
      FORBIDDEN: 40300,
      NOT_FOUND: 40400,
      TOO_MANY_REQUESTS: 42900,
      INTERNAL_ERROR: 50000,
    });
  });
});
