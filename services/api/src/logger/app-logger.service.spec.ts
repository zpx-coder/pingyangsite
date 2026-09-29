// 应用日志服务单元测试（任务 1.12）：
//   - mock winston 与 winston-daily-rotate-file，避免真实创建 logs/ 目录；
//   - 断言常规日志委派与参数拼接、audit 输出含 action/actor/detail 且经 maskSensitive
//     脱敏（手机号/密码/邮箱不留明文，PRD §9.2）。
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  })),
  transports: { Console: jest.fn() },
  format: { combine: jest.fn(), timestamp: jest.fn(), printf: jest.fn() },
}));
jest.mock('winston-daily-rotate-file', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import { createLogger, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { AppLoggerService } from './app-logger.service';

interface LoggerMock {
  info: jest.Mock;
  error: jest.Mock;
  warn: jest.Mock;
  debug: jest.Mock;
  verbose: jest.Mock;
}

function makeService() {
  const service = new AppLoggerService();
  // 构造时依次创建 app / audit 两个 logger，取最近两次 createLogger 的返回值
  const results = (createLogger as unknown as jest.Mock).mock.results;
  const appLogger = results[results.length - 2].value as LoggerMock;
  const auditLogger = results[results.length - 1].value as LoggerMock;
  return { service, appLogger, auditLogger };
}

describe('AppLoggerService', () => {
  it('构造时按规格创建 app / audit 两个日志器（控制台 + 按日滚动）', () => {
    makeService();
    const mock = createLogger as unknown as jest.Mock;
    const appCall = mock.mock.calls.at(-2)[0];
    const auditCall = mock.mock.calls.at(-1)[0];
    expect(appCall.level).toBe('info');
    expect(appCall.transports).toHaveLength(2);
    expect(auditCall.transports).toHaveLength(2);
    expect(transports.Console).toHaveBeenCalled();
    expect(DailyRotateFile).toHaveBeenCalledWith({
      dirname: 'logs',
      filename: 'app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
    });
    expect(DailyRotateFile).toHaveBeenCalledWith({
      dirname: 'logs',
      filename: 'audit-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
    });
  });

  it('log 委派到应用日志器并拼接字符串参数', () => {
    const { service, appLogger } = makeService();
    service.log('任务执行完成', 'task-1');
    expect(appLogger.info).toHaveBeenCalledWith('任务执行完成 task-1');
  });

  it('error 对字符串堆栈统一脱敏', () => {
    const { service, appLogger } = makeService();
    service.error('请求失败', 'Error: 联系 13812345678 超时');
    expect(appLogger.error).toHaveBeenCalledWith('请求失败 Error: 联系 138****5678 超时');
  });

  it('warn/debug/verbose 各自委派', () => {
    const { service, appLogger } = makeService();
    service.warn('w1');
    service.debug('d1');
    service.verbose('v1');
    expect(appLogger.warn).toHaveBeenCalledWith('w1');
    expect(appLogger.debug).toHaveBeenCalledWith('d1');
    expect(appLogger.verbose).toHaveBeenCalledWith('v1');
  });

  it('对象参数 JSON 序列化，null/undefined 跳过', () => {
    const { service, appLogger } = makeService();
    service.log('payload', { id: 1 }, null, undefined);
    expect(appLogger.info).toHaveBeenCalledWith('payload {"id":1}');
  });

  it('audit 走独立通道，输出含 action/actor/detail 且整体脱敏', () => {
    const { service, appLogger, auditLogger } = makeService();
    service.audit('login', '13812345678', { password: 'abc123', contact: 'buyer@example.com' });
    expect(appLogger.info).not.toHaveBeenCalled();
    const [line] = auditLogger.info.mock.calls[0] as [string];
    expect(line).toContain('[audit] action=login actor=138****5678');
    expect(line).toContain('"password":"***"');
    expect(line).toContain('buy***@example.com');
    expect(line).not.toContain('abc123');
    expect(line).not.toContain('13812345678');
  });

  it('audit 默认 detail 为空对象', () => {
    const { service, auditLogger } = makeService();
    service.audit('logout', '13812345678');
    const [line] = auditLogger.info.mock.calls[0] as [string];
    expect(line).toContain('[audit] action=logout actor=138****5678 detail={}');
  });
});
