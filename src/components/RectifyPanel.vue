<template>
  <details class="basis rectify no-print" @toggle="open = $event.target.open">
    <summary>不确定出生时辰？<small>答几道过去的事，帮你比对前后相邻的时辰</small></summary>
    <div v-if="open" class="rectify-body">
      <p class="rectify-intro">
        按所填时间，候选时辰为：
        <span v-for="(c, i) in cands" :key="c.label" class="rectify-cand" :class="{ cur: c.offset === 0, lead: result.best === i }">{{ c.label }}<em v-if="c.offset === 0">当前</em></span>
      </p>
      <p v-if="!questions.length" class="rectify-intro">这几个时辰的命盘差别很小，暂时出不了能区分它们的题目。</p>
      <ol v-else class="rectify-qs">
        <li v-for="q in questions" :key="q.id">
          <span class="rectify-q">{{ q.text }}</span>
          <span class="rectify-opts" role="radiogroup" :aria-label="q.text">
            <button v-for="(lab, val) in OPTS" :key="val" type="button" role="radio" class="ai-topic" :class="{ on: answers[q.id] === val }" :aria-checked="answers[q.id] === val" @click="answers[q.id] = val">{{ lab }}</button>
          </span>
        </li>
      </ol>
      <div v-if="questions.length" class="rectify-result" aria-live="polite">
        <template v-if="result.best != null">
          <p>
            比对结果：<b>{{ cands[result.best].label }}</b> 最吻合
            <small>（得分 {{ cands.map((c, i) => c.label.slice(0, 2) + ' ' + result.scores[i]).join(' · ') }}）</small>
          </p>
          <button v-if="cands[result.best].offset !== 0" type="button" class="btn btn-ghost sm" @click="apply(cands[result.best])">按{{ cands[result.best].label.slice(0, 2) }}重新排盘</button>
          <p v-else class="rectify-note">与当前排盘的时辰一致，无需调整。</p>
        </template>
        <p v-else class="rectify-note">{{ answeredAny ? '目前几个时辰得分相同，多回答几题再看。' : '回答上面的问题后显示比对结果。' }}</p>
        <p class="rectify-note">以事定时是民间做法，仅供参考；能查到出生证明或家人记录的准确时间最好。</p>
      </div>
    </div>
  </details>
</template>

<script>
// 定时辰：候选时辰 + 是非题比对（引擎本地计算，不调用 AI）
import { candidates, rectifyQuestions, scoreCandidates } from '../engine/rectify.js';
import { store, calculateChart } from '../composables/store.js';

export default {
  name: 'RectifyPanel',
  props: {
    r: { type: Object, required: true },
    currentYear: { type: Number, required: true }
  },
  data: () => ({ open: false, answers: {}, OPTS: { yes: '是', no: '否', unsure: '不确定' } }),
  computed: {
    // 展开时才排候选盘（三次排盘）
    cands() { return this.open ? candidates(this.r.input) : []; },
    questions() { return this.cands.length > 1 ? rectifyQuestions(this.cands, this.currentYear) : []; },
    result() { return scoreCandidates(this.cands, this.questions, this.answers); },
    answeredAny() { return Object.values(this.answers).some(a => a === 'yes' || a === 'no'); }
  },
  watch: {
    r() { this.answers = {}; }
  },
  methods: {
    apply(c) {
      // 当前命盘可能来自档案或分享链接：表单整体换成候选盘的出生信息，再按表单重排
      Object.assign(store.form, c.input);
      calculateChart(store.form);
    }
  }
};
</script>
