// 应用日志服务（任务 1.1）：
//   - 常规日志（Nest LoggerService 接口）：控制台 + logs/app-*.log 按日滚动；
//   - 关键操作留痕 audit()：logs/audit-*.log，独立通道（计划 §9 / PRD §9.2：
//     登录、增删改、导出、账号变更，不建审计表）；
//   - 所有内容写入前统一脱敏（电话/邮箱/密码/Token），见 mask.ts。
import { Injectable, LoggerService } from '@nestjs/common';
import { createLogger, format, Logger, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { maskSensitive } from './mask';

// 相对 services/api 运行目录；仓库根 .gitignore 已忽略 logs/
const LOG_DIR = 'logs';
const LOG_MAX_FILES = '30d'; // 日志保留 30 天，与数据库备份周期对齐

function buildWinstonLogger(filename: string): Logger {
  return createLogger({
    level: process.env.LOG_LEVEL ?? 'info',
    format: format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.printf(({ timestamp, level, message }) => {
        return `[${String(timestamp)}] ${String(level).toUpperCase()} ${String(message)}`;
      }),
    ),
    transports: [
      new transports.Console(),
      new DailyRotateFile({
        dirname: LOG_DIR,
        filename: `${filename}-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: LOG_MAX_FILES,
      }),
    ],
  });
}

@Injectable()
export class AppLoggerService implements LoggerService {
  private readonly appLogger = buildWinstonLogger('app');
  private readonly auditLogger = buildWinstonLogger('audit');

  log(message: string, ...optionalParams: unknown[]): void {
    this.appLogger.info(this.compose(message, optionalParams));
  }

  error(message: string, ...optionalParams: unknown[]): void {
    this.appLogger.error(this.compose(message, optionalParams));
  }

  warn(message: string, ...optionalParams: unknown[]): void {
    this.appLogger.warn(this.compose(message, optionalParams));
  }

  debug(message: string, ...optionalParams: unknown[]): void {
    this.appLogger.debug(this.compose(message, optionalParams));
  }

  verbose(message: string, ...optionalParams: unknown[]): void {
    this.appLogger.verbose(this.compose(message, optionalParams));
  }

  /**
   * 关键操作留痕（独立 audit 日志通道）。
   * @param action 操作类型：login / create / update / delete / export / account
   * @param actor  操作者标识（如手机号，写入前脱敏）
   * @param detail 结构化明细（写入前统一脱敏）
   */
  audit(action: string, actor: string, detail: Record<string, unknown> = {}): void {
    const line = `[audit] action=${action} actor=${actor} detail=${JSON.stringify(detail)}`;
    this.auditLogger.info(maskSensitive(line));
  }

  // Nest 传入顺序为 (message, stack?, context?)；拼接后统一脱敏再交给 winston
  private compose(message: string, params: unknown[]): string {
    const parts: string[] = [];
    for (const param of params) {
      if (typeof param === 'string') parts.push(param);
      else if (param !== undefined && param !== null) parts.push(JSON.stringify(param));
    }
    return maskSensitive(parts.length > 0 ? `${message} ${parts.join(' ')}` : message);
  }
}
