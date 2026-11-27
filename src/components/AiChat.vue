<template>
  <div id="ai-chat" class="block ai-chat no-print">
    <h3 class="block-title"><span>问先生</span><em>CONSULT</em></h3>
    <p v-if="partner" class="chat-partner">
      合盘对象：<b>{{ partner.name }}</b>（{{ RELATIONS[partner.relation].label }}，{{ partner.input.year }}.{{ partner.input.month }}.{{ partner.input.day }} {{ partner.input.gender === 'female' ? '女' : '男' }}）
      <button v-if="!running" type="button" class="link-btn" @click="setPartner(null)">移除</button>
    </p>
    <p v-if="!messages.length" class="ai-intro">
      <template v-if="partner">先生会结合两人的命盘与合盘要素，先说说你们最契合与最需要留意的地方，之后可以用自己的话追问，如“我们哪年适合结婚”。</template>
      <template v-else>像当面看盘一样：先生会先说几件您过去可能经历过的事，请告诉他准不准；之后可以用自己的话追问，如“明年适合换工作吗”。</template>
      每次回复约需半分钟，内容仅供参考。
    </p>

    <!-- 选择合盘对象 -->
    <form v-if="picking" class="chat-pick" @submit.prevent="confirmPick">
      <label class="field"><span>对象</span>
        <select v-model="pick.source" required>
          <option v-for="o in sources" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </label>
      <label v-if="pickNeedsGender" class="field"><span>对方性别</span>
        <select v-model="pick.gender" required><option value="male">男</option><option value="female">女</option></select>
      </label>
      <label class="field"><span>关系</span>
        <select v-model="pick.relation" required>
          <option v-for="(r, k) in RELATIONS" :key="k" :value="k">{{ r.label }}</option>
        </select>
      </label>
      <button type="submit" class="btn btn-ghost sm">确定</button>
      <button type="button" class="link-btn" @click="picking = false">取消</button>
      <p class="ai-note">可从档案中选人，或用“八字合盘”区填写的出生信息。</p>
    </form>

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
      <template v-if="!messages.length && !running">
        <button type="button" class="btn btn-ghost sm" @click="send(null)">{{ partner ? '请先生合盘' : '请先生看盘' }}</button>
        <button v-if="!partner && !picking" type="button" class="link-btn" @click="openPick">＋ 加入合盘对象</button>
      </template>
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
import { RELATIONS } from '../engine/topics.js';
import { store } from '../composables/store.js';

const BIRTH_KEYS = ['year', 'month', 'day', 'hour', 'minute', 'province', 'city', 'district'];
/** 出生时间地点相同（合盘区的甲乙方没有性别，不比较性别） */
const sameBirth = (a, b) => BIRTH_KEYS.every(k => a[k] === b[k]);

const MAX_TURNS = 10; // 与服务端 CHAT_MAX_TURNS 一致
const MAX_LEN = 300;  // 与服务端 USER_MAX 一致

export default {
  name: 'AiChat',
  props: { r: { type: Object, required: true } },
  data: () => ({
    messages: [], draft: '', running: false, error: '', needCode: false, codeInput: '', pending: undefined, MAX_TURNS, MAX_LEN, RELATIONS,
    picking: false, pick: { source: '', gender: 'male', relation: 'lover' }
  }),
  computed: {
    partner() { return store.chatPartner; },
    /** 可选的合盘对象：档案（排除当前命盘本人）+ 合盘区填写的甲乙双方（需补性别） */
    sources() {
      const d = i => `${i.year}.${i.month}.${i.day} ${String(i.hour).padStart(2, '0')}:${String(i.minute).padStart(2, '0')}`;
      const fromArchive = store.archive
        .filter(e => e.input && !sameBirth(e.input, this.r.input))
        .map(e => ({ value: 'a:' + e.id, label: `档案 · ${e.name}（${d(e.input)}）` }));
      const fromCompat = ['party1', 'party2']
        .filter(k => !sameBirth(store.form2[k], this.r.input))
        .map(k => ({ value: 'c:' + k, label: `合盘区${k === 'party2' ? '乙方' : '甲方'}（${d(store.form2[k])}）` }));
      return [...fromArchive, ...fromCompat];
    },
    pickNeedsGender() { return this.pick.source.startsWith('c:'); },
    userTurns() { return this.messages.filter(m => m.role === 'user').length; },
    full() { return this.userTurns >= MAX_TURNS; },
    // 开场后先给“准 / 不准”，之后给常见问题
    quick() {
      if (this.partner) {
        const first = { lover: '我们适合结婚吗？', spouse: '婚姻里要注意什么？', business: '我们怎么分工比较好？', friend: '我们合得来吗？', family: '我们怎么相处更好？' }[this.partner.relation];
        return [first, '哪几年要多留意？', '对方是个什么样的人？'];
      }
      return this.userTurns === 0
        ? ['说得挺准', '有的准有的不准', '都不太准']
        : ['事业上要注意什么？', '什么时候财运好？', '感情方面怎么样？', '今年要注意什么？'];
    }
  },
  watch: {
    // 换了命盘：清空对话；合盘对象就是新命盘本人时移除
    r(v) {
      this.reset();
      if (this.partner && sameBirth(this.partner.input, v.input)) store.chatPartner = null;
    },
    partner() { this.reset(); }
  },
  beforeUnmount() { this.stop(); },
  methods: {
    paras(t) { return t.split(/\n+/).map(s => s.trim()).filter(Boolean); },
    reset() { this.stop(); this.messages = []; this.draft = ''; this.error = ''; },
    setPartner(p) { store.chatPartner = p; },
    openPick() {
      this.pick = { source: this.sources[0] ? this.sources[0].value : '', gender: 'male', relation: 'lover' };
      this.picking = true;
    },
    confirmPick() {
      const [kind, key] = [this.pick.source.slice(0, 1), this.pick.source.slice(2)];
      let p = null;
      if (kind === 'a') {
        const e = store.archive.find(x => x.id === key);
        if (e) p = { name: e.name, input: { ...e.input } };
      } else if (kind === 'c') {
        p = { name: key === 'party1' ? '合盘区甲方' : '合盘区乙方', input: { ...store.form2[key], useTrueSolarTime: store.form2.useTrueSolarTime, gender: this.pick.gender } };
      }
      if (!p) return;
      this.setPartner({ ...p, relation: this.pick.relation });
      this.picking = false;
    },
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
        const partner = this.partner ? { input: this.partner.input, relation: this.partner.relation } : undefined;
        await postStream('api/chat', { input: this.r.input, messages: history, partner }, { signal: ctrl.signal, onDelta: t => { msg.content += t; } });
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
