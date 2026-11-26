import { describe, it, expect } from 'vitest';
import { computeChart, computeCompat, computeDaily, computeLiuYue, computeLiuNian, baziYearFromPillar, BaziError } from '../src/engine/index.js';
import { yearMonthPillarsAt } from '../src/engine/almanac.js';
// 与 App 同一路径：当前年柱 → 命理当前年
const baziYearOf = t => baziYearFromPillar(t.year, yearMonthPillarsAt({ hour: 0, minute: 0, ...t })[0]);
import { tiaoHou } from '../src/engine/analysis.js';
import { TIAN_GAN, DI_ZHI } from '../src/engine/constants.js';
import qiongtong from '../src/content/books/qiongtong.json';
import { findAnchorIndex } from '../src/utils/anchor.js';
import { computePillars } from '../src/engine/bazi.js';
import { analyzeBalance, describeElements, determineGeju } from '../src/engine/analysis.js';
import { chartRelations, zhiRelations } from '../src/engine/relations.js';
import { computeShensha } from '../src/engine/shensha.js';
import { tenGod, changSheng, xunKong } from '../src/engine/constants.js';
import { resolveBirthTime, isChinaDst, equationOfTime } from '../src/engine/time.js';
import { lookupLongitude, regions, cityLongitudes } from '../src/data/regions.js';

const base = { year: 1993, month: 1, day: 4, hour: 14, minute: 0, gender: 'male', province: '北京市', city: '北京市', district: '东城区', useTrueSolarTime: true };
const noTst = { ...base, useTrueSolarTime: false };
const vals = p => computePillars(p).values.join(' ');

describe('排盘', () => {
  it('基准盘例', () => {
    const c = computeChart(base);
    expect(c.values).toEqual(['壬申', '壬子', '乙酉', '癸未']);
    expect(c.reading.every(i => i.k && i.v)).toBe(true);
    expect(c.大运).toHaveLength(10);
  });

  it('晚子时只换日柱，年柱月柱不变（审查 #1）', () => {
    expect(vals({ ...noTst, year: 2024, month: 2, day: 3, hour: 23, minute: 30 })).toBe('癸卯 乙丑 戊戌 壬子');
    expect(vals({ ...noTst, year: 2024, month: 2, day: 3, hour: 22, minute: 30 })).toBe('癸卯 乙丑 丁酉 辛亥');
  });

  it('交节精确到分钟：立春当日、交节前仍属上一年（审查 #2）', () => {
    expect(vals({ ...noTst, year: 2024, month: 2, day: 4, hour: 8, minute: 0 }).slice(0, 5)).toBe('癸卯 乙丑');
    expect(vals({ ...noTst, year: 2024, month: 2, day: 4, hour: 18, minute: 0 }).slice(0, 5)).toBe('甲辰 丙寅');
  });

  it('起运精确：交节当天出生的逆排盘约 1 岁起运（审查 #3）', () => {
    const c = computeChart({ ...noTst, year: 2024, month: 3, day: 5, hour: 20, minute: 0, gender: 'female' });
    expect(c.yunStart).toMatch(/^出生后 0 年/);
    expect(c.大运[0].startAge).toBe(1);
  });

  it('真太阳时不改变年柱月柱：节气按北京时间实际时刻比较', () => {
    // 2024 立春 2/4 16:27；乌鲁木齐 17:30 出生，真太阳时约 15:06，但实际时刻已过立春
    const r = computePillars({ ...base, year: 2024, month: 2, day: 4, hour: 17, minute: 30, province: '新疆维吾尔自治区', city: '乌鲁木齐市', district: '' });
    expect(r.values.slice(0, 2)).toEqual(['甲辰', '丙寅']);
    expect(r.time.hour).toBe(15);
  });

  it('大运记录交运日，每十年一步', () => {
    const d = computeChart(base).大运;
    expect(d[0].startDate).toMatch(/^1993-\d\d-\d\d$/);
    expect(d[1].startDate.slice(0, 4)).toBe('2003');
    expect(d[1].startDate.slice(4)).toBe(d[0].startDate.slice(4));
  });

  it('真太阳时跨午夜时日期回退', () => {
    const r = computePillars({ ...base, year: 2000, month: 3, day: 15, hour: 0, minute: 30, province: '新疆维吾尔自治区', city: '乌鲁木齐市', district: '' });
    expect(r.time.day).toBe(14);
    expect(r.values.join(' ')).toBe(vals({ ...noTst, year: 2000, month: 3, day: 14, hour: 22, minute: 11 }));
  });

  it('年份超出范围（如 10000）提示范围而非整数', () => {
    expect(() => computeChart({ ...base, year: 10000 })).toThrow('仅支持 1900–2100 年');
  });
  it('两位数年份提示超出范围，而非日期不存在', () => {
    expect(() => computeChart({ ...base, year: 93 })).toThrow('仅支持 1900–2100 年');
  });
  it('日期字段为空时提示填写完整', () => {
    expect(() => computeChart({ ...base, year: '' })).toThrow('请填写完整的出生日期');
  });
  it('非法日期 / 时间抛错，不返回伪造命盘', () => {
    expect(() => computeChart({ ...base, month: 2, day: 30 })).toThrow(BaziError);
    expect(() => computeChart({ ...base, hour: 30 })).toThrow(BaziError);
    expect(() => computeChart({ ...base, minute: 75 })).toThrow(BaziError);
  });

  it('无经度数据时给出提示', () => {
    expect(computeChart({ ...base, province: '火星', city: '无名市' }).notes.join()).toContain('未做真太阳时校正');
  });
});

