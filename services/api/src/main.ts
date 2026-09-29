// API 服务入口（计划 §5.2：/api/v1/public/*、/api/v1/admin/*）
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { TransformInterceptor } from './common/transform.interceptor';
import { AppLoggerService } from './logger/app-logger.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(AppLoggerService);
  app.useLogger(logger);

  // 开发期跨域（后台 SPA 直连调试）；生产经 Nginx 同域反代
  app.enableCors();

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter(logger));

  const config = app.get(ConfigService);
  const port = config.get<number>('port', 3001);
  await app.listen(port);
  logger.log(
    `API 已启动 http://127.0.0.1:${port}（env=${config.get<string>('env')} ` +
      `storage=${config.get<string>('storageDriver')} mt=${config.get<string>('mtMode')}）`,
  );
}

void bootstrap();
