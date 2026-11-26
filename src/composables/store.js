// 应用状态：排盘 / 合盘表单与结果、命盘档案、“我的命盘”、URL 分享
import { reactive, markRaw } from 'vue';
import { computeChart, computeCompat, BaziError } from '../engine/index.js';
import { storage as LS } from '../utils/storage.js';
import { citiesOf, firstDistrict, CITY_ALIAS } from './region.js';
import { isValidBirth } from '../utils/validate.js';

const ARCHIVE_KEY = 'xm:archive';
const ME_KEY = 'xm:me';

// 本版本无法识别的条目（损坏，或新版本写入的新格式）：不显示，但写回存储时原样保留，避免删掉其他标签页 / 新版本的数据
let hiddenEntries = [];
// 存储中的档案整体不是数组（如新版本改用的对象格式）：本版本无法合并，改为只读，不写回以免覆盖
let archiveForeign = false;
const UNPARSEABLE = Object.freeze({ unparseable: true }); // 无法解析且备份失败：视为无法识别（只读）
/**
 * 读取存储中的档案原值：不存在为 null。
 * 内容不是合法 JSON（写入中断、扩展改写等）：先把原文备份到 xm:archive:corrupt，再按空档案处理，用户可以继续保存；
 * 备份失败时才按只读处理，绝不覆盖原数据
 */
function readArchive() {
  const { value, invalid, text } = LS.readRaw(ARCHIVE_KEY);
  if (!invalid) return value;
  // 最多两份备份：第一次损坏的原文永久保留；之后的损坏只保留最近一份（同一内容不重复写入），不会无限累积
  const first = `${ARCHIVE_KEY}:corrupt`;
  const latest = `${first}:latest`;
  const prev = LS.readRaw(first).text;
  if (prev === text || (prev !== null && LS.readRaw(latest).text === text)) return null;
  return LS.copyRaw(ARCHIVE_KEY, prev === null ? first : latest) ? null : UNPARSEABLE;
}
/** 读取存储中的档案：返回可用条目，并记下无法识别、需原样保留的条目 */
function loadArchive(raw) {
  archiveForeign = raw != null && !Array.isArray(raw);
  const list = Array.isArray(raw) ? raw : [];
  // 每条只校验一次；按条目本身判断（不按 id：同 id 的损坏副本也要原样保留）
  const ok = list.map(usableEntry);
  // 无法识别的条目（任何对象，不论有无 id）记下前后相邻的可用条目，写回时放回原处，保持相对次序
  hiddenEntries = [];
  let after = null;
  list.forEach((e, i) => {
    if (ok[i]) after = e.id;
    else hiddenEntries.push({ entry: e, after, before: null, i }); // 任何值（含字符串、null 等）都原样保留
  });
  let before = null, k = hiddenEntries.length - 1;
  for (let i = list.length - 1; i >= 0 && k >= 0; i--) {
    if (ok[i]) before = list[i].id;
    else if (hiddenEntries[k].i === i) hiddenEntries[k--].before = before;
  }
  return list.filter((_, i) => ok[i]).map(normalizeEntry);
}

// —— 档案条目校验 ——
// 出生年月日时分与性别为必填且须为合法数值：缺失或损坏则无法还原原命盘，宁可丢弃也不默认补成男命
// 出生地（省、市）同样必填：缺失时若补成默认的北京，真太阳时校正会悄悄改变命盘
const hasPlace = i => typeof i.province === 'string' && !!i.province && typeof i.city === 'string' && !!i.city;
// 真太阳时开关：早期档案可能没有此字段（按当时默认开启）；有则必须是布尔值，损坏的不猜
const solarOk = i => i.useTrueSolarTime === undefined || typeof i.useTrueSolarTime === 'boolean';
/** 存储中的单个条目是否可用（本版本能识别） */
const usableEntry = e => !!e && typeof e.id === 'string' && !!e.input && typeof e.input === 'object' && isValidBirth(e.input) && hasPlace(e.input) && solarOk(e.input);
/** 补齐称呼、标签并规范化出生信息（载入时规范化一次，之后直接比较） */
const normalizeEntry = e => ({
  ...e,
  name: typeof e.name === 'string' && e.name ? e.name : '未命名',
  tag: typeof e.tag === 'string' ? e.tag : '',
  // 保留本版本不认识的字段（新版本可能新增），写回时不丢；已知字段按规范化结果覆盖
  input: { ...e.input, ...normalizeInput(e.input) }
});

