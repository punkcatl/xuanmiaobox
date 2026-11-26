<template>
  <div class="result" id="paipan-result">
    <!-- 命盘 -->
    <div class="block">
      <h3 class="block-title"><span>命盘</span><em>CHART</em><button type="button" class="tour-open no-print" @click="$emit('tour')">看懂我的盘</button></h3>
      <ChartTable :pillars="r.bazi" :relations="r.relations" :gender="r.input.gender" />
      <ul v-if="r.notes.length" class="notes">
        <li v-for="(n, i) in r.notes" :key="i">{{ n }}</li>
      </ul>
      <RectifyPanel :r="r" :current-year="currentYear" />
      <div class="wuxing" data-tour="wuxing">
        <div class="wx-row" v-for="w in wuXingList" :key="w.name" :class="'wx-' + w.key">
          <span class="wx-name">{{ w.name }}</span>
          <span class="wx-bar"><i :style="{ width: w.pct + '%' }"></i></span>
          <span class="wx-count num">{{ w.count }}</span>
        </div>
      </div>

      <div class="actions no-print">
        <button type="button" class="act" @click="toggleSave">{{ saveLabel }}</button>
        <button type="button" class="act" @click="copyLink">复制分享链接</button>
        <button type="button" class="act" :disabled="drawing" @click="makeCard">{{ drawing ? '绘制中…' : '生成分享卡片' }}</button>
        <button type="button" class="act" @click="print">打印 / 存为 PDF</button>
        <button type="button" class="act" @click="copyPrompt">复制解读提示词</button>
      </div>
      <form v-if="saving" class="save-form no-print" @submit.prevent="save">
        <label class="field"><span>称呼</span><input v-model.trim="saveName" maxlength="20" placeholder="如：我、妈妈、小王" required></label>
        <label class="field"><span>标签</span>
          <select v-model="saveTag"><option value="">无</option><option v-for="t in TAGS" :key="t" :value="t">{{ t }}</option></select>
        </label>
        <label class="check"><input type="checkbox" v-model="saveAsMe"> 设为“我的命盘”（用于每日运签）</label>
        <button type="submit" class="btn btn-ghost sm">保存</button>
      </form>
    </div>

    <!-- 解读 -->
    <div class="block">
      <h3 class="block-title"><span>解读</span><em>READING</em></h3>
      <dl class="reading" data-tour="reading">
        <template v-for="(item, i) in r.reading" :key="i">
          <dt>{{ item.k }}</dt>
          <dd><TermText :text="item.v" /></dd>
        </template>
        <dt>调候</dt>
        <dd>
          <TermText :text="r.tiaohou.hint" />
          <button type="button" class="link-btn no-print" @click="openQiongtong">查阅《穷通宝鉴》· {{ r.tiaohou.label }} →</button>
        </dd>
      </dl>
      <details class="basis">
        <summary>解盘依据<small>展开查看旺衰与喜用是怎么推出来的</small></summary>
        <ol>
          <li v-for="(s, i) in r.balance.steps" :key="i"><TermText :text="s" /></li>
          <li><TermText :text="r.geju.basis" /></li>
        </ol>
      </details>
    </div>

    <!-- AI 深度解读（Claude） -->
    <AiReading :r="r" />

    <!-- 问先生：多轮对话，开场先断过去 -->
    <AiChat :r="r" />

    <!-- 运程 -->
    <div class="block">
      <h3 class="block-title"><span>运程</span><em>FORTUNE</em></h3>
      <FortunePanel :values="r.values" :dayun="r.大运" :yun-start="r.yunStart" :current-year="currentYear" :birth-year="r.birthYear" :balance="r.balance" />
    </div>
  </div>
</template>

<script>
import ChartTable from './ChartTable.vue';
import FortunePanel from './FortunePanel.vue';
import AiReading from './AiReading.vue';
import AiChat from './AiChat.vue';
import RectifyPanel from './RectifyPanel.vue';
import TermText from './TermText.vue';
import { WX_ORDER, wxKey } from '../engine/constants.js';
import { openReader, showToast } from '../composables/ui.js';
import { store, saveChart, shareUrl, archivedEntryOf, STORAGE_FAIL_MSG } from '../composables/store.js';
import { buildAiPrompt } from '../utils/aiPrompt.js';

const TAGS = ['自己', '家人', '伴侣', '朋友', '同事', '名人'];

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    // 非安全上下文的降级方案
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      return document.execCommand('copy');
    } catch (err) {
      return false;
    } finally {
      ta.remove();
    }
  }
}

