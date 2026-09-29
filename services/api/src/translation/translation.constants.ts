// 翻译驱动注入令牌（独立文件避免 TranslationModule ↔ TranslationService 循环依赖）
export const MT_DRIVER = Symbol('MT_DRIVER');
