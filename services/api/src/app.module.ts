import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration, { resolveEnvFilePaths } from './config/configuration';
import { HealthModule } from './health/health.module';
import { LoggerModule } from './logger/logger.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './auth/auth.module';
import { UploadModule } from './upload/upload.module';
import { TranslationModule } from './translation/translation.module';
import { CategoryModule } from './category/category.module';
import { CompanyModule } from './company/company.module';

@Module({
  imports: [
    // 全局配置：多环境 env 文件 + 类型化配置（见 config/configuration.ts）
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: resolveEnvFilePaths(),
    }),
    LoggerModule,
    PrismaModule,
    RedisModule,
    StorageModule,
    HealthModule,
    AuthModule,
    UploadModule,
    TranslationModule,
    CategoryModule,
    CompanyModule,
  ],
})
export class AppModule {}
