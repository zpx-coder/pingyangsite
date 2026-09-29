// 日志脱敏工具（PRD §9.2：日志中禁止明文密码/Token/电话/邮箱等敏感信息）。
// 所有写入日志的字符串在 AppLoggerService 入口统一过 maskSensitive。

// 手机号：138****5678（保留前 3 后 4，共 11 位）
const PHONE_RE = /(1[3-9]\d)\d{4}(\d{4})/g;

// 邮箱：a***@b.com（用户名保留首字符）
const EMAIL_RE = /([a-zA-Z0-9._%+-]{1,3})[a-zA-Z0-9._%+-]*@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

// 键值形式的口令/密钥（含 Bearer Token）：
// "password":"secret" / token":"Bearer xyz" → 整体替换为 "***"
// 值允许含空格（覆盖 "Bearer abc.def"），遇引号/逗号/花括号收尾
const SECRET_KEY_RE =
  /("?(?:password|passwd|pwd|secret|token|authorization|session)"?\s*[:=]\s*"?)[^",}]+/gi;

export function maskSensitive(text: string): string {
  return text
    .replace(SECRET_KEY_RE, '$1***')
    .replace(PHONE_RE, '$1****$2')
    .replace(EMAIL_RE, '$1***@$2');
}

export function maskPhone(phone: string): string {
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
}