export const DEFAULT_FORM = Object.freeze({
  year: 1993, month: 1, day: 4, hour: 14, minute: 0,
  province: '北京市', city: '北京市', district: '东城区',
  useTrueSolarTime: true, gender: 'male'
});
const INPUT_FIELDS = Object.keys(DEFAULT_FORM);
function partyDefaults(over = {}) {
  const { useTrueSolarTime, gender, ...rest } = DEFAULT_FORM; // 合盘不用性别；真太阳时在 form2 统一控制
  return { ...rest, ...over };
}
const pickInput = o => Object.fromEntries(INPUT_FIELDS.map(k => [k, o[k]]));

export const store = reactive({
  form: { ...DEFAULT_FORM },
  form2: {
    useTrueSolarTime: true,
    // 真太阳时开关在 form2 上统一控制，各方不单独保存
    party1: partyDefaults(),
    party2: partyDefaults({ year: 1995, month: 5, day: 20, hour: 8, minute: 30 })
  },
  result: null,
  resultSource: null, // 'form' 自己提交 / 'url' 分享链接 / 'archive' 档案
  resultSilent: false, // 当前命盘是否为静默恢复（见 calculateChart）
  unsavedIds: [], // 未能写入存储（仅本次访问有效）的档案条目 ID，供界面显示
  compat: null,
  chartError: '',
  compatError: '',
  archive: loadArchive(readArchive()),
  meId: null
});
/** “我的命盘”须指向档案中仍存在的条目 */
function syncMe() {
  if (archiveForeign) return; // 档案只读时“我的命盘”只在本页内存中，不被存储中的值覆盖
  const id = LS.get(ME_KEY, null); // 写入失败时存储工具返回内存中的值
  store.meId = store.archive.some(e => e.id === id) ? id : null;
}
syncMe();

const errorMessage = e => (e instanceof BaziError ? e.message : '排盘出错，请稍后重试');

/**
 * @param {'form'|'url'|'archive'} source 命盘来源
 * @param {{ silent?: boolean }} opts silent：静默恢复（如发布新版本后自动刷新），页面不滚动、不弹导览
 */
export function calculateChart(input = store.form, source = 'form', { silent = false } = {}) {
  store.chartError = '';
  try {
    store.resultSource = source;
    store.resultSilent = silent;
    store.result = markRaw(computeChart(pickInput(input))); // 结果只读，整体替换即可触发更新，不做深层代理
    return true;
  } catch (e) {
    if (!(e instanceof BaziError)) console.error('八字计算错误:', e);
    store.result = null;
    store.chartError = errorMessage(e);
    return false;
  }
}

export function calculateCompat() {
  store.compatError = '';
  const opts = { useTrueSolarTime: store.form2.useTrueSolarTime };
  try {
    store.compat = markRaw(computeCompat({ ...store.form2.party1, ...opts }, { ...store.form2.party2, ...opts }));
  } catch (e) {
    if (!(e instanceof BaziError)) console.error('合盘计算错误:', e);
    store.compat = null;
    store.compatError = errorMessage(e);
  }
}

