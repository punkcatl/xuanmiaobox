import { describe, it, expect } from 'vitest';
import { inputFromUrl, shareUrl, store, calculateChart, saveToArchive, archivedEntryOf, DEFAULT_FORM } from '../src/composables/store.js';

globalThis.location = globalThis.location || { origin: 'http://x', pathname: '/', search: '' };

describe('分享链接', () => {
  it('往返还原', () => {
    const url = shareUrl({ ...DEFAULT_FORM, gender: 'female', hour: 23 });
    expect(inputFromUrl(new URL(url).search)).toEqual({ ...DEFAULT_FORM, gender: 'female', hour: 23 });
  });
  it('数字参数只接受十进制整数', () => {
    expect(inputFromUrl('?y=0x7C9&m=1&d=4&h=8&i=0&g=m&p=北京市&c=北京市&s=1')).toBeNull();
    expect(inputFromUrl('?y=1993&m=1e0&d=4&h=8&i=0&g=m&p=北京市&c=北京市&s=1')).toBeNull();
    expect(inputFromUrl('?y=1993&m=1&d=4.0&h=8&i=0&g=m&p=北京市&c=北京市&s=1')).toBeNull();
  });
  it('真太阳时参数只接受 0 / 1', () => {
    expect(inputFromUrl('?y=1990&m=5&d=1&h=8&i=0&g=m&p=北京市&c=北京市&s=true')).toBeNull();
  });
  it('性别参数只接受 m / f', () => {
    expect(inputFromUrl('?y=1990&m=5&d=1&h=8&i=0&g=female&p=北京市&c=北京市&s=1')).toBeNull();
  });
  it('省、市为旧地名的链接照常还原（与档案一致）', () => {
    expect(inputFromUrl('?y=1990&m=5&d=1&h=8&i=0&g=m&p=旧省名&c=旧市&s=1')).toMatchObject({ province: '旧省名', city: '旧市' });
    expect(inputFromUrl('?y=1990&m=5&d=1&h=8&i=0&g=m&p=广东省&c=旧市&t=旧区&s=1').city).toBe('旧市');
  });
  it('原型属性名作地名的链接不报错', async () => {
    const { citiesOf, districtsOf } = await import('../src/composables/region.js');
    expect(citiesOf('__proto__')).toEqual([]);
    expect(districtsOf('北京市', 'constructor')).toEqual([]);
    expect(() => inputFromUrl('?y=1993&m=1&d=4&h=14&i=0&g=m&p=北京市&c=北京市&t=constructor&s=1')).not.toThrow();
  });
  it('去掉分享参数时保留其他查询参数；区县过长的链接无效', async () => {
    const { withoutShareParams } = await import('../src/composables/store.js');
    expect(withoutShareParams('?y=1990&m=5&utm_source=wx&d=1&h=8&i=0&ref=a')).toBe('?utm_source=wx&ref=a');
    expect(withoutShareParams('?bz=1990_5')).toBe('');
    expect(inputFromUrl(`?y=1990&m=5&d=1&h=8&i=0&g=m&p=北京市&c=北京市&t=${'区'.repeat(21)}&s=1`)).toBeNull();
  });
  it('只带 y 等个别同名参数的外部链接不视为分享链接', async () => {
    const { hasShareParams } = await import('../src/composables/store.js');
    expect(hasShareParams('?y=2024&utm_source=x')).toBe(false);
    expect(hasShareParams('?y=2024&m=5&ref=blog')).toBe(false);
    expect(hasShareParams('?bz=1990_5')).toBe(true); // 新版被截断：仍识别，由 inputFromUrl 报无效
  });
  it('新版分享参数 bz：往返还原；其他网站的 t、s 等同名参数不被读取也不被删除', async () => {
    const { withoutShareParams } = await import('../src/composables/store.js');
    const url = new URL(shareUrl({ ...DEFAULT_FORM, district: '' }));
    expect([...url.searchParams.keys()]).toEqual(['bz']);
    const search = `${url.search}&t=1699999999&s=abc`;
    expect(inputFromUrl(search).district).toBe('东城区');            // 外部 t 不当作区县
    expect(withoutShareParams(search)).toBe('?t=1699999999&s=abc');   // 外部参数保留
    expect(inputFromUrl(url.search.slice(0, 20))).toBeNull();          // 被截断
  });
  it('地名含分隔符 _ 时分享链接退回旧版格式，仍能往返还原', () => {
    const input = { ...DEFAULT_FORM, province: '旧_省', city: '旧市', district: '' };
    const url = new URL(shareUrl(input));
    expect(url.searchParams.has('bz')).toBe(false);
    expect(inputFromUrl(url.search)).toMatchObject({ province: '旧_省', city: '旧市' });
  });
  it('被截断的链接不排盘', () => {
    expect(inputFromUrl('?y=1990&m=5')).toBeNull();
  });
  it('区县为空时链接省略区县，仍可还原', () => {
    const url = shareUrl({ ...DEFAULT_FORM, district: '' });
    expect(url).not.toContain('t=');
    expect(inputFromUrl(new URL(url).search).district).toBe('东城区');
  });
  it('空的区县参数仍可还原', () => {
    expect(inputFromUrl('?y=1990&m=5&d=1&h=8&i=0&g=m&p=广东省&c=广州市&t=&s=1').district).toBe('荔湾区');
  });
  it('已撤销的区县名（如杭州下城区）原样保留，真太阳时按市级经度', () => {
    expect(inputFromUrl('?y=1990&m=5&d=1&h=8&i=0&g=m&p=浙江省&c=杭州市&t=下城区&s=1').district).toBe('下城区');
  });
  it('城市已不在地区列表时保留原区县（不覆盖原始出生地）', async () => {
    const { normalizeInput } = await import('../src/composables/store.js');
    const n = normalizeInput({ ...DEFAULT_FORM, province: '浙江省', city: '旧市', district: '旧区' });
    expect([n.city, n.district]).toEqual(['旧市', '旧区']);
  });
  it('旧版错字地名（凼仔岛）规范化为现名（氹仔岛）', async () => {
    const { normalizeInput } = await import('../src/composables/store.js');
    expect(normalizeInput({ ...DEFAULT_FORM, province: '澳门特别行政区', city: '凼仔岛', district: '' }).city).toBe('氹仔岛');
  });
  it('值为 undefined 的字段按缺失处理（真太阳时默认开启）', async () => {
    const { normalizeInput } = await import('../src/composables/store.js');
    expect(normalizeInput({ ...DEFAULT_FORM, useTrueSolarTime: undefined }).useTrueSolarTime).toBe(true);
  });
  it('缺区县时取该市第一个区县', () => {
    expect(inputFromUrl('?y=1990&m=5&d=1&h=8&i=0&g=m&p=广东省&c=广州市&s=1').district).toBe('荔湾区');
  });
  it('越界数值不接受', () => {
    expect(inputFromUrl('?y=1993&m=1&d=4&h=30&i=0&g=m&p=北京市&c=北京市&t=东城区&s=1')).toBeNull();
    expect(inputFromUrl('?y=1993&m=13&d=4&h=3&i=0&g=m&p=北京市&c=北京市&t=东城区&s=1')).toBeNull();
    expect(inputFromUrl('?y=1993&m=1&d=4&h=3&i=75&g=m&p=北京市&c=北京市&t=东城区&s=1')).toBeNull();
  });
});

