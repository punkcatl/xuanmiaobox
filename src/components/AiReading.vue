<template>
  <div class="block ai-reading" :class="{ 'no-print': !text }">
    <h3 class="block-title"><span>AI 深度解读</span><em>CLAUDE OPUS 5.5</em></h3>
    <div class="ai-topics no-print" role="radiogroup" aria-label="问事主题">
      <button v-for="(t, k) in TOPICS" :key="k" type="button" role="radio" class="ai-topic" :class="{ on: topic === k }" :aria-checked="topic === k" :disabled="running" @click="pick(k)">{{ t.label }}</button>
    </div>
    <p v-if="!text && !running && !error" class="ai-intro">
      <template v-if="topic === 'overall'">由 Claude Opus 5.5 结合本命盘的格局、旺衰、喜用与大运，写一篇约一千五百字的完整解读。</template>
      <template v-else>专看「{{ TOPICS[topic].label }}」：{{ TOPICS[topic].focus }}。</template>
      生成约需半分钟到一分钟，内容仅供参考。
    </p>
    <div v-if="text" class="ai-text" aria-live="polite">
      <template v-for="(p, i) in paragraphs" :key="i">
        <h4 v-if="p.head" class="ai-h">{{ p.head }}</h4>
        <p v-else>{{ p.text }}</p>
      </template>
      <span v-if="running" class="ai-caret" aria-hidden="true"></span>
    </div>
    <p v-if="error" class="ai-error" role="alert">{{ error }}</p>
    <form v-if="needCode && !running" class="ai-code no-print" @submit.prevent="submitCode">
      <label for="ai-code-input">访问口令</label>
      <input id="ai-code-input" v-model.trim="codeInput" type="password" autocomplete="off" maxlength="64" placeholder="向站长索取" />
      <button type="submit" class="btn btn-ghost sm" :disabled="!codeInput">确定并解读</button>
    </form>
    <p v-if="truncated" class="ai-note">解读较长，已在上限处截断。</p>
    <div class="ai-actions no-print">
      <button v-if="!running && !needCode" type="button" class="btn btn-ghost sm" @click="start">{{ text || error ? '重新生成' : (topic === 'overall' ? '开始 AI 解读' : `解读${TOPICS[topic].label}`) }}</button>
      <button v-else type="button" class="btn btn-ghost sm" @click="stop">停止生成</button>
      <span v-if="running" class="ai-status">{{ text ? '正在书写…' : '正在研读命盘…' }}</span>
    </div>
  </div>
</template>

<script>
// AI 深度解读：把出生信息与问事主题交给本站的 AI 解读服务（server/ai-server.mjs），服务端排盘并调用 Claude，以 SSE 流式返回
import { TOPICS } from '../engine/topics.js';
import { postStream, setCode, NeedCodeError } from '../utils/aiClient.js';

export default {
  name: 'AiReading',
  props: { r: { type: Object, required: true } },
  data: () => ({ text: '', running: false, error: '', truncated: false, topic: 'overall', TOPICS, needCode: false, codeInput: '' }),
  computed: {
    // “【标题】”单独成行作小标题，其余按空行 / 换行分段
    paragraphs() {
      return this.text.split(/\n+/).map(s => s.trim()).filter(Boolean).map(s => {
        const m = s.match(/^【(.+?)】\s*(.*)$/);
        return m ? [{ head: m[1] }, ...(m[2] ? [{ text: m[2] }] : [])] : [{ text: s }];
      }).flat();
    }
  },
  watch: {
    // 换了命盘：中止进行中的生成并清空
    r() { this.stop(); this.text = ''; this.error = ''; this.truncated = false; }
  },
  beforeUnmount() { this.stop(); },
  methods: {
    submitCode() {
      if (!this.codeInput) return;
      setCode(this.codeInput);
      this.needCode = false;
      this.start();
    },
    /** 换主题：清空上一主题的结果（不自动生成，避免误触消耗次数） */
    pick(k) {
      if (this.running || k === this.topic) return;
      this.topic = k; this.text = ''; this.error = ''; this.truncated = false;
    },
    async start() {
      this.stop();
      this.text = ''; this.error = ''; this.truncated = false;
      this.running = true;
      const ctrl = new AbortController();
      this.ctrl = ctrl;
      try {
        const { truncated } = await postStream('api/reading', { input: this.r.input, topic: this.topic }, {
          signal: ctrl.signal,
          onDelta: t => { this.text += t; }
        });
        this.truncated = truncated;
      } catch (e) {
        if (ctrl.signal.aborted) return;
        if (e instanceof NeedCodeError) { this.needCode = true; this.codeInput = ''; }
        this.error = e.message;
      } finally {
        if (this.ctrl === ctrl) { this.running = false; this.ctrl = null; }
      }
    },
    stop() {
      if (this.ctrl) { this.ctrl.abort(); this.ctrl = null; }
      this.running = false;
    }
  }
};
</script>
