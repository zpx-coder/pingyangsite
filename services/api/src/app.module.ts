import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration, { resolveEnvFilePaths } from './config/configuration';
import { HealthModule } from './health/health.module';
import { AppLoggerService } from './logger/app-logger.service';

@Module({
  imports: [
    // 全局配置：多环境 env 文件 + 类型化配置（见 config/configuration.ts）
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: resolveEnvFilePaths(),
    }),
    HealthModule,
  ],
  providers: [AppLoggerService],
  exports: [AppLoggerService],
})
export class AppModule {}
