// 富文本 HTML 加载前归一化（wangEditor 5.1.23 停更版缺陷规避）：
// 顶层 <img> 若前面已有顶层元素（"块后裸图"，如 <p>x</p><img src=...>），
// htmlToContent 会产出 text:"" 无效叶节点，setHtml 全程抛 5 个未捕获异常
// （Cannot read properties of null (reading 'length') / Cannot resolve a DOM node from Slate node）。
// 实测：顶层图开头（<img>…<p>y</p>）、图在块内（<p><img></p>）均正常；
// 块后裸图、连续裸图、<a> 包裹的图均触发；顶层 <video> 不触发。
// 规避：把顶层裸 <img>（含被顶层 <a> 包裹的图）包进 <p>。
// 编辑器自身产出的图片本就在段落内，正常内容为无操作（幂等）。

/** HTML 空元素（不改变嵌套深度的标签） */
const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/** 顶层可包裹图片的内联容器（仅这些容器包图片时需整体包 <p>；块级容器内图片本身正常） */
const INLINE_WRAP_TAGS = new Set([
  'a', 'abbr', 'b', 'cite', 'code', 'em', 'i', 'label',
  'mark', 'small', 'span', 'strong', 'sub', 'sup', 'u',
]);

const TAG_RE = /<\/?([a-zA-Z][a-zA-Z0-9-]*)(?:\s[^<>]*?)?\/?>/g;

/** 顶层裸 img 包 <p>；被顶层 <a> 包裹的 img 则整体包 <p>。其余内容原样返回。 */
export function wrapTopLevelImages(html: string): string {
  if (!/<img\b/i.test(html)) return html;
  let depth = 0;
  let out = '';
  let last = 0;
  // 手写 exec 循环（matchAll 迭代器不响应循环内 lastIndex 跳转，exec 响应）
  let m: RegExpExecArray | null;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(html)) !== null) {
    const full = m[0];
    const name = m[1].toLowerCase();
    const idx = m.index;
    const isClose = full.startsWith('</');
    const selfClosed = full.endsWith('/>') || VOID_TAGS.has(name);
    if (!isClose && depth === 0) {
      if (name === 'img') {
        out += html.slice(last, idx) + `<p>${full}</p>`;
        last = idx + full.length;
        continue;
      }
      // 顶层内联容器（<a> 等）：其配对闭合内含 img 时整体包 <p>，并跳过容器内部继续扫描；
      // 块级容器（p/h3/div…）内图片本身正常，仅进深度
      if (!selfClosed) {
        if (INLINE_WRAP_TAGS.has(name)) {
          const closeRe = new RegExp(`</${name}\\s*>`, 'gi');
          closeRe.lastIndex = idx + full.length;
          const cm = closeRe.exec(html);
          if (cm && /<img\b/i.test(html.slice(idx + full.length, cm.index))) {
            out += html.slice(last, idx) + '<p>' + html.slice(idx, cm.index + cm[0].length) + '</p>';
            last = cm.index + cm[0].length;
            TAG_RE.lastIndex = cm.index + cm[0].length;
            continue;
          }
          // 仅对已闭合容器进深度；未闭合（畸形 HTML）不改变深度，避免后续顶层图漏包裹
          if (cm !== null) depth += 1;
        } else {
          depth += 1;
        }
      }
    } else if (isClose && depth > 0) {
      depth -= 1;
    }
  }
  return out + html.slice(last);
}