// —— 档案 ——
// 写入失败（无痕模式 / 空间已满）时，把改动记入“未落盘改动表”（id → 条目或 REMOVED），
// 同步存储时以它为准合并：新增、修改、删除统一处理，既不丢本标签页的改动，也不覆盖其他标签页的保存
const REMOVED = Symbol('removed');
const unsaved = new Map();
const unsavedNew = new Set(); // 其中本标签页新增、存储里从未有过的条目
/** 把未落盘的条目 ID 同步到响应式状态（界面据此提示“仅本次访问有效”） */
function syncUnsaved() { store.unsavedIds = [...unsaved.keys()].filter(id => unsaved.get(id) !== REMOVED); }
/** 写入档案，返回是否成功；失败时记下本次涉及的条目 */
function persist(id, change) {
  if (archiveForeign) { if (id) unsaved.set(id, change); syncUnsaved(); return false; } // 只读：改动仅留在本次访问
  const all = [...store.archive];
  // 按原次序插回：优先放在原先前一个可用条目之后，其已删除则放在原先后一个之前；原本在最前的放最前，前后条目都已删除的放末尾；同一位置的多条保持原顺序
  let lastKey, cursor = 0;
  const hidden = new Set(hiddenEntries.map(h => h.entry));
  const at = id => all.findIndex(e => !hidden.has(e) && e.id === id); // 只在可用条目中找锚点（同 id 的损坏副本不算）
  for (const { entry, after, before } of hiddenEntries) {
    const key = `${after}|${before}`;
    if (key !== lastKey) {
      const ai = after === null ? -1 : at(after);
      const bi = before === null ? -1 : at(before);
      cursor = after === null ? 0 : ai >= 0 ? ai + 1 : bi >= 0 ? bi : all.length; // 原本在最前的仍放最前
      lastKey = key;
    }
    all.splice(cursor++, 0, entry);
  }
  const ok = LS.set(ARCHIVE_KEY, all);
  if (ok) { unsaved.clear(); unsavedNew.clear(); }
  else if (id) unsaved.set(id, change);
  syncUnsaved();
  return ok;
}
/** 存储写入失败时的统一提示 */
export const STORAGE_FAIL_MSG = '未能写入本地存储（如无痕模式、空间已满，或档案由更新版本的网站写入），仅在本次访问有效';
/**
 * 修改前先读取存储中的最新档案（其他标签页可能已修改），与未落盘改动合并，避免整体覆盖造成丢失。
 * 键不存在一律视为空档案（含未收到存储事件的清除，如在浏览器设置里清除网站数据、标签页被冻结时清除）：
 * 已写入过存储的条目以存储为准；从未写入成功的条目都在未落盘改动表里，合并时保留
 */
function refreshArchive() {
  const fresh = readArchive(); // 读真实存储，与未落盘改动表合并
  // 内容未变的条目沿用原对象：依赖条目的计算属性（如“我的命盘”）不会被无谓触发
  const old = new Map(store.archive.map(e => [e.id, e]));
  const merged = loadArchive(fresh === null ? [] : fresh).map(e => {
    const prev = old.get(e.id);
    return prev && JSON.stringify(prev) === JSON.stringify(e) ? prev : e;
  });
  // 叠加未落盘的改动：删除的去掉，新增 / 修改的以内存版本为准
  for (const [id, change] of unsaved) {
    const at = merged.findIndex(e => e.id === id);
    if (change === REMOVED) { if (at >= 0) merged.splice(at, 1); }
    else if (at >= 0) merged[at] = change;           // 修改：原位替换，不打乱顺序
    else if (unsavedNew.has(id)) merged.unshift(change); // 新增：放在最前
    else { unsaved.delete(id); syncUnsaved(); } // 修改的条目已被其他标签页删除：以删除为准，不复活
  }
  store.archive = merged;
  if (store.meId && !store.archive.some(e => e.id === store.meId)) store.meId = null;
}
// 其他标签页修改档案或“我的命盘”时同步过来
if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.key === null || e.key === ARCHIVE_KEY) { refreshArchive(); syncMe(); }
    if (e.key === ME_KEY) syncMe(); // 对方已成功写入（兜底副本已由 storage.js 丢弃），以存储为准
  });
}

const sameInput = (a, b) => INPUT_FIELDS.every(k => a[k] === b[k]);
/**
 * 当前命盘在档案中的条目（两边都按规范化后的出生信息比较）
 * @param {boolean} normalized 传入的已是规范化后的输入时跳过再次规范化
 */
export const archivedEntryOf = (input, normalized = false) => {
  const n = normalized ? input : normalizeInput(input);
  return store.archive.find(e => sameInput(e.input, n)) || null;
};

/** 档案条目 ID：优先用 crypto.randomUUID；不可用时用时间戳 + 两段补足长度的随机数（删除、设为“我”、跨标签页合并都依赖 ID 唯一） */
function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  const rnd = () => Math.random().toString(36).slice(2).padEnd(10, '0').slice(0, 10);
  return `${Date.now().toString(36)}-${rnd()}${rnd()}`;
}