describe('盘面', () => {
  it('十神 / 长生 / 旬空', () => {
    expect(tenGod('乙', '壬')).toBe('正印');
    expect(tenGod('乙', '辛')).toBe('七杀');
    expect(changSheng('乙', '申')).toBe('胎');
    expect(changSheng('壬', '申')).toBe('长生');
    expect(xunKong('乙酉')).toBe('午未');
  });
  it('专业盘面字段', () => {
    const p = computeChart(base).bazi;
    expect(p[0].naYin).toBe('剑锋金');
    expect(p[0].hide.map(h => h.gan)).toEqual(['庚', '壬', '戊']);
    expect(p[2].shiShen).toBe('日元');
  });
  it('神煞', () => {
    const s = computeShensha(['壬申', '壬子', '乙酉', '癸未']);
    expect(s[0]).toContain('天乙贵人');
    expect(s[1]).toContain('月德贵人');
    expect(s[3]).toContain('红鸾');
  });
  it('刑冲合害', () => {
    expect(zhiRelations('子', '午').map(r => r.type)).toContain('冲');
    expect(zhiRelations('丑', '未').map(r => r.type)).toEqual(['冲', '刑']);
    expect(chartRelations(['壬申', '壬子', '乙酉', '癸未']).map(r => r.text)).toContain('申子半合水局');
    expect(chartRelations(['甲申', '丙子', '戊辰', '庚申']).map(r => r.text)).toContain('申子辰三合水局');
  });
});

