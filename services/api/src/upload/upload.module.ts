// 上传模块：暂存目录在启动时确保存在（multer diskStorage 需目录已建）
import { Module, OnModuleInit } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { ensureTmpDir } from './multer-options';

@Module({
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule implements OnModuleInit {
  onModuleInit(): void {
    ensureTmpDir();
  }
}