/** @returns {{ entry, ok: boolean } | null} ok 为是否已写入存储 */
export function saveToArchive(name, tag, { synced = false } = {}) {
  if (!store.result) return null;
  if (!synced) refreshArchive(); // saveChart 已同步过则不重复读取
  const input = normalizeInput(store.result.input); // 与载入时同一规则
  const existing = archivedEntryOf(input, true);
  if (existing) {
    // 已存在：更新称呼与标签，不重复添加
    if (name) existing.name = name;
    existing.tag = tag || '';
    return { entry: existing, ok: persist(existing.id, existing) };
  }
  const entry = { id: newId(), name: name || '未命名', tag: tag || '', input, createdAt: Date.now() };
  store.archive.unshift(entry);
  unsavedNew.add(entry.id); // 写入成功时会随 persist 清空
  return { entry, ok: persist(entry.id, entry) };
}
/** @returns {boolean} 是否已写入存储 */
export function removeFromArchive(id) {
  refreshArchive();
  store.archive = store.archive.filter(e => e.id !== id);
  const ok = persist(id, REMOVED);
  if (store.meId !== id) return ok;
  // 档案写入成功后才清除存储中的“我的命盘”；失败时只在本页清除，避免条目还在存储里而指针已丢
  if (ok) setMe(null); // 指针写入失败时内存兜底层仍为 null；删除本身已保存，按成功返回
  else store.meId = null;
  return ok;
}
/** @returns {boolean} 是否已写入存储 */
/** @param {{ synced?: boolean }} opts synced：调用方刚同步过存储，不再重复读取 */
export function setMe(id, { synced = false } = {}) {
  if (id) {
    if (!synced) refreshArchive(); // 补上可能错过的跨标签页事件（如标签页曾被冻结）
    if (!store.archive.some(e => e.id === id)) return false; // 条目已被其他标签页删除
  }
  store.meId = id;
  // 档案只读（由更新版本写入或无法解析）时不写“我的命盘”：本页的条目并不在存储里，写入会覆盖对方的设置
  if (archiveForeign) return false;
  return LS.set(ME_KEY, id);
}
/** 出生地是否仍在地区列表中（区划调整后可能不在） */
export function placeKnown(input) { return citiesOf(input.province).includes(input.city); }

/** 规范化档案中的出生信息：以默认值补齐缺失字段；区县缺失时取该市第一个区县（不在列表中的区县名原样保留，真太阳时退回市级经度） */
export function normalizeInput(raw) {
  // 区县不取默认值（默认是北京的东城区），缺失时下面按该市补
  // 值为 undefined 的键视同缺失（否则展开时会覆盖默认值，如真太阳时开关变成 undefined 而被当作关闭）
  const given = Object.fromEntries(Object.entries(raw || {}).filter(([, v]) => v !== undefined));
  const input = pickInput({ ...DEFAULT_FORM, district: '', ...given });
  if (Object.prototype.hasOwnProperty.call(CITY_ALIAS, input.city)) input.city = CITY_ALIAS[input.city]; // 旧错字 / 旧名
  // 只在区县缺失时补默认；已撤销或不在列表的区县原样保留（真太阳时按市级经度回退），避免改变原始出生地
  if (!input.district && placeKnown(input)) input.district = firstDistrict(input.province, input.city);
  return input;
}

export function loadEntry(entry) {
  // 档案输入已在载入 / 保存时规范化
  const input = pickInput(entry.input); // 只取本版本的字段（条目可能带有新版本的额外字段）
  Object.assign(store.form, input);
  return calculateChart(input, 'archive');
}
/**
 * 存入档案（已存在则只更新称呼与标签）并按需设为“我的命盘”
 * @param {{ name?, tag?, asMe: boolean, keepName?: boolean }} opts keepName：已存在时不改称呼
 * @returns {{ entry, ok: boolean } | null}
 */
export function saveChart({ name, tag, asMe, keepName = false }) {
  if (!store.result) return null;
  refreshArchive(); // 先同步其他标签页的保存（keepName 时避免查不到已有条目而覆盖其称呼）
  const existing = keepName ? archivedEntryOf(store.result.input) : null;
  // 已存在但仍在未落盘改动表中：档案其实没写进存储
  const saved = existing ? { entry: existing, ok: !unsaved.has(existing.id) } : saveToArchive(name, tag, { synced: true });
  if (!saved) return null;
  let meOk = true;
  if (asMe) meOk = setMe(saved.entry.id, { synced: true }); // 上面已同步过
  else if (store.meId === saved.entry.id) meOk = setMe(null);
  return { entry: saved.entry, ok: saved.ok && meOk };
}

export const meEntry = () => store.archive.find(e => e.id === store.meId) || null;

// —— URL 分享 ——
// 字段顺序即分享参数 bz 中各段的顺序
const URL_KEYS = { y: 'year', m: 'month', d: 'day', h: 'hour', i: 'minute', g: 'gender', p: 'province', c: 'city', t: 'district', s: 'useTrueSolarTime' };
// 分享链接只用一个命名空间参数 bz（各段以 _ 连接），不与其他网站常见的单字母参数（t、s、c…）冲突。
// 旧版链接（每个字段一个单字母参数）仍可打开。
const SHARE_KEY = 'bz';
const SEP = '_'; // URLSearchParams 不转义 _，链接更短；地名中不会出现