describe('喜用', () => {
  it('身强喜官杀、食伤、财星，忌印比；身弱相反', () => {
    const strong = computeChart(base).balance; // 乙木身强
    expect(strong.status).toBe('身强');
    // 乙木生子月、印（水）旺：财星土破印，冬月调候火为急 → 火 > 土 > 金
    expect(strong.useGod).toEqual(['火', '土', '金']);
    expect(strong.primaryGod).toBe('火');
    expect(strong.avoidGod).toEqual(['水', '木']);
    expect(analyzeBalance({ 木: 10, 水: 10, 火: 100, 土: 100, 金: 100 }, ['甲子', '丙午', '乙未', '戊午']).useGod).toEqual(['水', '木']);
  });
  it('喜用分主次：夏月燥土身强，比劫重而印亦有力 → 水 > 金 > 木', () => {
    const b = computeChart({ year: 1989, month: 7, day: 28, hour: 8, minute: 0, gender: 'female', province: '福建省', city: '三明市', district: '将乐县', useTrueSolarTime: true }).balance;
    expect(b.status).toBe('身强');
    expect(b.useGod).toEqual(['水', '金', '木']);
    expect(b.steps.join()).toContain('调候以水为急');
    // 身弱、财星为患：比劫为先（印怕财坏）
    expect(analyzeBalance({ 木: 10, 水: 10, 火: 100, 土: 200, 金: 30 }, ['甲子', '丙辰', '乙卯', '戊寅']).useGod[0]).toBe('木');
  });
  it('流年、大运按喜忌论吉凶（不再只按十神套话）', () => {
    const c = computeChart({ year: 1989, month: 7, day: 28, hour: 8, minute: 0, gender: 'female', province: '福建省', city: '三明市', district: '将乐县', useTrueSolarTime: true });
    const ln = computeLiuNian(c.values, 2026, 6, 2026, c.balance);
    const by = y => ln.find(x => x.year === y);
    expect(by(2026).tone).toBe('bad');            // 丙午：火为忌
    expect(by(2026).analysis).toContain('印星为忌');
    expect(by(2028).tone).toBe('mixed');          // 戊申：土忌金喜
    expect(by(2031).tone).toBe('good');           // 辛亥：金水皆喜
    expect(c.大运.find(d => d.ganZhi === '乙亥').tone).toBe('good');
    // 不传喜忌时保持旧文案（兼容）
    expect(computeLiuNian(c.values, 2026, 1, 2026)[0].tone).toBeNull();
  });
  it('校正说明带年份（跨年时不误导）', () => {
    expect(computeChart({ ...base, year: 1900, month: 1, day: 1, hour: 0, minute: 0 }).notes.join()).toContain('1899年12月31日');
  });
});

describe('格局', () => {
  it('建禄 / 阳刃须月支为日干禄刃之位', () => {
    expect(determineGeju(['甲子', '丙寅', '甲子', '甲子']).name).toBe('建禄格');
    expect(determineGeju(['甲子', '丁卯', '甲子', '甲子']).name).toBe('阳刃格');
    expect(determineGeju(['甲子', '丙辰', '戊子', '甲子']).name).not.toBe('建禄格');
    expect(determineGeju(['甲子', '辛未', '戊子', '甲子']).name).not.toBe('阳刃格');
    expect(determineGeju(['壬申', '壬子', '乙酉', '癸未']).name).toBe('偏印格');
    const yj = determineGeju(['甲子', '己巳', '己卯', '甲子']);
    expect(yj.name).toBe('月劫格');
    expect(yj.basis).toContain('劫财戊之禄位');
  });
});

