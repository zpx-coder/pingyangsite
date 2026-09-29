// @nestjs/swagger 测试替身（任务 1.13）：该包为纯 ESM，单测经 moduleNameMapper 映射到本文件；
// 装饰器仅为文档元数据，单测中全部退化为 noop。与 nest-common.mock 同一 noop 模式。
type AnyDecorator = (...args: never[]) => unknown;

const noop = (): AnyDecorator => ((..._args: unknown[]) => (() => undefined)) as unknown as AnyDecorator;

export const ApiTags = noop();
export const ApiOperation = noop();
export const ApiProperty = noop();
export const ApiPropertyOptional = noop();
export const ApiResponse = noop();
export const ApiOkResponse = noop();
export const ApiCreatedResponse = noop();
export const ApiBadRequestResponse = noop();
export const ApiUnauthorizedResponse = noop();
export const ApiForbiddenResponse = noop();
export const ApiNotFoundResponse = noop();
export const ApiTooManyRequestsResponse = noop();
export const ApiQuery = noop();
export const ApiParam = noop();
export const ApiBody = noop();
export const ApiHeader = noop();
export const ApiConsumes = noop();
export const ApiCookieAuth = noop();
export const ApiBearerAuth = noop();
export const ApiExcludeEndpoint = noop();
export const ApiExtraModels = noop();
export const ApiHideProperty = noop();

// 辅助类型（DTO 注解用到 OmitType 等时保持编译通过）
export const OmitType = (): unknown => undefined;
export const PartialType = (): unknown => undefined;
export const PickType = (): unknown => undefined;
export const IntersectionType = (): unknown => undefined;

export const getSchemaPath = (): string => '';
