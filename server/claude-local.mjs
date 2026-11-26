// 本地调用：通过本机已登录配置好的 Claude Code（`claude -p`）生成解读。
// 凭据完全沿用本机 Claude Code 的配置（环境变量或 ~/.claude/settings.json 的 env），
// 项目代码与仓库中不出现任何 token；子进程以精简模式运行：
//   --bare        不加载 CLAUDE.md、hooks、插件、记忆
//   --tools ""    不提供任何工具（不能读写文件、执行命令、联网）
//   空临时目录作工作目录，不保存会话
import { spawn } from 'node:child_process';
import { readFileSync, mkdtempSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

const CLAUDE_BIN = process.env.CLAUDE_BIN || 'claude';
const TIMEOUT_MS = 240_000;

// 父进程若本身运行在 Claude Code 会话里，这些会话级变量不能传给子进程
const SESSION_VAR = /^(CLAUDECODE|CLAUDE_PID|CLAUDE_CODE_(SESSION|CHILD|MESSAGING|ENTRYPOINT|EXECPATH|SIMPLE))/;

/** 子进程环境：当前环境去掉会话级变量，缺的配置项从 ~/.claude/settings.json 的 env 补上（只在运行时读取，不落盘、不打印） */
export function childEnv(base = process.env, settingsPath = join(homedir(), '.claude', 'settings.json')) {
  const env = {};
  for (const [k, v] of Object.entries(base)) if (!SESSION_VAR.test(k)) env[k] = v;
  try {
    const fromSettings = JSON.parse(readFileSync(settingsPath, 'utf8')).env || {};
    for (const [k, v] of Object.entries(fromSettings)) if (env[k] == null && typeof v === 'string') env[k] = v;
  } catch (e) { /* 没有该文件：完全依赖当前环境变量 */ }
  return env;
}

let workDir = null;
const emptyDir = () => (workDir ||= mkdtempSync(join(tmpdir(), 'xm-ai-')));

/**
 * 流式生成
 * @param {{ model: string, system: string, prompt: string, effort?: string, signal?: AbortSignal, onText: (t: string) => void }} opts
 * @returns {Promise<{ stopReason: string }>} stopReason：end_turn / max_tokens / refusal / error
 */
export function streamLocal({ model, system, prompt, effort = 'medium', signal, onText }) {
  return new Promise((resolve, reject) => {
    const args = ['-p', '--bare', '--model', model, '--tools', '', '--system-prompt', system,
      '--output-format', 'stream-json', '--include-partial-messages', '--verbose',
      '--no-session-persistence', '--strict-mcp-config', '--effort', effort];
    const child = spawn(CLAUDE_BIN, args, { cwd: emptyDir(), env: childEnv(), stdio: ['pipe', 'pipe', 'pipe'] });
    let settled = false;
    let stopReason = null;
    let stderr = '';
    const finish = (fn, v) => { if (settled) return; settled = true; clearTimeout(timer); signal && signal.removeEventListener('abort', onAbort); fn(v); };
    const onAbort = () => { child.kill('SIGTERM'); finish(reject, Object.assign(new Error('aborted'), { aborted: true })); };
    const timer = setTimeout(() => { child.kill('SIGTERM'); finish(reject, new Error('本地 Claude 调用超时')); }, TIMEOUT_MS);
    if (signal) { if (signal.aborted) { onAbort(); return; } signal.addEventListener('abort', onAbort); }

    let buf = '';
    child.stdout.on('data', chunk => {
      buf += chunk.toString('utf8');
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        let o;
        try { o = JSON.parse(line); } catch (e) { continue; }
        if (o.type === 'stream_event' && o.event && o.event.type === 'content_block_delta' && o.event.delta && o.event.delta.type === 'text_delta') {
          onText(o.event.delta.text);
        } else if (o.type === 'result') {
          stopReason = o.is_error ? 'error' : (o.stop_reason || 'end_turn');
        }
      }
    });
    child.stderr.on('data', c => { if (stderr.length < 2000) stderr += c.toString('utf8'); });
    child.on('error', e => finish(reject, new Error(e.code === 'ENOENT' ? `找不到 ${CLAUDE_BIN} 命令，请确认本机已安装 Claude Code` : e.message)));
    child.on('close', code => {
      if (stopReason && stopReason !== 'error') finish(resolve, { stopReason });
      else finish(reject, new Error(`本地 Claude 调用失败（退出码 ${code}）${stderr ? '：' + stderr.slice(0, 300) : ''}`));
    });
    child.stdin.end(prompt);
  });
}
