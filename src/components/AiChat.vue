<template>
  <div class="block ai-chat no-print">
    <h3 class="block-title"><span>问先生</span><em>CONSULT</em></h3>
    <p v-if="!messages.length" class="ai-intro">
      像当面看盘一样：先生会先说几件您过去可能经历过的事，请告诉他准不准；之后可以用自己的话追问，如“明年适合换工作吗”。每次回复约需半分钟，内容仅供参考。
    </p>

    <div v-if="messages.length" class="chat-log" aria-live="polite">
      <div v-for="(m, i) in messages" :key="i" class="chat-msg" :class="m.role">
        <span class="chat-who">{{ m.role === 'assistant' ? '先生' : '我' }}</span>
        <div class="chat-text">
          <p v-for="(p, k) in paras(m.content)" :key="k">{{ p }}</p>
          <span v-if="running && i === messages.length - 1 && m.role === 'assistant'" class="ai-caret" aria-hidden="true"></span>
          <span v-if="running && !m.content && i === messages.length - 1" class="ai-status">先生正在看盘…</span>
        </div>
      </div>
    </div>

    <p v-if="error" class="ai-error" role="alert">{{ error }}</p>
    <form v-if="needCode && !running" class="ai-code" @submit.prevent="submitCode">
      <label for="chat-code-input">访问口令</label>
      <input id="chat-code-input" v-model.trim="codeInput" type="password" autocomplete="off" maxlength="64" placeholder="向站长索取" />
      <button type="submit" class="btn btn-ghost sm" :disabled="!codeInput">确定</button>
    </form>

    <div v-if="!needCode" class="ai-actions">
      <button v-if="!messages.length && !running" type="button" class="btn btn-ghost sm" @click="send(null)">请先生看盘</button>
      <template v-else-if="messages.length">
        <div v-if="!running && !full" class="chat-quick">
          <button v-for="q in quick" :key="q" type="button" class="ai-topic" @click="send(q)">{{ q }}</button>
        </div>
        <form v-if="!full" class="chat-input" @submit.prevent="send(draft)">
          <textarea v-model="draft" :maxlength="MAX_LEN" rows="2" placeholder="用自己的话问先生（Ctrl+Enter 发送）" :disabled="running" @keydown.enter.ctrl.prevent="send(draft)" @keydown.enter.meta.prevent="send(draft)"></textarea>
          <button v-if="!running" type="submit" class="btn btn-ghost sm" :disabled="!draft.trim()">发送</button>
          <button v-else type="button" class="btn btn-ghost sm" @click="stop">停止</button>
        </form>
        <p v-else class="ai-note">本次对话已达 {{ MAX_TURNS }} 问上限，可以重新开始。</p>
        <button v-if="!running" type="button" class="link-btn" @click="reset">重新开始</button>
      </template>
    </div>
  </div>
</template>

<script>
// 问先生：多轮对话。开场由先生“先断过去”（服务端用引擎挑出的验证年份），之后用户自由追问。
// 对话记录只在本页内存中，每次请求整段发给服务端（服务端不保存）
import { postStream, setCode, NeedCodeError } from '../utils/aiClient.js';

const MAX_TURNS = 10; // 与服务端 CHAT_MAX_TURNS 一致
const MAX_LEN = 300;  // 与服务端 USER_MAX 一致

export default {
  name: 'AiChat',
  props: { r: { type: Object, required: true } },
  data: () => ({ messages: [], draft: '', running: false, error: '', needCode: false, codeInput: '', pending: undefined, MAX_TURNS, MAX_LEN }),
  computed: {
    userTurns() { return this.messages.filter(m => m.role === 'user').length; },
    full() { return this.userTurns >= MAX_TURNS; },
    // 开场后先给“准 / 不准”，之后给常见问题
    quick() {
      return this.userTurns === 0
        ? ['说得挺准', '有的准有的不准', '都不太准']
        : ['事业上要注意什么？', '什么时候财运好？', '感情方面怎么样？', '今年要注意什么？'];
    }
  },
  watch: {
    r() { this.reset(); }
  },
  beforeUnmount() { this.stop(); },
  methods: {
    paras(t) { return t.split(/\n+/).map(s => s.trim()).filter(Boolean); },
    reset() { this.stop(); this.messages = []; this.draft = ''; this.error = ''; },
    submitCode() {
      if (!this.codeInput) return;
      setCode(this.codeInput);
      this.needCode = false;
      this.send(this.pending === undefined ? null : this.pending);
    },
    /** text 为 null 表示请先生开场 */
    async send(text) {
      if (this.running || this.full) return;
      const q = text == null ? null : String(text).trim().slice(0, MAX_LEN);
      if (text != null && !q) return;
      this.error = '';
      this.pending = q;
      if (q != null) { this.messages.push({ role: 'user', content: q }); this.draft = ''; }
      const history = this.messages.map(m => ({ role: m.role, content: m.content }));
      const reply = { role: 'assistant', content: '' };
      this.messages.push(reply);
      const msg = this.messages[this.messages.length - 1]; // 取响应式代理，保证流式追加能更新界面
      this.running = true;
      const ctrl = new AbortController();
      this.ctrl = ctrl;
      try {
        await postStream('api/chat', { input: this.r.input, messages: history }, { signal: ctrl.signal, onDelta: t => { msg.content += t; } });
        this.pending = undefined;
      } catch (e) {
        if (ctrl.signal.aborted) return;
        // 失败：撤回这一轮，问题放回输入框便于重试
        this.messages.pop();
        if (q != null) { this.messages.pop(); this.draft = q; }
        if (e instanceof NeedCodeError) { this.needCode = true; this.codeInput = ''; }
        this.error = e.message;
      } finally {
        if (this.ctrl === ctrl) { this.running = false; this.ctrl = null; }
      }
    },
    stop() {
      if (this.ctrl) {
        this.ctrl.abort(); this.ctrl = null;
        // 中途停止：保留已生成的部分；什么都没生成就撤回
        const last = this.messages[this.messages.length - 1];
        if (last && last.role === 'assistant' && !last.content) {
          this.messages.pop();
          const q = this.messages[this.messages.length - 1];
          if (q && q.role === 'user') { this.messages.pop(); this.draft = q.content; } // 保持“先生、我”交替
        }
      }
      this.running = false;
    }
  }
};
</script>