export function shareUrl(input) {
  const parts = Object.entries(URL_KEYS).map(([, key]) => {
    const v = input[key];
    return key === 'useTrueSolarTime' ? (v ? '1' : '0') : key === 'gender' ? (v === 'male' ? 'm' : 'f') : String(v ?? '');
  });
  // 个别旧地名含分隔符时无法拼成 bz：改用旧版格式（仍可打开）
  const q = parts.some(v => v.includes(SEP))
    ? new URLSearchParams(Object.keys(URL_KEYS).map((k, i) => [k, parts[i]]).filter(([k, v]) => k !== 't' || v))
    : new URLSearchParams({ [SHARE_KEY]: parts.join(SEP) });
  return `${location.origin}${location.pathname}?${q.toString()}#paipan`;
}

// 旧版链接须同时带年月日时分五项才认（外部链接偶带 y、m 之类的参数不误判）
const isLegacy = q => !q.has(SHARE_KEY) && ['y', 'm', 'd', 'h', 'i'].every(k => q.has(k));
/** 地址栏是否带有分享参数（新版 bz，或旧版带齐年月日时分；只带个别同名外部参数不误判） */
export const hasShareParams = (search = location.search) => { const q = new URLSearchParams(search); return q.has(SHARE_KEY) || isLegacy(q); };
/** 去掉分享参数后剩余的查询串（保留 utm 等其他参数），含前导 “?”，无剩余时为空串 */
export function withoutShareParams(search = location.search) {
  const q = new URLSearchParams(search);
  if (isLegacy(q)) Object.keys(URL_KEYS).forEach(k => q.delete(k)); // 旧版链接：单字母参数都属于分享
  else q.delete(SHARE_KEY);                                          // 新版：只删 bz，其他参数（哪怕叫 t、s）原样保留
  const rest = q.toString();
  return rest ? `?${rest}` : '';
}

/** 取出各字段的原始字符串；格式不完整（如链接被截断）返回 null。区县可为空 */
function shareFields(q) {
  if (q.has(SHARE_KEY)) {
    const parts = (q.get(SHARE_KEY) || '').split(SEP);
    const keys = Object.keys(URL_KEYS);
    return parts.length === keys.length ? Object.fromEntries(keys.map((k, i) => [k, parts[i]])) : null;
  }
  if (!isLegacy(q) || Object.entries(URL_KEYS).some(([short, key]) => key !== 'district' && !q.has(short))) return null;
  return Object.fromEntries(Object.keys(URL_KEYS).map(k => [k, q.get(k) || '']));
}

/** 从地址栏参数还原输入；除区县外任一字段缺失或无效都返回 null */
export function inputFromUrl(search = location.search) {
  const fields = shareFields(new URLSearchParams(search));
  if (!fields) return null;
  const input = { district: '' }; // 区县可缺省，由 normalizeInput 取该市第一个
  for (const [short, key] of Object.entries(URL_KEYS)) {
    const v = fields[short].trim();
    if (key === 'district') {
      if (v.length > 20) return null; // 与省、市同样限制长度
      input.district = v;
      continue;
    }
    if (v === '') return null; // 其余空参数视为无效链接，不当作 0
    if (key === 'useTrueSolarTime') {
      if (v !== '0' && v !== '1') return null; // 只接受 0 / 1
      input[key] = v === '1';
    }
    else if (key === 'gender') {
      if (v !== 'm' && v !== 'f') return null; // 只接受 m / f
      input[key] = v === 'f' ? 'female' : 'male';
    } else if (key === 'province' || key === 'city') {
      if (v.length > 20) return null; // 地名不会这么长：视为损坏链接
      input[key] = v;
    }
    else {
      if (!/^\d+$/.test(v)) return null; // 只接受十进制整数（拒绝 0x7C9、1e0、4.0 等写法）
      input[key] = Number(v);
    }
  }
  // 省、市可为已不在列表的旧地名（与档案一致：表单标注“已不在列表”，真太阳时按经度表或不校正），保证本地能排的盘分享出去也能打开
  return isValidBirth(input) ? normalizeInput(input) : null; // 区县缺失时由 normalizeInput 取该市第一个；不在列表的旧区县名保留
}
