import { describe, it, expect } from 'vitest';
import { parseTranslation } from '../scripts/build-books.mjs';
import ziping from '../src/content/books/ziping.json';

describe('白话对照译稿', () => {
  it('引用块为原文、其后段落为译文、图片 + 斜体为补图', () => {
    const md = '# 标题\n\n> 原文一\n> 续行\n\n白话一。\n\n（译注：说明。）\n\n> 原文二\n\n白话二。';
    const blocks = parseTranslation(md, '/nonexistent', 't');
    expect(blocks).toEqual([
      { t: 'p', text: '原文一续行', tr: '白话一。\n（译注：说明。）' },
      { t: 'p', text: '原文二', tr: '白话二。' }
    ]);
  });
  it('缺译文、译文出现在原文之前、补图缺文件都报错', () => {
    expect(() => parseTranslation('> 原文', '/x', 't')).toThrow(/缺少译文/);
    expect(() => parseTranslation('白话\n\n> 原文\n\n白话', '/x', 't')).toThrow(/之前出现了译文/);
    expect(() => parseTranslation('> 原文\n\n白话\n\n![图](figs/none.svg)\n\n*说明*', '/x', 't')).toThrow(/找不到补图/);
  });
  it('子平真诠已合并的章节：每段原文都有译文，补图都注明为译者所补', () => {
    const done = ziping.chapters.filter(c => c.translated);
    expect(done.length).toBeGreaterThanOrEqual(4);
    for (const c of done) {
      for (const b of c.blocks) {
        if (b.t === 'p') expect(b.tr, `${c.title}：${b.text.slice(0, 10)}`).toBeTruthy();
        if (b.t === 'fig') { expect(b.svg.startsWith('<svg')).toBe(true); expect(b.caption).toMatch(/译者.*补绘/); }
      }
    }
  });
});
