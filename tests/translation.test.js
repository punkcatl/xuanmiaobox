import { describe, it, expect } from 'vitest';
import { parseTranslation } from '../scripts/build-books.mjs';
import ziping from '../src/content/books/ziping.json';
import qiongtong from '../src/content/books/qiongtong.json';
import ditiansui from '../src/content/books/ditiansui.json';

describe('白话对照译稿', () => {
  it('引用块为原文、其后段落为译文、图片 + 斜体为补图', () => {
    const md = '# 标题\n\n> 原文一\n> 续行\n\n白话一。\n\n（译注：说明。）\n\n> 原文二\n\n白话二。';
    const blocks = parseTranslation(md, '/nonexistent', 't');
    expect(blocks).toEqual([
      { t: 'p', text: '原文一续行', tr: '白话一。\n（译注：说明。）' },
      { t: 'p', text: '原文二', tr: '白话二。' }
    ]);
  });
  it('标题、原文韵语、注文与命例的标记', () => {
    const md = '## 正月丙火\n\n正月的丙火\n\n> 【原文】天道之句\n\n白话甲。\n\n> 【任氏曰】任注\n\n白话乙。\n\n> 【命例】丙午 庚寅 丙午 庚寅 ｜ 大运：辛卯 壬辰 ｜ 状元\n\n> 【命例】甲子 乙丑 丙寅 丁卯 ｜ 大运：';
    expect(parseTranslation(md, '/x', 't')).toEqual([
      { t: 'h', text: '正月丙火', tr: '正月的丙火' },
      { t: 'verse', text: '天道之句', tr: '白话甲。' },
      { t: 'note', who: '任氏曰', text: '任注', tr: '白话乙。' },
      { t: 'chart', pillars: ['丙午', '庚寅', '丙午', '庚寅'], dayun: ['辛卯', '壬辰'], label: '状元' },
      { t: 'chart', pillars: ['甲子', '乙丑', '丙寅', '丁卯'], dayun: [] }
    ]);
    expect(() => parseTranslation('> 【原注】注文', '/x', 't')).toThrow(/缺少译文/);
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
  it.each([['穷通宝鉴', qiongtong], ['滴天髓', ditiansui]])('%s：全书每章都有白话，原文、注文都有译文，补图注明译者所补', (name, book) => {
    expect(book.chapters.every(c => c.translated)).toBe(true);
    for (const c of book.chapters) {
      for (const b of c.blocks) {
        if (b.t === 'p' || b.t === 'verse' || b.t === 'note') expect(b.tr, `${name}·${c.title}：${b.text.slice(0, 10)}`).toBeTruthy();
        if (b.t === 'fig') expect(b.caption).toMatch(/译者.*补绘/);
      }
    }
  });
});
