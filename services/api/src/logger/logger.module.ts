import { Global, Module } from '@nestjs/common';
import { AppLoggerService } from './app-logger.service';

// 全局日志模块：所有业务模块可直接注入 AppLoggerService（常规 + audit 通道）
@Global()
@Module({
  providers: [AppLoggerService],
  exports: [AppLoggerService],
})
export class LoggerModule {}