describe('分析', () => {
  it('旺衰标签与喜用一致：中和不按身强取用（审查 #6）', () => {
    const w = { 木: 100, 水: 1, 火: 49, 土: 25, 金: 25 }; // 木水占 50.5%
    const b = analyzeBalance(w, ['甲子', '丙寅', '甲午', '戊辰']);
    expect(b.status).toBe('中和');
    expect(b.useGod).toEqual(['土', '金']); // 偏强（50.5%）：只从克泄耗中取，不取木水（印比）
    expect(b.avoidGod).toEqual(['木']);
    expect(b.steps.at(-1)).toContain('中和');
    // 偏弱的中和：喜印比，忌克泄耗中最旺者
    const weak = analyzeBalance({ 木: 30, 水: 17, 火: 20, 土: 13, 金: 20 }, ['甲子', '丙寅', '甲午', '戊辰']); // 木水 47%
    expect(weak.status).toBe('中和');
    expect(weak.useGod.sort()).toEqual(['木', '水'].sort());
    expect(['火', '金']).toContain(weak.avoidGod[0]);
    // 显示的百分比与判断一致（保留一位小数）
    expect(b.steps.find(x => x.includes('%'))).toMatch(/占 \d+\.\d%/);
  });
  it('五行描述统一按藏干加权，文案一致（审查 #7）', () => {
    const d = describeElements({ 木: 0, 火: 300, 土: 100, 金: 0, 水: 20 });
    expect(d).toContain('命中无金');
    expect(d).toContain('命中无木');
    expect(d.join()).not.toContain('少');
  });
  it('流月五虎遁', () => {
    const ly = computeLiuYue(['壬申', '壬子', '乙酉', '癸未'], 2026);
    expect(ly[0].ganZhi).toBe('庚寅');
    expect(ly.map(m => m.label).slice(-2)).toEqual(['十一月', '十二月']);
  });
  it('流月干支与历法库逐月一致', () => {
    for (const year of [1984, 1999, 2026, 2031, 2050]) {
      const ly = computeLiuYue(['壬申', '壬子', '乙酉', '癸未'], year);
      ly.forEach((m, i) => {
        // 第 i 个流月（寅月起）在公历 (2+i) 月 20 日前后必然已交节
        const gm = 2 + i, y = year + Math.floor((gm - 1) / 12), mo = ((gm - 1) % 12) + 1;
        expect(m.ganZhi).toBe(yearMonthPillarsAt({ year: y, month: mo, day: 20, hour: 12, minute: 0 })[1]);
      });
    }
  });
  it('每日运签', () => {
    const d = computeDaily(['壬申', '壬子', '乙酉', '癸未'], ['金', '火', '土'], { year: 2026, month: 11, day: 25 });
    expect(d.ganZhi).toBe('癸卯');
    expect(d.yi.length).toBeGreaterThan(0);
  });
});

describe('运程年份', () => {
  it('立春前“今年”仍属上一干支年', () => {
    expect(baziYearOf({ year: 2026, month: 1, day: 20 })).toBe(2025);
    expect(baziYearOf({ year: 2026, month: 2, day: 10 })).toBe(2026);
    // 2024 立春 2/4 16:27：当天按时刻
    expect(baziYearOf({ year: 2024, month: 2, day: 4, hour: 10, minute: 0 })).toBe(2023);
    expect(baziYearOf({ year: 2024, month: 2, day: 4, hour: 17, minute: 0 })).toBe(2024);
    const ln = computeLiuNian(['壬申', '壬子', '乙酉', '癸未'], 2024, 3, baziYearOf({ year: 2026, month: 1, day: 20 }));
    expect(ln.find(y => y.isCurrent).ganZhi).toBe('乙巳');
  });
  it('调候链接：120 种日主 × 月令都能定位到《穷通宝鉴》小标题', () => {
    for (const g of TIAN_GAN) for (const z of DI_ZHI) {
      const t = tiaoHou(['甲子', '丙' + z, g + '子', '甲子']);
      const blocks = qiongtong.chapters.find(c => c.title === t.chapter).blocks;
      const at = findAnchorIndex(blocks, t.anchors);
      expect(at, g + z).not.toBeNull();
      // 第一锚点（具体月份，如“正月甲木”）在书中存在时须精确命中它，而不是退到季节标题
      const first = t.anchors[0];
      const exists = blocks.some(b => typeof b.text === 'string' && b.text.startsWith(first));
      if (exists) expect(blocks[at].text.startsWith(first), g + z).toBe(true);
    }
  });
});

