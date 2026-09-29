// 新闻新增 DTO 校验规则单元测试（PRD §7.4.1：服务端独立校验）
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateNewsDto } from './create-news.dto';

async function errorMessages(data: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(CreateNewsDto, data));
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

const VALID = {
  titleZh: '新闻标题',
  contentZh: '新闻正文内容'.repeat(3),
  publishTime: '2026-01-01T08:00:00.000Z',
};

describe('CreateNewsDto', () => {
  it('合法样例通过', async () => {
    expect(await errorMessages(VALID)).toEqual([]);
  });

  it('完整可选字段样例通过', async () => {
    expect(
      await errorMessages({
        ...VALID,
        titleEn: 'News Title',
        coverUrl: 'https://example.com/a.jpg',
        summaryZh: '摘要',
        summaryEn: 'Summary',
        contentEn: 'Content',
        isTop: true,
        status: 1,
      }),
    ).toEqual([]);
  });

  it('中文标题必填且不超过 200 字', async () => {
    expect(await errorMessages({ ...VALID, titleZh: undefined })).toContain('新闻标题不能为空');
    expect(await errorMessages({ ...VALID, titleZh: '' })).toContain('新闻标题不能为空');
    expect(await errorMessages({ ...VALID, titleZh: 'x'.repeat(201) })).toContain('新闻标题不能超过 200 字');
  });

  it('英文标题不超过 200 字符', async () => {
    expect(await errorMessages({ ...VALID, titleEn: 'x'.repeat(201) })).toContain(
      '英文标题不能超过 200 字符',
    );
  });

  it('封面图须为完整 URL 且不超过 255 字符', async () => {
    expect(await errorMessages({ ...VALID, coverUrl: 'not-a-url' })).toContain('封面图地址格式不正确');
    expect(await errorMessages({ ...VALID, coverUrl: `https://example.com/${'x'.repeat(250)}` })).toContain(
      '封面图地址过长',
    );
  });

  it('中英文摘要各不超过 200 字', async () => {
    expect(await errorMessages({ ...VALID, summaryZh: 'x'.repeat(201) })).toContain('摘要不能超过 200 字');
    expect(await errorMessages({ ...VALID, summaryEn: 'x'.repeat(201) })).toContain(
      '英文摘要不能超过 200 字符',
    );
  });

  it('正文必填且不超过 15000 字', async () => {
    expect(await errorMessages({ ...VALID, contentZh: undefined })).toContain('新闻正文不能为空');
    expect(await errorMessages({ ...VALID, contentZh: 'x'.repeat(15001) })).toContain(
      '新闻正文不能超过 15000 字',
    );
    expect(await errorMessages({ ...VALID, contentEn: 'x'.repeat(15001) })).toContain(
      '英文正文不能超过 15000 字',
    );
  });

  it('发布时间必填且须为日期字符串', async () => {
    expect(await errorMessages({ ...VALID, publishTime: undefined })).toContain('发布时间格式不正确');
    expect(await errorMessages({ ...VALID, publishTime: '2026-13-01' })).toContain('发布时间格式不正确');
  });

  it('置顶与状态取值受限', async () => {
    expect(await errorMessages({ ...VALID, isTop: 'yes' })).toContain('置顶取值无效');
    expect(await errorMessages({ ...VALID, status: 2 })).toContain('状态取值无效');
  });
});
