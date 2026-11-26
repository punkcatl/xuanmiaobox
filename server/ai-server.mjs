// AI 解读服务：浏览器只提交出生信息，服务端校验、排盘、生成提示词后调用 Claude，以 SSE 流式返回。
// API Key 只存在于服务端环境变量（ANTHROPIC_API_KEY），不会下发到浏览器；
// 也不接受任意提示词，避免被当作通用的 Claude 代理。
//
// 运行：ANTHROPIC_API_KEY=sk-ant-... node server/ai-server.mjs   （默认端口 8787，可用 PORT 指定）
// 开发时 Vite 把 /api 代理到这里（见 vite.config.js）；生产环境请让同源的反向代理把 /api 转发到本服务。
import http from 'node:http';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { computeChart, BaziError } from '../src/engine/index.js';
import { buildAiPrompt } from '../src/utils/aiPrompt.js';
import { isValidBirth, isValidGender } from '../src/utils/validate.js';

const PORT = Number(process.env.PORT) || 8787;
const MODEL = 'claude-opus-5-5';
const MAX_BODY = 4096;          // 出生信息很小，超过即拒绝
const RATE_LIMIT = { windowMs: 10 * 60 * 1000, max: 5 }; // 每个 IP 每 10 分钟最多 5 次

const SYSTEM = [
  '你是精通子平命理的研究者，为“玄喵盒子”网站的用户解读八字命盘。',
  '用户消息中的命盘数据由网站程序排出（四柱、十神、藏干、格局、旺衰、喜用、大运等），以它为准，不要自行重排或质疑排盘结果。',
  '写作要求：',
  '- 用简体中文，面向没有命理基础的读者：术语第一次出现时用一句话解释。',
  '- 依次写：命局概览（格局与旺衰）、性格特点、事业财运、感情婚姻、健康提示、当前大运与近年流年、建议。每部分用“【标题】”单独一行开头，标题后接一两段正文。',
  '- 只输出纯文本，不要使用 Markdown 符号（如 #、*、-、表格）。',
  '- 语气审慎、积极，避免宿命论与绝对化断语；涉及健康时提醒以医生意见为准，涉及重大决定时提醒结合现实情况。',
  '- 全文约 1200–1800 字。'
].join('\n');

// 首次请求时才创建客户端（从环境变量读取凭据）：导入本模块（如单元测试）不需要 API Key
let client = null;
const getClient = () => (client ||= new Anthropic());

// —— 输入校验：与网站的出生信息格式一致 ——
export function parseInput(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const str = v => typeof v === 'string' && v.length > 0 && v.length <= 20;
  const input = {
    year: raw.year, month: raw.month, day: raw.day, hour: raw.hour, minute: raw.minute,
    gender: raw.gender, province: raw.province, city: raw.city,
    district: typeof raw.district === 'string' && raw.district.length <= 20 ? raw.district : '',
    useTrueSolarTime: raw.useTrueSolarTime
  };
  if (!isValidBirth(input) || !isValidGender(input.gender)) return null;
  if (!str(input.province) || !str(input.city) || typeof input.useTrueSolarTime !== 'boolean') return null;
  return input;
}

// —— 简单的内存限流（单实例部署足够；多实例请换成共享存储） ——
const hits = new Map();
function allow(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < RATE_LIMIT.windowMs);
  if (list.length >= RATE_LIMIT.max) { hits.set(ip, list); return false; }
  list.push(now);
  hits.set(ip, list);
  return true;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) { const err = new Error('too large'); err.tooLarge = true; reject(err); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const json = (res, status, obj) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
};
const send = (res, event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

async function handleReading(req, res) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';
  let body;
  try { body = JSON.parse(await readBody(req)); } catch (e) {
    if (e.tooLarge) { res.setHeader('Connection', 'close'); json(res, 413, { error: '请求过大' }); req.destroy(); return; }
    return json(res, 400, { error: '请求格式不正确' });
  }
  const input = parseInput(body && body.input);
  if (!input) return json(res, 400, { error: '出生信息不完整或无效' });

  let chart;
  try { chart = computeChart(input); } catch (e) {
    return json(res, 400, { error: e instanceof BaziError ? e.message : '排盘失败' });
  }
  if (!allow(ip)) return json(res, 429, { error: '请求过于频繁，请稍后再试' });

  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' });
  const abort = new AbortController();
  res.on('close', () => abort.abort()); // 用户停止或关闭页面：同时中止对 Claude 的请求

  try {
    const stream = getClient().beta.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: 'medium' }, // Opus 5.5 默认即 medium；显式写出便于调整
      // 安全分类器拒答时自动改由合适的模型接续（服务端兜底）
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      messages: [{ role: 'user', content: buildAiPrompt(chart) }]
    }, { signal: abort.signal });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') send(res, 'delta', { text: event.delta.text });
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') send(res, 'error', { error: '模型未能完成本次解读，请稍后再试' });
    else send(res, 'done', { truncated: final.stop_reason === 'max_tokens' });
  } catch (e) {
    if (abort.signal.aborted) return; // 客户端已断开
    let msg = 'AI 服务暂时不可用，请稍后再试';
    if (e instanceof Anthropic.RateLimitError) msg = 'AI 服务繁忙，请稍后再试';
    else if (e instanceof Anthropic.AuthenticationError) msg = 'AI 服务未正确配置';
    else if (e instanceof Anthropic.APIError) console.error('Claude API 错误', e.status, e.message);
    else console.error('AI 解读失败', e);
    send(res, 'error', { error: msg });
  }
  res.end();
}

export const server = http.createServer((req, res) => {
  const path = (req.url || '').split('?')[0];
  if (req.method === 'POST' && path === '/api/reading') { handleReading(req, res); return; }
  if (req.method === 'GET' && path === '/api/health') { json(res, 200, { ok: true, model: MODEL }); return; }
  json(res, 404, { error: 'not found' });
});

const isMain = () => { try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch (e) { return false; } };
if (isMain()) {
  server.listen(PORT, () => console.log(`AI 解读服务已启动：http://localhost:${PORT}  模型 ${MODEL}`));
}
