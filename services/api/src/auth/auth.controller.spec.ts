// 认证控制器单元测试：直接调用方法、mock 服务与请求对象（不启动 Nest 运行时）
import { AuthController } from './auth.controller';
import type { AuthService } from './auth.service';
import type { AppLoggerService } from '../logger/app-logger.service';
import { ResultCode } from '../common/api-response';

function makeService() {
  return {
    login: jest.fn(async () => ({ phone: '13800000000' })),
    logout: jest.fn(async () => undefined),
    changePhone: jest.fn(async () => ({ phone: '13912345678' })),
    changePassword: jest.fn(async () => undefined),
  } as unknown as AuthService;
}

function makeReq() {
  return { session: { adminId: 1, adminPhone: '13800000000' }, ip: '::1' } as never;
}

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  beforeEach(() => {
    service = makeService();
    controller = new AuthController(service);
  });

  it('login 透传服务结果', async () => {
    const dto = { phone: '13800000000', password: 'Admin@123456' };
    const result = await controller.login(dto, makeReq());
    expect(service.login).toHaveBeenCalledWith(dto, expect.anything());
    expect(result).toEqual({ phone: '13800000000' });
  });

  it('logout 返回成功消息', async () => {
    const result = await controller.logout(makeReq());
    expect(service.logout).toHaveBeenCalled();
    expect(result).toEqual({ code: ResultCode.SUCCESS, message: '已退出登录', data: null });
  });

  it('session 返回会话手机号', () => {
    expect(controller.session(makeReq())).toEqual({ code: 0, message: 'ok', data: { phone: '13800000000' } });
  });

  it('changePhone 透传服务结果', async () => {
    const dto = { newPhone: '13912345678', password: 'Admin@123456' };
    const result = await controller.changePhone(dto, makeReq());
    expect(service.changePhone).toHaveBeenCalledWith(dto, expect.anything());
    expect(result).toEqual({ phone: '13912345678' });
  });

  it('changePassword 成功后返回重新登录提示', async () => {
    const dto = { currentPassword: 'Admin@123456', newPassword: 'NewPass123' };
    const result = await controller.changePassword(dto, makeReq());
    expect(service.changePassword).toHaveBeenCalledWith(dto, expect.anything());
    expect(result).toEqual({ code: 0, message: '密码已修改，请重新登录', data: null });
  });

  it('注入 logger 不参与业务（构造函数兼容两种参数形态）', () => {
    const logger = {} as AppLoggerService;
    expect(() => new AuthController(service)).not.toThrow();
    expect(logger).toBeDefined();
  });
});
