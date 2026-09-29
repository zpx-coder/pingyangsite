// API 服务入口（计划 §5.2：/api/v1/public/*、/api/v1/admin/*）
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { TransformInterceptor } from './common/transform.interceptor';
import { AppLoggerService } from './logger/app-logger.service';
import { REDIS_CLIENT } from './redis/redis.module';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from './auth/auth.constants';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });

  const logger = app.get(AppLoggerService);
  app.useLogger(logger);

  // 开发期跨域（后台 SPA 直连调试）；生产经 Nginx 同域反代
  app.enableCors();

  const config = app.get(ConfigService);

  // 本地存储驱动：uploads 目录以 /uploads 前缀静态服务（OSS 模式由 CDN 分发，无需本地静态）
  if (config.get('storage.driver', 'local') === 'local') {
    app.useStaticAssets(config.getOrThrow<string>('storage.local.dir'), { prefix: '/uploads/' });
  }

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

  // 接口文档（任务 1.13）：开发/预发环境可访问 /docs 查测全部接口，生产环境关闭
  const env = config.get<string>('env', 'development');
  if (env !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('平阳产业带官网 API')
      .setDescription(
        '官网与后台全部接口。管理端接口依赖登录会话（HttpOnly Cookie，Swagger 页面不可手动填写）：' +
          '先在「认证」分组调用登录接口，浏览器自动携带会话 Cookie 后即可调用其余管理端接口。',
      )
      .setVersion('1.0.0')
      .addCookieAuth(SESSION_COOKIE_NAME, { type: 'apiKey', in: 'cookie' }, 'admin-session')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
    logger.log(`接口文档已启用 http://127.0.0.1:${port}/docs（生产环境自动关闭）`);
  }
  await app.listen(port);
  logger.log(
    `API 已启动 http://127.0.0.1:${port}（env=${config.get<string>('env')} ` +
      `storage=${config.get<string>('storageDriver')} mt=${config.get<string>('mtMode')}）`,
  );
}

void bootstrap();
