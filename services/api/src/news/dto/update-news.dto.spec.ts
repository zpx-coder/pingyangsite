// 新闻编辑 DTO 校验规则单元测试：全部可选，仅校验传入字段
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateNewsDto } from './update-news.dto';

async function errorMessages(data: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(UpdateNewsDto, data));
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('UpdateNewsDto', () => {
  it('空对象（全字段可选）与合法样例通过', async () => {
    expect(await errorMessages({})).toEqual([]);
    expect(
      await errorMessages({
        titleZh: '标题',
        titleEn: 'Title',
        coverUrl: 'https://example.com/a.jpg',
        summaryZh: '摘要',
        summaryEn: 'Summary',
        contentZh: '正文',
        contentEn: 'Content',
        publishTime: '2026-01-01T08:00:00.000Z',
        isTop: false,
        status: 0,
      }),
    ).toEqual([]);
  });

  it('中英标题长度受限', async () => {
    expect(await errorMessages({ titleZh: 'x'.repeat(201) })).toContain('新闻标题不能超过 200 字');
    expect(await errorMessages({ titleEn: 'x'.repeat(201) })).toContain('英文标题不能超过 200 字符');
  });

  it('封面图 URL 格式与长度校验', async () => {
    expect(await errorMessages({ coverUrl: 'abc' })).toContain('封面图地址格式不正确');
    expect(await errorMessages({ coverUrl: `https://example.com/${'x'.repeat(250)}` })).toContain(
      '封面图地址过长',
    );
  });

  it('中英文摘要与正文长度受限', async () => {
    expect(await errorMessages({ summaryZh: 'x'.repeat(201) })).toContain('摘要不能超过 200 字');
    expect(await errorMessages({ summaryEn: 'x'.repeat(201) })).toContain('英文摘要不能超过 200 字符');
    expect(await errorMessages({ contentZh: 'x'.repeat(15001) })).toContain('新闻正文不能超过 15000 字');
    expect(await errorMessages({ contentEn: 'x'.repeat(15001) })).toContain('英文正文不能超过 15000 字');
  });

  it('发布时间格式、置顶与状态取值校验', async () => {
    expect(await errorMessages({ publishTime: '2026/01/01' })).toContain('发布时间格式不正确');
    expect(await errorMessages({ isTop: 1 })).toContain('置顶取值无效');
    expect(await errorMessages({ status: 3 })).toContain('状态取值无效');
  });
});
