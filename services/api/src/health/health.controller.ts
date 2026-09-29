// 健康检查接口：统一响应结构示例（任务 1.1 验收「空接口返回统一结构」）
import { Controller, Get } from '@nestjs/common';
import { ok } from '../common/api-response';

@Controller('api/v1')
export class HealthController {
  @Get('health')
  health(): ReturnType<typeof ok> {
    return ok({ status: 'ok', time: new Date().toISOString() });
  }
}
