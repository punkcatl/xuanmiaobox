import { describe, it, expect } from 'vitest';
import { splitTerms, lookupTerm, glossary } from '../src/data/glossary.js';
import { lessons } from '../src/data/lessons.js';
import ziping from '../src/content/books/ziping.json';
import ditiansui from '../src/content/books/ditiansui.json';
import qiongtong from '../src/content/books/qiongtong.json';
import { JIA_ZI } from '../src/engine/constants.js';

describe('术语词典', () => {
  it('识别多字术语与别名，单字不自动标注', () => {
    const parts = splitTerms('身强之命，喜用神为金，日主属木');
    expect(parts.filter(p => p.term).map(p => p.term)).toEqual(['身强', '喜用神', '日元']);
    expect(splitTerms('木火土').every(p => !p.term)).toBe(true);
  });
  it('多段文本共享 seen 时整章只标一次', () => {
    const seen = new Set();
    const a = splitTerms('用神在此', { once: true, seen });
    const b = splitTerms('又见用神', { once: true, seen });
    expect(a.filter(p => p.term)).toHaveLength(1);
    expect(b.filter(p => p.term)).toHaveLength(0);
  });
  it('once 模式同一术语只标一次', () => {
    expect(splitTerms('用神用神', { once: true }).filter(p => p.term)).toHaveLength(1);
  });
  it('十天干、十二地支均可查到', () => {
    for (const c of '甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥') expect(lookupTerm(c), c).toBeTruthy();
  });
  it('每个词条关联的入门课都存在', () => {
    const ids = new Set(lessons.map(l => l.id));
    for (const e of glossary) if (e.lesson) expect(ids.has(e.lesson), e.term).toBe(true);
  });
  it('解读文案里的十神大类都能识别', () => {
    for (const t of ['比劫年', '食伤年', '印星年', '财星年', '官杀年']) expect(splitTerms(t)[0].term).toBeTruthy();
  });
});

describe('典籍解析', () => {
  const blocks = book => book.chapters.flatMap(c => c.blocks);
  it('子平真诠：序 + 48 章', () => {
    expect(ziping.chapters).toHaveLength(49);
    expect(ziping.chapters[1].title).toBe('论十干十二支');
    expect(ziping.chapters.at(-1).title).toBe('附论杂格取运');
  });
  it('滴天髓：通神论 34 章 + 六亲论 29 章，含原文与注', () => {
    expect(ditiansui.chapters.filter(c => c.part === '通神论')).toHaveLength(34);
    expect(ditiansui.chapters.filter(c => c.part === '六亲论')).toHaveLength(29);
    expect(ditiansui.chapters.map(c => c.title)).toContain('从象');
    const b = blocks(ditiansui);
    expect(b.filter(x => x.t === 'verse').length).toBeGreaterThan(100);
    expect(b.filter(x => x.t === 'note' && x.who === '任氏曰').length).toBeGreaterThan(100);
  });
  it('命例四柱为合法干支；原文讹字的命例须标注', () => {
    for (const book of [ditiansui, qiongtong]) {
      for (const c of blocks(book).filter(x => x.t === 'chart')) {
        expect(c.pillars).toHaveLength(4);
        const ok = [...c.pillars, ...(c.dayun || [])].every(p => JIA_ZI.includes(p));
        if (!ok) expect(c.label).toBe('原文疑有讹字');
      }
    }
  });
  it('滴天髓：多柱同行与讹字不再把大运误当四柱', () => {
    const fake = blocks(ditiansui).filter(x => x.t === 'chart' && x.pillars.join() === '己酉,戊申,丁未,丙午');
    expect(fake).toEqual([]);
  });
  it('穷通宝鉴：命例残行不被当作小标题', () => {
    const gz = '甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥戍';
    const bad = blocks(qiongtong).filter(b => b.t === 'h' && b.text.length === 4 && [...b.text].filter(c => gz.includes(c)).length >= 3);
    expect(bad).toEqual([]);
  });
  it('穷通宝鉴：按五行分章，含月份小标题', () => {
    expect(qiongtong.chapters[0].title).toBe('五行总论');
    expect(blocks(qiongtong).some(x => x.t === 'h' && x.text === '正月丙火')).toBe(true);
  });
});
