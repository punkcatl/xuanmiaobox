// 与本站 AI 服务（server/ai-server.mjs）通信：POST JSON，SSE 流式接收（event: delta / done / error）
import { storage } from './storage.js';

const CODE_KEY = 'xm-ai-code'; // 站长设置的访问口令，输入一次后记在本机

export const getCode = () => storage.get(CODE_KEY) || '';
export const setCode = code => storage.set(CODE_KEY, code || '');

/** 服务端要求口令（未带或错误）时抛出，界面据此显示口令框 */
export class NeedCodeError extends Error {}

/**
 * @param {string} path 如 'api/reading'
 * @param {object} body 请求体（自动附上已记住的口令）
 * @param {{ signal: AbortSignal, onDelta: (text: string) => void }} opts
 * @returns {Promise<{ truncated: boolean }>}
 */
export async function postStream(path, body, { signal, onDelta }) {
  const code = getCode();
  let res;
  try {
    res = await fetch(`${import.meta.env.BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(code ? { ...body, code } : body),
      signal
    });
  } catch (e) {
    if (signal.aborted) throw e;
    throw new Error('网络连接失败，请检查网络后重试');
  }
  if (!res.ok || !res.body) {
    let msg = res.status === 404 ? 'AI 解读服务尚未部署' : 'AI 解读暂时不可用，请稍后再试';
    let j = null;
    try { j = await res.json(); } catch (e) { /* 非 JSON（如静态托管返回的页面） */ }
    if (j && j.error) msg = j.error;
    if (res.status === 401 && j && j.needCode) { setCode(''); throw new NeedCodeError(msg); }
    throw new Error(msg);
  }
  return readStream(res.body, signal, onDelta);
}

async function readStream(body, signal, onDelta) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let cut;
    while ((cut = buf.indexOf('\n\n')) >= 0) {
      const raw = buf.slice(0, cut);
      buf = buf.slice(cut + 2);
      const event = (raw.match(/^event: (.+)$/m) || [])[1];
      const dataLine = (raw.match(/^data: (.*)$/m) || [])[1];
      if (!event || dataLine == null || signal.aborted) continue;
      let data;
      try { data = JSON.parse(dataLine); } catch (e) { continue; }
      if (event === 'delta') onDelta(data.text);
      else if (event === 'done') return { truncated: !!data.truncated };
      else if (event === 'error') throw new Error(data.error);
    }
  }
  if (signal.aborted) return { truncated: false };
  throw new Error('连接中断，内容未完成，请重试');
}
