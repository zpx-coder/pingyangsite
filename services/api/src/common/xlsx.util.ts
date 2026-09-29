// 最小 xlsx 生成器（零依赖，2026-09-29 负责人批准方案）：
//   - xlsx 本质是 ZIP 容器 + 若干 XML；此处实现单工作表 + 内联字符串导出，
//     满足询盘导出（PRD §7.5「字段与表格列一致」）的单表场景；
//   - 所有条目以存储（无压缩）方式写入，CRC32 使用 Node 内置 zlib.crc32
//     （Node ≥ 22.2，本项目 Node 24）；
//   - 单元格一律内联字符串（t="inlineStr"），无需 sharedStrings 与样式表。
import { crc32 } from 'node:zlib';

interface ZipEntry {
  name: string;
  data: Buffer;
}

const TEXT_ENCODING = 'utf8';

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** 数值转无 null 文本（null/undefined 导出为空串） */
function cellText(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

/** 生成单工作表 xlsx 文件内容 */
export function generateXlsx(headers: string[], rows: (string | number | boolean | null | undefined)[][]): Buffer {
  const columnCount = headers.length;

  const sheetRows = [headers, ...rows]
    .map((row) => {
      const cells = Array.from({ length: columnCount }, (_, index) => {
        const text = xmlEscape(cellText(row[index]));
        return `<c t="inlineStr"><is><t>${text}</t></is></c>`;
      }).join('');
      return `<row>${cells}</row>`;
    })
    .join('');

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>${sheetRows}</sheetData>
</worksheet>`;

  const entries: ZipEntry[] = [
    {
      name: '[Content_Types].xml',
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`,
        TEXT_ENCODING,
      ),
    },
    {
      name: '_rels/.rels',
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
        TEXT_ENCODING,
      ),
    },
    {
      name: 'xl/workbook.xml',
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
        TEXT_ENCODING,
      ),
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
        TEXT_ENCODING,
      ),
    },
    { name: 'xl/worksheets/sheet1.xml', data: Buffer.from(sheetXml, TEXT_ENCODING) },
  ];

  return buildZip(entries);
}

/** ZIP 容器（全部条目 store 无压缩）：本地文件头 + 数据 + 中央目录 + 结束记录 */
function buildZip(entries: ZipEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, TEXT_ENCODING);
    const crc = crc32(entry.data);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // local file header signature
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0x0800, 6); // general purpose flag: UTF-8 文件名
    localHeader.writeUInt16LE(0, 8); // method: store
    localHeader.writeUInt16LE(0x0021, 10); // dos time
    localHeader.writeUInt16LE(0x0021, 12); // dos date
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(entry.data.length, 18); // compressed size
    localHeader.writeUInt32LE(entry.data.length, 22); // uncompressed size
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra len

    localParts.push(localHeader, nameBuffer, entry.data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // central directory signature
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0x0800, 8); // flags: UTF-8
    centralHeader.writeUInt16LE(0, 10); // method
    centralHeader.writeUInt16LE(0x0021, 12); // dos time
    centralHeader.writeUInt16LE(0x0021, 14); // dos date
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(entry.data.length, 20);
    centralHeader.writeUInt32LE(entry.data.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    // 30: extra len / 32: comment len / 34: disk start / 38: attrs 均留 0
    centralHeader.writeUInt32LE(offset, 42); // local header offset
    centralParts.push(centralHeader, nameBuffer);

    offset += 30 + nameBuffer.length + entry.data.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // end of central directory signature
  eocd.writeUInt16LE(entries.length, 8); // total entries
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(offset, 16);

  return Buffer.concat([...localParts, ...centralParts, eocd]);
}
