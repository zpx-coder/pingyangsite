// 全局 Redis 客户端（计划 §5.2：验证码、IP 限流、服务端会话均走本机 Redis 7.0.15）
// 客户端为 node-redis v5（与 connect-redis v10 官方配对）
import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import { AppLoggerService } from '../logger/app-logger.service';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: async (config: ConfigService, logger: AppLoggerService): Promise<RedisClientType> => {
        const client = createClient({
          socket: {
            host: config.get<string>('redis.host', '127.0.0.1'),
            port: config.get<number>('redis.port', 6379),
          },
        });
        client.on('error', (err: Error) => logger.error('[redis] 连接异常', err.message));
        await client.connect();
        logger.log(`[redis] 已连接 ${config.get<string>('redis.host', '127.0.0.1')}:${config.get<number>('redis.port', 6379)}`);
        return client;
      },
      inject: [ConfigService, AppLoggerService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: RedisClientType) {}

  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit();
  }
}
