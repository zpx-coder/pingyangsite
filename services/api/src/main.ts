// API 服务入口（计划 §5.2：/api/v1/public/*、/api/v1/admin/*）
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { TransformInterceptor } from './common/transform.interceptor';
import { AppLoggerService } from './logger/app-logger.service';
import { REDIS_CLIENT } from './redis/redis.module';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from './auth/auth.constants';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(AppLoggerService);
  app.useLogger(logger);

  // 开发期跨域（后台 SPA 直连调试）；生产经 Nginx 同域反代
  app.enableCors();

  const config = app.get(ConfigService);

  // 服务端会话（Redis 存储，PRD §7.0 / 计划 §5.2）：
  // HttpOnly + SameSite=Lax；生产强制 Secure（TLS 1.2+）；8 小时过期
  const redis = app.get(REDIS_CLIENT);
  app.use(
    session({
      store: new RedisStore({ client: redis, prefix: `${SESSION_COOKIE_NAME}:` }),
      name: SESSION_COOKIE_NAME,
      secret: config.get<string>('sessionSecret', 'dev-only-insecure-secret'),
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.get<string>('env') === 'production',
        maxAge: SESSION_MAX_AGE_MS,
      },
    }),
  );

  // 全局入参校验（服务端独立校验，安全底线 §6）
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 剥离未声明字段
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter(logger));

  const port = config.get<number>('port', 3001);
  await app.listen(port);
  logger.log(
    `API 已启动 http://127.0.0.1:${port}（env=${config.get<string>('env')} ` +
      `storage=${config.get<string>('storageDriver')} mt=${config.get<string>('mtMode')}）`,
  );
}

void bootstrap();
