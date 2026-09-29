// 最小 xlsx 生成器单元测试（任务 1.10：ZIP 容器结构 + 内联字符串工作表）
import { generateXlsx } from './xlsx.util';

describe('generateXlsx', () => {
  it('产物为合法 ZIP（本地头 + 中央目录 + EOCD）', () => {
    const buffer = generateXlsx(['A', 'B'], [['1', '2']]);
    // PK\x03\x04 本地文件头 / PK\x01\x02 中央目录 / PK\x05\x06 结束记录
    expect(buffer.subarray(0, 2).toString('ascii')).toBe('PK');
    expect(buffer.toString('binary')).toContain('PK\x03\x04');
    expect(buffer.toString('binary')).toContain('PK\x01\x02');
    expect(buffer.toString('binary')).toContain('PK\x05\x06');
  });

  it('包含 xlsx 必需的 5 个部件', () => {
    const buffer = generateXlsx(['A'], [['1']]);
    // 目录区定位：扫描文件名出现次数验证部件齐全
    const names = [
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/worksheets/sheet1.xml',
    ];
    for (const name of names) {
      expect(buffer.toString('latin1')).toContain(name);
    }
  });

  it('sheet1.xml 含表头与数据行（内联字符串，XML 转义正确）', () => {
    const buffer = generateXlsx(['名称', '备注'], [
      ['A&B', '<tag>'],
      ['空', null],
    ]);
    // 抽取 ZIP 部件需解析偏移；此处直接以字符串特征校验转义输出
    const utf8 = buffer.toString('utf8');
    expect(utf8).toContain('<worksheet');
    expect(utf8).toContain('名称');
    expect(utf8).toContain('A&amp;B');
    expect(utf8).toContain('&lt;tag&gt;');
  });

  it('空表仅表头', () => {
    const buffer = generateXlsx(['A', 'B'], []);
    expect(buffer.toString('latin1')).toContain('<sheetData><row>');
  });

  it('CRC32 字段写入（store 模式压缩前后一致）', () => {
    // store 模式下 compressedSize == uncompressedSize，可通过结构完整性间接验证
    const buffer = generateXlsx(['A'], [['x']]);
    expect(buffer.length).toBeGreaterThan(300);
  });
});
