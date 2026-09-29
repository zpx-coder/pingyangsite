// 日志脱敏工具单元测试（PRD §9.2：日志禁止明文密码/Token/电话/邮箱）
import { maskPhone, maskSensitive } from './mask';

describe('maskSensitive', () => {
  it('手机号保留前 3 后 4', () => {
    expect(maskSensitive('登录 13812345678 成功')).toBe('登录 138****5678 成功');
    expect(maskSensitive('a13812345678b')).toBe('a138****5678b');
  });

  it('邮箱用户名保留前 1–3 字符', () => {
    expect(maskSensitive('b@example.com')).toBe('b***@example.com');
    expect(maskSensitive('buyer@example.com')).toBe('buy***@example.com');
  });

  it('键值形式的密码/token 整体替换', () => {
    expect(maskSensitive('"password":"abc123"')).toBe('"password":"***"');
    expect(maskSensitive('"token":"Bearer eyJhbGci.xyz"')).toBe('"token":"***"');
    expect(maskSensitive('password=secret1')).toBe('password=***');
  });

  it('无敏感内容时原样返回', () => {
    expect(maskSensitive('普通日志信息')).toBe('普通日志信息');
  });
});

describe('maskPhone', () => {
  it('11 位手机号脱敏', () => {
    expect(maskPhone('13800000000')).toBe('138****0000');
  });

  it('非 11 位数字原样返回', () => {
    expect(maskPhone('12345')).toBe('12345');
    expect(maskPhone('138000000001')).toBe('138000000001');
  });
});
