<template>
  <div class="block ai-reading" :class="{ 'no-print': !text }">
    <h3 class="block-title"><span>AI 深度解读</span><em>CLAUDE OPUS 5.5</em></h3>
    <p v-if="!text && !running && !error" class="ai-intro">
      由 Claude Opus 5.5 结合本命盘的格局、旺衰、喜用与大运，写一篇约一千五百字的完整解读。生成约需半分钟到一分钟，内容仅供参考。
    </p>
    <div v-if="text" class="ai-text" aria-live="polite">
      <template v-for="(p, i) in paragraphs" :key="i">
        <h4 v-if="p.head" class="ai-h">{{ p.head }}</h4>
        <p v-else>{{ p.text }}</p>
      </template>
      <span v-if="running" class="ai-caret" aria-hidden="true"></span>
    </div>
    <p v-if="error" class="ai-error" role="alert">{{ error }}</p>
    <p v-if="truncated" class="ai-note">解读较长，已在上限处截断。</p>
    <div class="ai-actions no-print">
      <button v-if="!running" type="button" class="btn btn-ghost sm" @click="start">{{ text || error ? '重新生成' : '开始 AI 解读' }}</button>
      <button v-else type="button" class="btn btn-ghost sm" @click="stop">停止生成</button>
      <span v-if="running" class="ai-status">{{ text ? '正在书写…' : '正在研读命盘…' }}</span>
    </div>
  </div>
</template>

<script>
// AI 深度解读：把出生信息交给本站的 AI 解读服务（server/ai-server.mjs），服务端排盘并调用 Claude，以 SSE 流式返回
export default {
  name: 'AiReading',
  props: { r: { type: Object, required: true } },
  data: () => ({ text: '', running: false, error: '', truncated: false }),
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
    async start() {
      this.stop();
      this.text = ''; this.error = ''; this.truncated = false;
      this.running = true;
      const ctrl = new AbortController();
      this.ctrl = ctrl;
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}api/reading`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: this.r.input }),
          signal: ctrl.signal
        });
        if (!res.ok || !res.body) {
          let msg = res.status === 404 ? 'AI 解读服务尚未部署' : 'AI 解读暂时不可用，请稍后再试';
          try { const j = await res.json(); if (j && j.error) msg = j.error; } catch (e) { /* 非 JSON（如静态托管返回的页面） */ }
          throw new Error(msg);
        }
        await this.readStream(res.body, ctrl);
      } catch (e) {
        if (ctrl.signal.aborted) return;
        this.error = e instanceof TypeError ? '网络连接失败，请检查网络后重试' : e.message;
      } finally {
        if (this.ctrl === ctrl) { this.running = false; this.ctrl = null; }
      }
    },
    /** 解析 SSE：event: delta / done / error，data 为 JSON */
    async readStream(body, ctrl) {
      const reader = body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let finished = false;
      while (!finished) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let cut;
        while ((cut = buf.indexOf('\n\n')) >= 0) {
          const raw = buf.slice(0, cut);
          buf = buf.slice(cut + 2);
          const event = (raw.match(/^event: (.+)$/m) || [])[1];
          const dataLine = (raw.match(/^data: (.*)$/m) || [])[1];
          if (!event || dataLine == null || ctrl.signal.aborted) continue;
          let data;
          try { data = JSON.parse(dataLine); } catch (e) { continue; }
          if (event === 'delta') this.text += data.text;
          else if (event === 'done') { this.truncated = !!data.truncated; finished = true; }
          else if (event === 'error') throw new Error(data.error);
        }
      }
      if (!finished && !ctrl.signal.aborted) throw new Error('连接中断，解读未完成，请重新生成');
    },
    stop() {
      if (this.ctrl) { this.ctrl.abort(); this.ctrl = null; }
      this.running = false;
    }
  }
};
</script>