describe('术语弹窗', () => {
  it('词典未收录的术语不进入打开状态', async () => {
    const { openTerm, glossaryState } = await import('../src/composables/ui.js');
    openTerm('不存在的词');
    expect(glossaryState.term).toBeNull();
    openTerm('日元');
    expect(glossaryState.term).toBe('日元');
  });
});

describe('AI 提示词', () => {
  it('直辖市不重复写城市', async () => {
    const { buildAiPrompt } = await import('../src/utils/aiPrompt.js');
    calculateChart({ ...DEFAULT_FORM });
    expect(buildAiPrompt(store.result)).toContain('北京市东城区');
    expect(buildAiPrompt(store.result)).not.toContain('北京市北京市');
  });
});

describe('排盘来源', () => {
  it('区分自己提交与分享链接 / 档案（导览只对自己提交的盘自动开始）', () => {
    calculateChart({ ...DEFAULT_FORM });
    expect(store.resultSource).toBe('form');
    calculateChart({ ...DEFAULT_FORM }, 'url');
    expect(store.resultSource).toBe('url');
  });
});

describe('档案', () => {
  it('缺少性别等必填字段的旧档案被丢弃，不默认补成男命', async () => {
    const raw = JSON.stringify([{ id: 'x', name: 'x', tag: '', input: { year: 1990, month: 1, day: 1, hour: 1, minute: 0 } }]);
    globalThis.localStorage = { getItem: k => (k === 'xm:archive' ? raw : null), setItem() {} };
    const mod = await import('../src/composables/store.js?nogender=1');
    expect(mod.store.archive).toHaveLength(0);
    delete globalThis.localStorage;
  });
  it('区县缺失的输入按规范化后匹配已存档案', () => {
    store.archive = [];
    calculateChart({ ...DEFAULT_FORM });
    const a = saveToArchive('甲', '').entry;
    expect(archivedEntryOf({ ...DEFAULT_FORM, district: '' }).id).toBe(a.id);
  });
  it('快速连续保存的档案 ID 不重复', () => {
    store.archive = [];
    calculateChart({ ...DEFAULT_FORM });
    const a = saveToArchive('甲', '').entry;
    calculateChart({ ...DEFAULT_FORM, day: 5 });
    const b = saveToArchive('乙', '').entry;
    expect(a.id).not.toBe(b.id);
  });
  it('日期不存在（2 月 30 日）的档案被丢弃', async () => {
    const raw = JSON.stringify([{ id: 'z', name: 'z', tag: '', input: { ...DEFAULT_FORM, month: 2, day: 30 } }]);
    globalThis.localStorage = { getItem: k => (k === 'xm:archive' ? raw : null), setItem() {} };
    const mod = await import('../src/composables/store.js?feb30=1');
    expect(mod.store.archive).toHaveLength(0);
    delete globalThis.localStorage;
  });
  it('字段为字符串的损坏档案被丢弃', async () => {
    const raw = JSON.stringify([{ id: 'y', name: 'y', tag: '', input: { ...DEFAULT_FORM, year: '1990' } }]);
    globalThis.localStorage = { getItem: k => (k === 'xm:archive' ? raw : null), setItem() {} };
    const mod = await import('../src/composables/store.js?strtype=1');
    expect(mod.store.archive).toHaveLength(0);
    delete globalThis.localStorage;
  });
  it('存储可读不可写时，已保存的条目不会被存储中的旧数据覆盖', async () => {
    globalThis.localStorage = { getItem: k => (k === 'xm:archive' ? '[]' : null), setItem() { throw new Error('QuotaExceededError'); } };
    const mod = await import('../src/composables/store.js?readonly=1');
    mod.calculateChart({ ...DEFAULT_FORM });
    const a = mod.saveToArchive('甲', '');
    expect(a.ok).toBe(false);
    mod.calculateChart({ ...DEFAULT_FORM, day: 5 });
    mod.saveToArchive('乙', '');
    expect(mod.store.archive.map(e => e.name)).toEqual(['乙', '甲']);
    delete globalThis.localStorage;
  });
  it('写入失败后存储恢复：合并而不覆盖其他标签页的保存', async () => {
    const backing = { 'xm:archive': '[]' };
    let fail = true;
    globalThis.localStorage = {
      getItem: k => backing[k] ?? null,
      setItem: (k, v) => { if (fail) throw new Error('QuotaExceededError'); backing[k] = v; }
    };
    const mod = await import('../src/composables/store.js?merge=1');
    mod.calculateChart({ ...DEFAULT_FORM });
    expect(mod.saveToArchive('本页甲', '').ok).toBe(false);      // 1. 写入失败，仅在内存
    const other = { id: 'tabB', name: '他页乙', tag: '', input: { ...DEFAULT_FORM, day: 9 } };
    backing['xm:archive'] = JSON.stringify([other]);             // 2. 另一标签页保存
    fail = false;                                                // 3. 存储恢复
    mod.calculateChart({ ...DEFAULT_FORM, day: 5 });
    expect(mod.saveToArchive('本页丙', '').ok).toBe(true);
    const names = JSON.parse(backing['xm:archive']).map(e => e.name);
    expect(names.sort()).toEqual(['他页乙', '本页丙', '本页甲'].sort());
    delete globalThis.localStorage;
  });
  it('写入失败的改名在同步存储后不被还原；“我的命盘”写入失败时本页仍以内存为准', async () => {
    const backing = { 'xm:archive': '[]' };
    let fail = false;
    globalThis.localStorage = {
      getItem: k => backing[k] ?? null,
      setItem: (k, v) => { if (fail) throw new Error('QuotaExceededError'); backing[k] = v; }
    };
    const mod = await import('../src/composables/store.js?edit=1');
    mod.calculateChart({ ...DEFAULT_FORM });
    const { entry } = mod.saveToArchive('未命名', '');
    fail = true;
    expect(mod.saveToArchive('妈妈', '家人').ok).toBe(false);       // 改名写入失败
    expect(mod.setMe(entry.id)).toBe(false);                         // 设为我写入失败
    mod.calculateChart({ ...DEFAULT_FORM, day: 5 });
    mod.saveToArchive('另一条', '');                                  // 触发同步
    expect(mod.store.archive.find(e => e.id === entry.id).name).toBe('妈妈');
    expect(mod.store.meId).toBe(entry.id);
    delete globalThis.localStorage;
  });
  it('写入失败的改名，若该条目已被其他标签页删除，同步后不复活', async () => {
    const backing = { 'xm:archive': '[]' };
    let fail = false;
    globalThis.localStorage = {
      getItem: k => backing[k] ?? null,
      setItem: (k, v) => { if (fail) throw new Error('QuotaExceededError'); backing[k] = v; }
    };
    const mod = await import('../src/composables/store.js?revive=1');
    mod.calculateChart({ ...DEFAULT_FORM });
    const { entry } = mod.saveToArchive('甲', '');
    fail = true;
    expect(mod.saveToArchive('甲改', '').ok).toBe(false);          // 改名写入失败
    backing['xm:archive'] = '[]';                                     // 另一标签页删除了它
    fail = false;
    mod.calculateChart({ ...DEFAULT_FORM, day: 5 });
    mod.saveToArchive('乙', '');                                      // 触发同步并写入
    expect(mod.store.archive.some(e => e.id === entry.id)).toBe(false);
    expect(JSON.parse(backing['xm:archive']).map(e => e.name)).toEqual(['乙']);
    delete globalThis.localStorage;
  });
  it('本版本无法识别的档案条目不显示，但保存时原样写回', async () => {
    const future = { id: 'future1', name: '新格式', input: { year: 1990, month: 2, day: 30 }, extra: 1 };
    const backing = { 'xm:archive': JSON.stringify([future]) };
    globalThis.localStorage = { getItem: k => backing[k] ?? null, setItem: (k, v) => { backing[k] = v; } };
    const mod = await import('../src/composables/store.js?hidden=1');
    expect(mod.store.archive.length).toBe(0);
    mod.calculateChart({ ...DEFAULT_FORM });
    mod.saveToArchive('甲', '');
    const ids = JSON.parse(backing['xm:archive']).map(e => e.id);
    expect(ids).toContain('future1');
    expect(ids.length).toBe(2);
    expect(ids[0]).toBe('future1'); // 保持原位置（原本在第 0 位）
    delete globalThis.localStorage;
  });
  it('缺区县的条目补该市第一个区县（不补成默认的东城区）；缺省市的条目被丢弃', async () => {
    const { normalizeInput } = await import('../src/composables/store.js');
    const { district, ...noDistrict } = DEFAULT_FORM;
    expect(normalizeInput({ ...noDistrict, province: '上海市', city: '上海市' }).district).not.toBe('东城区');
    const { province, ...noProvince } = DEFAULT_FORM;
    const raw = JSON.stringify([{ id: 'p', name: '缺省', tag: '', input: noProvince }]);
    globalThis.localStorage = { getItem: k => (k === 'xm:archive' ? raw : null), setItem() {} };
    const mod = await import('../src/composables/store.js?noplace=1');
    expect(mod.store.archive.length).toBe(0);
    delete globalThis.localStorage;
  });
  it('真太阳时字段损坏（非布尔）的条目被丢弃，缺失的按旧版默认保留', async () => {
    const raw = JSON.stringify([
      { id: 'bad', name: '坏', tag: '', input: { ...DEFAULT_FORM, useTrueSolarTime: 'false' } },
      { id: 'old', name: '旧', tag: '', input: (({ useTrueSolarTime, ...r }) => r)(DEFAULT_FORM) }
    ]);
    globalThis.localStorage = { getItem: k => (k === 'xm:archive' ? raw : null), setItem() {} };
    const mod = await import('../src/composables/store.js?solar=1');
    expect(mod.store.archive.map(e => e.id)).toEqual(['old']);
    delete globalThis.localStorage;
  });
  it('keepName：先同步存储再查已有条目，不覆盖其他标签页起的称呼', async () => {
    const backing = { 'xm:archive': '[]' };
    globalThis.localStorage = { getItem: k => backing[k] ?? null, setItem: (k, v) => { backing[k] = v; } };
    const mod = await import('../src/composables/store.js?keep=1');
    mod.calculateChart({ ...DEFAULT_FORM });
    backing['xm:archive'] = JSON.stringify([{ id: 'mom', name: '妈妈', tag: '家人', input: { ...DEFAULT_FORM } }]); // 他页刚保存，本页尚未同步
    const saved = mod.saveChart({ name: '我', tag: '自己', asMe: true, keepName: true });
    expect(saved.entry.id).toBe('mom');
    expect(saved.entry.name).toBe('妈妈');
    delete globalThis.localStorage;
  });
  it('无法识别的条目（含无 id 的）保持与相邻条目的相对次序', async () => {
    const A = { id: 'a', name: 'A', tag: '', input: { ...DEFAULT_FORM, day: 6 } };
    const B = { id: 'b', name: 'B', tag: '', input: { ...DEFAULT_FORM, day: 7 } };
    const H = { name: '无 id 新格式', data: 1 };
    const backing = { 'xm:archive': JSON.stringify([A, H, B]) };
    globalThis.localStorage = { getItem: k => backing[k] ?? null, setItem: (k, v) => { backing[k] = v; } };
    const mod = await import('../src/composables/store.js?order=1');
    mod.calculateChart({ ...DEFAULT_FORM });
    mod.saveToArchive('X', '');                                           // 新增放最前
    expect(JSON.parse(backing['xm:archive']).map(e => e.name)).toEqual(['X', 'A', '无 id 新格式', 'B']);
    mod.removeFromArchive('a');                                           // 删除 H 前面的 A
    expect(JSON.parse(backing['xm:archive']).map(e => e.name)).toEqual(['X', '无 id 新格式', 'B']);
    delete globalThis.localStorage;
  });
  it('与可用条目同 id 的损坏副本也原样保留', async () => {
    const A = { id: 'a', name: 'A', tag: '', input: { ...DEFAULT_FORM, day: 6 } };
    const bad = { id: 'a', name: '坏副本', input: { ...DEFAULT_FORM, gender: 'x' } };
    const backing = { 'xm:archive': JSON.stringify([A, bad]) };
    globalThis.localStorage = { getItem: k => backing[k] ?? null, setItem: (k, v) => { backing[k] = v; } };
    const mod = await import('../src/composables/store.js?dupid=1');
    expect(mod.store.archive.length).toBe(1);
    mod.calculateChart({ ...DEFAULT_FORM });
    mod.saveToArchive('X', '');
    expect(JSON.parse(backing['xm:archive']).map(e => e.name)).toEqual(['X', 'A', '坏副本']);
    delete globalThis.localStorage;
  });
  it('同 id 的损坏副本不被当作其他隐藏条目的锚点', async () => {
    const A = { id: 'A', name: 'A', tag: '', input: { ...DEFAULT_FORM, day: 6 } };
    const B = { id: 'B', name: 'B', tag: '', input: { ...DEFAULT_FORM, day: 7 } };
    const X = { id: 'A', name: 'X坏' }, Y = { name: 'Y坏' };
    const backing = { 'xm:archive': JSON.stringify([A, X, B, Y]) };
    globalThis.localStorage = { getItem: k => backing[k] ?? null, setItem: (k, v) => { backing[k] = v; } };
    const mod = await import('../src/composables/store.js?anchor=1');
    mod.calculateChart({ ...DEFAULT_FORM });
    mod.saveToArchive('N', '');
    expect(JSON.parse(backing['xm:archive']).map(e => e.name)).toEqual(['N', 'A', 'X坏', 'B', 'Y坏']);
    delete globalThis.localStorage;
  });
  it('档案不是数组（如新版本格式）时只读，不覆盖原数据', async () => {
    const future = { version: 2, entries: [{ id: 'z' }] };
    const backing = { 'xm:archive': JSON.stringify(future) };
    globalThis.localStorage = { getItem: k => backing[k] ?? null, setItem: (k, v) => { backing[k] = v; } };
    const mod = await import('../src/composables/store.js?nonarray=1');
    mod.calculateChart({ ...DEFAULT_FORM });
    expect(mod.saveToArchive('甲', '').ok).toBe(false);           // 只读：不写回
    expect(JSON.parse(backing['xm:archive'])).toEqual(future);    // 原数据不被覆盖
    expect(mod.store.archive.map(e => e.name)).toEqual(['甲']);  // 本次访问内仍可见
    delete globalThis.localStorage;
  });
  it('档案数组中的非对象值（字符串、null）也原样保留', async () => {
    const A = { id: 'a', name: 'A', tag: '', input: { ...DEFAULT_FORM, day: 6 } };
    const backing = { 'xm:archive': JSON.stringify(['legacy-id', A, null]) };
    globalThis.localStorage = { getItem: k => backing[k] ?? null, setItem: (k, v) => { backing[k] = v; } };
    const mod = await import('../src/composables/store.js?prim=1');
    mod.calculateChart({ ...DEFAULT_FORM });
    mod.saveToArchive('N', '');
    expect(JSON.parse(backing['xm:archive'])).toEqual(['legacy-id', expect.objectContaining({ name: 'N' }), expect.objectContaining({ name: 'A' }), null]) // legacy-id 原本在最前，仍放最前;
    delete globalThis.localStorage;
  });
  it('档案内容不是合法 JSON：先备份原文，之后可以正常保存', async () => {
    const backing = { 'xm:archive': '[{"id":' };
    globalThis.localStorage = { getItem: k => backing[k] ?? null, setItem: (k, v) => { backing[k] = v; } };
    const mod = await import('../src/composables/store.js?corrupt=1');
    mod.calculateChart({ ...DEFAULT_FORM });
    expect(mod.saveToArchive('甲', '').ok).toBe(true);
    expect(backing['xm:archive:corrupt']).toBe('[{"id":');
    // 载入时备份过一次，保存前的同步再读到同一份损坏内容：不重复备份
    expect(Object.keys(backing).filter(k => k.startsWith('xm:archive:corrupt')).length).toBe(1);
    expect(JSON.parse(backing['xm:archive']).map(e => e.name)).toEqual(['甲']);
    // 再次损坏：不覆盖第一次的备份，存为“最近一份”
    backing['xm:archive'] = '[{"x":';
    mod.saveToArchive('乙', '');
    expect(backing['xm:archive:corrupt']).toBe('[{"id":');
    expect(backing['xm:archive:corrupt:latest']).toBe('[{"x":');
    // 之后再损坏（内容不同）只覆盖“最近一份”，备份键最多两个
    backing['xm:archive'] = '[{"y":';
    mod.saveToArchive('丙', '');
    expect(backing['xm:archive:corrupt:latest']).toBe('[{"y":');
    expect(Object.keys(backing).filter(k => k.startsWith('xm:archive:corrupt')).length).toBe(2);
    delete globalThis.localStorage;
  });
  it('档案内容不是合法 JSON 且备份失败时只读：不覆盖、不改写“我的命盘”', async () => {
    const backing = { 'xm:archive': '{broken', 'xm:me': '"theirs"' };
    globalThis.localStorage = { getItem: k => backing[k] ?? null, setItem: (k, v) => { if (k.endsWith(':corrupt')) throw new Error('Quota'); backing[k] = v; } };
    const mod = await import('../src/composables/store.js?unparse=1');
    mod.calculateChart({ ...DEFAULT_FORM });
    const r = mod.saveChart({ name: '我', tag: '', asMe: true });
    expect(r.ok).toBe(false);
    expect(backing['xm:archive']).toBe('{broken');
    expect(backing['xm:me']).toBe('"theirs"');
    delete globalThis.localStorage;
  });
  it('条目输入中本版本不认识的字段写回时保留', async () => {
    const A = { id: 'a', name: 'A', tag: '', input: { ...DEFAULT_FORM, day: 6, calendar: 'lunar' } };
    const backing = { 'xm:archive': JSON.stringify([A]) };
    globalThis.localStorage = { getItem: k => backing[k] ?? null, setItem: (k, v) => { backing[k] = v; } };
    const mod = await import('../src/composables/store.js?extra=1');
    mod.calculateChart({ ...DEFAULT_FORM });
    mod.saveToArchive('N', '');
    expect(JSON.parse(backing['xm:archive']).find(e => e.id === 'a').input.calendar).toBe('lunar');
    mod.loadEntry(mod.store.archive.find(e => e.id === 'a'));
    expect('calendar' in mod.store.form).toBe(false);
    delete globalThis.localStorage;
  });
  it('删除“我的命盘”条目时档案写入失败：不清除存储中的指针', async () => {
    const A = { id: 'a', name: 'A', tag: '', input: { ...DEFAULT_FORM, day: 6 } };
    const backing = { 'xm:archive': JSON.stringify([A]), 'xm:me': '"a"' };
    globalThis.localStorage = { getItem: k => backing[k] ?? null, setItem: (k, v) => { if (k === 'xm:archive') throw new Error('Quota'); backing[k] = v; } };
    const mod = await import('../src/composables/store.js?rmfail=1');
    expect(mod.removeFromArchive('a')).toBe(false);
    expect(backing['xm:me']).toBe('"a"');
    expect(mod.store.meId).toBe(null);
    delete globalThis.localStorage;
  });
  it('存储中的档案为 0 / "" 等假值时同样只读', async () => {
    const backing = { 'xm:archive': '[]' };
    globalThis.localStorage = { getItem: k => backing[k] ?? null, setItem: (k, v) => { backing[k] = v; } };
    const mod = await import('../src/composables/store.js?falsy=1');
    backing['xm:archive'] = '0';                                  // 其他版本写入了无法识别的值
    mod.calculateChart({ ...DEFAULT_FORM });
    expect(mod.saveToArchive('甲', '').ok).toBe(false);
    expect(backing['xm:archive']).toBe('0');
    delete globalThis.localStorage;
  });
  it('设为“我的命盘”前先同步：已被其他标签页删除的条目不能设', async () => {
    const A = { id: 'a', name: 'A', tag: '', input: { ...DEFAULT_FORM, day: 6 } };
    const backing = { 'xm:archive': JSON.stringify([A]) };
    globalThis.localStorage = { getItem: k => backing[k] ?? null, setItem: (k, v) => { backing[k] = v; } };
    const mod = await import('../src/composables/store.js?stale=1');
    backing['xm:archive'] = '[]';                                 // 他页删除（本页错过事件）
    expect(mod.setMe('a')).toBe(false);
    expect(backing['xm:me']).toBeUndefined();
    delete globalThis.localStorage;
  });
  it('写入失败的条目记入 unsavedIds（界面据此显示“仅本次访问”），写入成功后清空', async () => {
    let fail = true;
    const backing = { 'xm:archive': '[]' };
    globalThis.localStorage = { getItem: k => backing[k] ?? null, setItem: (k, v) => { if (fail) throw new Error('Quota'); backing[k] = v; } };
    const mod = await import('../src/composables/store.js?unsavedids=1');
    mod.calculateChart({ ...DEFAULT_FORM });
    const { entry } = mod.saveToArchive('甲', '');
    expect(mod.store.unsavedIds).toEqual([entry.id]);
    fail = false;
    mod.calculateChart({ ...DEFAULT_FORM, day: 5 });
    mod.saveToArchive('乙', '');
    expect(mod.store.unsavedIds).toEqual([]);
    delete globalThis.localStorage;
  });
  it('损坏的档案数据被丢弃', async () => {
    globalThis.localStorage = { getItem: k => (k === 'xm:archive' ? '{}' : null), setItem() {} };
    const mod = await import('../src/composables/store.js?bad=1');
    expect(Array.isArray(mod.store.archive)).toBe(true);
    delete globalThis.localStorage;
  });
  it('同一命盘不重复存入', async () => {
    const backing = {};
    globalThis.localStorage = { getItem: k => backing[k] ?? null, setItem: (k, v) => { backing[k] = v; } };
    const mod = await import('../src/composables/store.js?dedupe=1'); // 独立实例，不受其他用例残留状态影响
    mod.calculateChart({ ...DEFAULT_FORM });
    const a = mod.saveToArchive('我', '自己').entry;
    const b = mod.saveToArchive('我自己', '').entry;
    expect(mod.store.archive).toHaveLength(1);
    expect(a.id).toBe(b.id);
    expect(mod.store.archive[0].name).toBe('我自己');
    expect(mod.store.archive[0].tag).toBe('');
    delete globalThis.localStorage;
  });
  it('存储中的档案被清除（未收到存储事件）后保存，不把已清除的条目写回', async () => {
    const A = { id: 'a', name: 'A', tag: '', input: { ...DEFAULT_FORM, day: 6 } };
    const backing = { 'xm:archive': JSON.stringify([A]) };
    globalThis.localStorage = { getItem: k => backing[k] ?? null, setItem: (k, v) => { backing[k] = v; } };
    const mod = await import('../src/composables/store.js?cleared=1');
    delete backing['xm:archive'];                                   // 在浏览器设置里清除了网站数据
    mod.calculateChart({ ...DEFAULT_FORM });
    mod.saveToArchive('N', '');
    expect(JSON.parse(backing['xm:archive']).map(e => e.name)).toEqual(['N']);
    delete globalThis.localStorage;
  });
  it('档案判重按规范化后的输入（缺字段的旧条目也能识别）', async () => {
    const { useTrueSolarTime, ...partial } = DEFAULT_FORM;
    const raw = JSON.stringify([{ id: 'old', name: '旧', tag: '', input: partial }]);
    globalThis.localStorage = { getItem: k => (k === 'xm:archive' ? raw : null), setItem() {} };
    const mod = await import('../src/composables/store.js?norm=1'); // 走真实的载入与规范化路径
    mod.calculateChart({ ...DEFAULT_FORM });
    expect(mod.archivedEntryOf(mod.store.result.input).id).toBe('old');
    delete globalThis.localStorage;
  });
});
