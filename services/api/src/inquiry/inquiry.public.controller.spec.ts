// 官网询盘公开控制器单元测试：验证码获取/图片响应头、提交留痕（IP 兜底）
import type { Request, Response } from 'express';
import { InquiryPublicController } from './inquiry.public.controller';
import type { InquiryService } from './inquiry.service';
import type { AppLoggerService } from '../logger/app-logger.service';

function makeService() {
  return {
    createCaptcha: jest.fn(async () => ({ captchaId: 'cid', svg: '<svg/>' })),
    captchaImage: jest.fn(async () => '<svg>img</svg>'),
    submit: jest.fn(async () => ({ id: 7 })),
  } as unknown as InquiryService;
}

function makeLogger() {
  return { audit: jest.fn() } as unknown as AppLoggerService;
}

function makeReq(ip?: string): Request {
  return { ip } as unknown as Request;
}

function makeRes(): Response {
  return { setHeader: jest.fn(), end: jest.fn() } as unknown as Response;
}

describe('InquiryPublicController', () => {
  let controller: InquiryPublicController;
  let service: InquiryService;
  let logger: AppLoggerService;

  beforeEach(() => {
    service = makeService();
    logger = makeLogger();
    controller = new InquiryPublicController(service, logger);
  });

  it('captcha 透传服务结果', async () => {
    await expect(controller.captcha()).resolves.toEqual({ captchaId: 'cid', svg: '<svg/>' });
    expect(service.createCaptcha).toHaveBeenCalled();
  });

  it('captchaImage：SVG 响应头（不缓存）并输出内容', async () => {
    const res = makeRes();
    await controller.captchaImage('cid', res);
    expect(service.captchaImage).toHaveBeenCalledWith('cid');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/svg+xml; charset=utf-8');
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(res.end).toHaveBeenCalledWith('<svg>img</svg>');
  });

  it('submit：透传 DTO 与 IP 并留痕', async () => {
    const dto = {
      captchaId: 'cid',
      captchaCode: 'AB12',
      name: '张三',
      country: '中国',
      email: 'a@b.com',
      phone: '13800138000',
      content: '我想了解产品详情',
      productId: 5,
      lang: 'zh-CN',
    };
    await controller.submit(dto, makeReq('::1'));
    expect(service.submit).toHaveBeenCalledWith(dto, '::1');
    expect(logger.audit).toHaveBeenCalledWith('inquiry.submit', 'public', {
      id: 7,
      productId: 5,
      country: '中国',
      lang: 'zh-CN',
      ip: '::1',
    });
  });

  it('submit：无 IP 与可选字段时兜底 unknown / null / 默认语言', async () => {
    const dto = {
      captchaId: 'cid',
      captchaCode: 'AB12',
      name: '张三',
      country: '中国',
      email: 'a@b.com',
      phone: '13800138000',
      content: '我想了解产品详情',
    };
    await controller.submit(dto, makeReq(undefined));
    expect(service.submit).toHaveBeenCalledWith(dto, 'unknown');
    expect(logger.audit).toHaveBeenCalledWith('inquiry.submit', 'public', {
      id: 7,
      productId: null,
      country: '中国',
      lang: 'zh-CN',
      ip: 'unknown',
    });
  });
});