describe('时间校正', () => {
  it('1986–1991 夏令时回拨 1 小时（港澳台除外）', () => {
    expect(isChinaDst(1990, 7, 1, 12, 0, '北京市')).toBe(true);
    expect(isChinaDst(1990, 7, 1, 12, 0, '香港特别行政区')).toBe(false);
    expect(isChinaDst(1992, 7, 1, 12, 0, '北京市')).toBe(false);
    expect(resolveBirthTime({ year: 1990, month: 7, day: 1, hour: 12, minute: 0, province: '北京市' }).hour).toBe(11);
  });
  it('1988 起始日按 tzdata（4/17），4/10–4/16 给出提示；切换时刻给出提示', () => {
    expect(isChinaDst(1988, 4, 12, 12, 0, '北京市')).toBe(false);
    expect(isChinaDst(1988, 4, 18, 12, 0, '北京市')).toBe(true);
    expect(computeChart({ ...noTst, year: 1988, month: 4, day: 12 }).notes.join()).toContain('两种记载');
    const skipped = computeChart({ ...noTst, year: 1990, month: 4, day: 15, hour: 2, minute: 30 }).notes.join();
    expect(skipped).toContain('不存在');
    expect(skipped).not.toContain('已回拨');
    expect(computeChart({ ...noTst, year: 1990, month: 9, day: 16, hour: 1, minute: 30 }).notes.join()).toContain('两次');
    expect(computeChart({ ...noTst, year: 1975, month: 7, day: 15, province: '香港特别行政区', city: '香港岛', district: '中西区' }).notes.join()).toContain('港澳台');
    // 1942–1945 全年拨快：冬月出生也须提示
    expect(computeChart({ ...noTst, year: 1943, month: 1, day: 10, province: '上海市', city: '上海市', district: '黄浦区' }).notes.join()).toContain('1940 年代');
    expect(computeChart({ ...noTst, year: 1943, month: 1, day: 10, province: '香港特别行政区', city: '香港岛', district: '中西区' }).notes.join()).toContain('东九区'); // 日占时期：以日本时间提示代替当地夏令时提示
  });
  it('真太阳时向下取整：时辰交界前的秒数不进位到下一时辰', () => {
    const eot = equationOfTime(2001, 6, 1);
    const lon = 120 + (0.6 - eot) / 4; // 总校正 +0.6 分钟
    const t = resolveBirthTime({ year: 2001, month: 6, day: 1, hour: 22, minute: 59, longitude: lon, useTrueSolarTime: true });
    expect([t.hour, t.minute]).toEqual([22, 59]);
  });
  it('说明中的校正分钟数与排盘时间一致', () => {
    const note = computeChart(base).notes.find(n => n.includes('真太阳时校正'));
    const [, sign, mins, hh, mm] = note.match(/([+−])(\d+) 分钟，排盘时间 .*? (\d\d):(\d\d)/);
    const offset = (sign === '+' ? 1 : -1) * Number(mins);
    expect(14 * 60 + offset).toBe(Number(hh) * 60 + Number(mm));
  });
  it('排盘须选择性别', () => {
    expect(() => computeChart({ ...base, gender: undefined })).toThrow('请选择性别');
  });
  it('分钟取整不会出现 60 分', () => {
    for (let lon = 100; lon < 130; lon += 0.37) {
      expect(resolveBirthTime({ year: 2001, month: 6, day: 1, hour: 12, minute: 0, longitude: lon, useTrueSolarTime: true }).minute).toBeLessThan(60);
    }
  });
});

describe('地区', () => {
  it('同名区县按所属城市区分', () => {
    expect(lookupLongitude('江苏省', '南京市', '鼓楼区').longitude).toBeCloseTo(118.77);
    expect(lookupLongitude('福建省', '福州市', '鼓楼区').longitude).toBeCloseTo(119.3);
  });
  it('所有城市都有经度，区县无重复（审查 #5）', () => {
    for (const [p, cities] of Object.entries(regions)) {
      for (const [c, ds] of Object.entries(cities)) {
        expect(cityLongitudes[p]?.[c], `${p}${c}`).toBeTypeOf('number');
        expect(new Set(ds).size, `${p}${c}`).toBe(ds.length);
      }
    }
  });
});