export default {
  name: 'ChartResult',
  components: { ChartTable, FortunePanel, TermText, AiReading, AiChat, RectifyPanel },
  props: {
    r: { type: Object, required: true },
    currentYear: { type: Number, required: true }
  },
  emits: ['tour'],
  setup: () => ({ TAGS }),
  data: () => ({ saving: false, saveName: '', saveTag: '', saveAsMe: false, drawing: false }),
  computed: {
    savedEntry() { return archivedEntryOf(this.r.input); },
    // 条目只在内存中（写入存储失败）时如实说明，刷新后会消失
    saveLabel() { return !this.savedEntry ? '存入档案' : store.unsavedIds.includes(this.savedEntry.id) ? '已存入（仅本次访问）' : '已存入档案'; },
    wuXingList() {
      const stats = this.r.wuXing;
      const max = Math.max(4, ...Object.values(stats));
      return WX_ORDER.map(name => ({ name, key: wxKey(name), count: stats[name], pct: (stats[name] / max) * 100 }));
    }
  },
  watch: {
    r() { this.saving = false; this.resetSaveForm(); }
  },
  // 卸载时若打印结束事件仍未触发（部分移动端），恢复折叠状态并移除监听，避免泄漏
  beforeUnmount() { if (this.printRestore) this.printRestore(); },
  methods: {
    resetSaveForm() {
      const e = this.savedEntry;
      this.saveName = e ? e.name : '';
      this.saveTag = e ? e.tag : '';
      // 尚未设定“我的命盘”且是自己提交的盘时默认勾选（分享链接 / 档案里可能是别人的盘）
      this.saveAsMe = e ? e.id === store.meId : !store.meId && store.resultSource === 'form';
    },
    toggleSave() {
      if (!this.saving) this.resetSaveForm(); // 已存过则预填原称呼与标签，避免误清
      this.saving = !this.saving;
    },
    save() {
      // 取消勾选即取消“我的命盘”
      const saved = saveChart({ name: this.saveName, tag: this.saveTag, asMe: this.saveAsMe });
      if (!saved) return;
      this.saving = false;
      showToast(saved.ok ? `已存入档案：${saved.entry.name}` : STORAGE_FAIL_MSG);
    },
    /** 复制文本；剪贴板不可用时弹出对话框供手动复制 */
    async copyOrPrompt(text, okMsg, what) {
      if (await copyText(text)) showToast(okMsg);
      else window.prompt(`无法自动复制，请手动复制以下${what}：`, text);
    },
    // 地址栏不含分享参数，复制失败时不能让用户去复制地址栏
    copyLink() { return this.copyOrPrompt(shareUrl(this.r.input), '分享链接已复制', '链接'); },
    copyPrompt() { return this.copyOrPrompt(buildAiPrompt(this.r), '提示词已复制，可粘贴到任意 AI 助手', '提示词'); },
    async makeCard() {
      this.drawing = true;
      try {
        const { drawShareCard } = await import('../utils/shareCard.js'); // 点击时才加载，不进首屏包
        const blob = await drawShareCard(this.r, this.savedEntry ? this.savedEntry.name : '');
        const name = `玄喵盒子-${this.r.values.join('')}.png`;
        const file = new File([blob], name, { type: 'image/png' });
        // 触屏设备尝试调起系统分享（便于发到聊天软件），桌面直接下载。
        // 绘制耗时较长时浏览器可能判定点击已失效而拒绝分享（如 iOS Safari）：取消或失败都回落到下载，卡片不丢
        const touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        if (touch && navigator.canShare && navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file], title: '玄喵盒子' }); return; } catch (e) {
            if (e.name === 'AbortError') { showToast('已取消分享，可再次点击生成'); return; } // 用户主动取消：不擅自下载
            // 其他失败（如点击已失效 NotAllowedError）：回落到下载
          }
        }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        // 部分浏览器要求链接在文档中才会触发下载
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 60000); // 留足时间给浏览器预览 / 下载
        showToast('分享卡片已生成');
      } catch (e) {
        console.error(e);
        showToast('生成失败，请重试');
      } finally {
        this.drawing = false;
      }
    },
    print() {
      // 收起的 <details> 内容无法用 CSS 强制显示：打印前展开，打印后恢复。
      // 上次打印后两个结束事件都没触发（部分移动端）时，先按上次记录恢复，再重新记录
      if (this.printRestore) this.printRestore();
      const els = [...document.querySelectorAll('details.basis')];
      const was = els.map(d => d.open);
      const mq = window.matchMedia('print');
      const onChange = e => { if (!e.matches) done(); };
      const done = () => {
        els.forEach((d, k) => { d.open = was[k]; });
        this.printRestore = null;
        window.removeEventListener('afterprint', done);
        if (mq.removeEventListener) mq.removeEventListener('change', onChange); else mq.removeListener(onChange);
      };
      this.printRestore = done;
      // afterprint 为主；部分移动端不触发，以打印媒体查询结束作为后备（不用 focus：移动端可能在截图前就触发）
      window.addEventListener('afterprint', done);
      if (mq.addEventListener) mq.addEventListener('change', onChange); else mq.addListener(onChange); // 旧版 Safari
      els.forEach(d => { d.open = true; });
      window.print();
    },
    openQiongtong() {
      const t = this.r.tiaohou;
      openReader('book', 'qiongtong', t.chapter, t.anchors);
    }
  }
};
</script>