describe('合盘', () => {
  const p2 = { ...base, year: 1995, month: 5, day: 20, hour: 8, minute: 30, gender: 'female' };
  it('与排盘规则一致，解读无空条目，分数可解释', () => {
    const r = computeCompat(base, p2);
    expect(r.party1.bazi.map(p => p.value)).toEqual(computeChart(base).values);
    expect(r.reading.every(i => i.k && i.v)).toBe(true);
    expect(r.score).toBe(Math.max(30, Math.min(98, 60 + r.factors.reduce((s, f) => s + f.delta, 0))));
  });
  it('日主同五行时不写“阴阳相济”（审查 #8）', () => {
    const r = computeCompat(base, { ...base, year: 1994 });
    expect(r.reading.map(i => i.v).join()).not.toContain('阴阳相济');
  });
  it('合盘按区县经度校正，与排盘一致', () => {
    const p = { ...base, province: '北京市', city: '北京市', district: '海淀区' };
    expect(computeCompat(p, p2).party1.notes.join()).toContain('区县级');
  });
  it('错误信息标明哪一方', () => {
    expect(() => computeCompat(base, { ...p2, month: 2, day: 31 })).toThrow(/乙方/);
  });
});

describe('大运流年范围', () => {
  it('立春前出生：大运虚岁按干支年起算（与起运前 1 岁一致）', () => {
    const c = computeChart({ year: 1990, month: 1, day: 20, hour: 10, minute: 0, gender: 'male', province: '北京市', city: '北京市', district: '东城区', useTrueSolarTime: false });
    expect(c.birthYear).toBe(1989);
    c.大运.forEach(d => expect(d.startAge).toBe(d.fromYear - 1989 + 1));
  });
  it('交运在元旦至立春之间：虚岁按交运所属干支年', () => {
    const c = computeChart({ year: 1980, month: 8, day: 10, hour: 12, minute: 0, gender: 'male', province: '北京市', city: '北京市', district: '东城区', useTrueSolarTime: false });
    c.大运.forEach(d => expect(d.startAge).toBe(d.fromYear - c.birthYear + 1));
    expect(c.大运.some(d => d.fromYear < Number(d.startDate.slice(0, 4)))).toBe(true); // 该例确有交运在立春前的步
  });
  it('冲合摘要截取时冲与日柱优先（日柱相冲不被年月柱挤掉）', async () => {
    const { keyRelations } = await import('../src/engine/relations.js');
    const top = keyRelations('甲子', ['己丑', '庚申', '壬午', '甲辰'], { limit: 3 }).map(r => r.text);
    expect(top[0]).toContain('子午');
    expect(top.some(t => t.includes('甲庚'))).toBe(true);
  });
  it('大陆 1949 年前出生提示分区标准时；港澳台不提示', () => {
    const base = { year: 1945, month: 5, day: 1, hour: 12, minute: 0, gender: 'male', useTrueSolarTime: true };
    expect(computeChart({ ...base, province: '四川省', city: '成都市', district: '' }).notes.join()).toContain('东七区');
    expect(computeChart({ ...base, province: '香港特别行政区', city: '香港', district: '' }).notes.join()).not.toContain('东七区');
  });
  it('大运每步按自己的交运时刻定年：标注、年龄、范围一致且首尾相接（含随机抽样）', () => {
    const check = input => {
      const c = computeChart(input);
      c.大运.forEach((d, i) => {
        // 每步按自己的交运时刻定干支年：首尾相接，标注年龄与年份一致，交运时刻落在所标年份内
        const [y, m, dd, h, mi] = d.startAt.split(/[- :]/).map(Number);
        expect(d.fromYear).toBe(baziYearFromPillar(y, yearMonthPillarsAt({ year: y, month: m, day: dd, hour: h, minute: mi })[0]));
        expect(d.startAge).toBe(d.fromYear - c.birthYear + 1);
        expect([9, 10, 11]).toContain(d.toYear - d.fromYear);
        if (i) expect(d.fromYear).toBe(c.大运[i - 1].toYear);
        expect(d.startAt.slice(0, 10)).toBe(d.startDate);
      });
    };
    check({ year: 2015, month: 8, day: 3, hour: 15, minute: 58, gender: 'female', province: '上海市', city: '上海市', district: '黄浦区', useTrueSolarTime: false });
    let seed = 7;
    const rnd = n => { seed = (seed * 48271) % 2147483647; return seed % n; }; // Park–Miller：乘积不超过 2^53，各位都随机
    for (let k = 0; k < 300; k++) {
      check({ year: 1950 + rnd(70), month: 1 + rnd(12), day: 1 + rnd(28), hour: rnd(24), minute: rnd(60), gender: rnd(2) ? 'male' : 'female', province: '北京市', city: '北京市', district: '东城区', useTrueSolarTime: false });
    }
  });
  it('交运在立春之后的步按当年标注（1956-01-01 男命：1974-02-04 交运属 1974 年）', () => {
    const c = computeChart({ year: 1956, month: 1, day: 1, hour: 12, minute: 0, gender: 'male', province: '北京市', city: '北京市', district: '东城区', useTrueSolarTime: false });
    const step = c.大运.find(d => d.startDate.startsWith('1974-02'));
    expect(step).toBeTruthy();
    expect(step.fromYear).toBe(1974);
  });
  it('1945 年 9 月起大陆不再提示战时夏令时', async () => {
    const { dstWarning } = await import('../src/engine/time.js');
    expect(dstWarning(1919, 7, 1, 0, '上海市')).toBe('early'); // 1919 年上海夏令时
    expect(dstWarning(1919, 11, 1, 0, '上海市')).toBe(null);
    expect(dstWarning(1945, 11, 20, 10, '上海市')).toBe(null);
    expect(dstWarning(1945, 1, 20, 10, '上海市')).toBe('early');
  });
  it('十二长生、旬空与历法库逐一一致（防止手写表与库分歧）', async () => {
    const { Solar, LunarUtil } = await import('lunar-javascript');
    const { changSheng, xunKong, JIA_ZI } = await import('../src/engine/constants.js');
    for (const gz of JIA_ZI) expect(xunKong(gz)).toBe(LunarUtil.getXunKong(gz));
    let seed = 11;
    const rnd = n => { seed = (seed * 48271) % 2147483647; return seed % n; }; // Park–Miller：乘积不超过 2^53，各位都随机
    for (let k = 0; k < 200; k++) {
      const ec = Solar.fromYmdHms(1950 + rnd(70), 1 + rnd(12), 1 + rnd(28), rnd(24), 0, 0).getLunar().getEightChar();
      const dayGan = ec.getDayGan();
      expect(changSheng(dayGan, ec.getYearZhi())).toBe(ec.getYearDiShi());
      expect(changSheng(dayGan, ec.getMonthZhi())).toBe(ec.getMonthDiShi());
      expect(changSheng(dayGan, ec.getDayZhi())).toBe(ec.getDayDiShi());
      expect(changSheng(dayGan, ec.getTimeZhi())).toBe(ec.getTimeDiShi());
    }
  });
  it('原型属性名作地名（constructor、__proto__）不崩溃，按无经度处理', () => {
    const base = { year: 1993, month: 1, day: 4, hour: 14, minute: 0, gender: 'male', useTrueSolarTime: true };
    for (const place of [{ province: '北京市', city: '北京市', district: 'constructor' }, { province: '__proto__', city: 'toString', district: '' }, { province: '北京市', city: 'constructor', district: '' }]) {
      expect(() => computeChart({ ...base, ...place })).not.toThrow();
    }
    expect(computeChart({ ...base, province: '__proto__', city: 'toString', district: '' }).trueSolarApplied).toBe(false);
  });
  it('三刑俱全时列出全称', async () => {
    const { chartRelations } = await import('../src/engine/relations.js');
    expect(chartRelations(['甲寅', '己巳', '庚申', '丙子']).map(r => r.text)).toContain('寅巳申三刑（无恩之刑）');
    expect(chartRelations(['乙丑', '丙戌', '丁未', '丙子']).map(r => r.text)).toContain('丑戌未三刑（恃势之刑）');
  });
  it('台湾 1945 年前、香港日占时期提示日本时间（东九区）', () => {
    const base = { month: 6, day: 1, hour: 12, minute: 0, gender: 'male', useTrueSolarTime: false, district: '' };
    expect(computeChart({ ...base, year: 1940, province: '台湾省', city: '台北市' }).notes.join()).toContain('东九区'); // 1940 在 1937-10 之后
    expect(computeChart({ ...base, year: 1943, province: '香港特别行政区', city: '香港岛' }).notes.join()).toContain('东九区');
    expect(computeChart({ ...base, year: 1950, province: '台湾省', city: '台北市' }).notes.join()).not.toContain('东九区');
    // 台湾 1937-10 之前用东八区；香港日占自 1941-12-25 起、1945-09-15 止
    expect(computeChart({ ...base, year: 1920, province: '台湾省', city: '台北市' }).notes.join()).not.toContain('东九区');
    expect(computeChart({ ...base, year: 1941, month: 12, day: 1, province: '香港特别行政区', city: '香港岛' }).notes.join()).not.toContain('东九区');
    expect(computeChart({ ...base, year: 1945, month: 10, day: 1, province: '香港特别行政区', city: '香港岛' }).notes.join()).not.toContain('东九区');
  });
  it('日本时间期间不再重复提示当地夏令时（避免减两次）', () => {
    const base = { year: 1943, month: 6, day: 1, hour: 10, minute: 0, gender: 'male', useTrueSolarTime: false, district: '' };
    for (const [province, city] of [['香港特别行政区', '香港岛'], ['台湾省', '台北市']]) {
      const notes = computeChart({ ...base, province, city }).notes;
      expect(notes.filter(n => n.includes('减 1 小时')).length).toBe(1);
    }
  });
  it('新疆出生提示确认是否为北京时间', () => {
    const notes = computeChart({ year: 1990, month: 5, day: 1, hour: 8, minute: 0, gender: 'male', province: '新疆维吾尔自治区', city: '乌鲁木齐市', district: '', useTrueSolarTime: true }).notes;
    expect(notes.join()).toContain('新疆时间');
  });
  it('每步 fromYear/toYear 为交运时刻所属干支年，首尾相接，最后一步不多算', () => {
    for (const gender of ['male', 'female']) {
      const dy = computeChart({ year: 1990, month: 5, day: 1, hour: 8, minute: 0, gender, province: '浙江省', city: '杭州市', district: '上城区', useTrueSolarTime: false }).大运;
      dy.forEach((d, i) => {
        const y = Number(d.startDate.slice(0, 4));
        expect([y - 1, y]).toContain(d.fromYear); // 交运在立春前则属上一干支年
        expect([9, 10, 11]).toContain(d.toYear - d.fromYear);
        if (i) expect(d.fromYear).toBe(dy[i - 1].toYear);
      });
    }
  });
  it('career 文案不重复（木火同为喜用时“教育”只出现一次）', () => {
    const chart = computeChart({ year: 1990, month: 5, day: 1, hour: 8, minute: 0, gender: 'male', province: '浙江省', city: '杭州市', district: '上城区', useTrueSolarTime: false });
    for (const r of chart.reading) {
      const items = r.v.split(/[、，。：]/).filter(Boolean);
      if (r.k.includes('事业')) expect(new Set(items).size).toBe(items.length);
    }
  });
});
