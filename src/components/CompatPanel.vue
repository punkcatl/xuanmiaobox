<template>
    <section class="section" id="hepan">
    <header class="sec-head">
      <span class="sec-no">贰</span>
      <div>
        <h2 class="sec-title">八字合盘</h2>
        <p class="sec-en">COMPATIBILITY</p>
      </div>
      <p class="sec-desc">两命相参，察五行互补与干支冲合，以观缘分之深浅。</p>
    </header>

    <form class="panel form" @submit.prevent="calculateCompat">
      <div class="duo">
        <fieldset class="fs" v-for="(party, key) in PARTIES" :key="key">
          <legend>{{ party }}</legend>
          <BirthFields :f="store.form2[key]" compact />
        </fieldset>
      </div>
      <div class="form-foot">
        <label class="toggle">
          <input type="checkbox" v-model="store.form2.useTrueSolarTime">
          <span class="toggle-track"><span class="toggle-dot"></span></span>
          真太阳时校正
        </label>
        <p v-if="store.compatError" class="form-error" role="alert">{{ store.compatError }}</p>
        <button type="submit" class="btn btn-primary">合 盘</button>
      </div>
    </form>

    <transition name="rise">
      <div v-if="store.compat" class="result" id="hepan-result">
        <div class="block">
          <div class="match">
            <div class="match-side" v-for="(side, key) in PARTIES" :key="key">
              <h4 class="match-name">{{ side }}</h4>
              <div class="mini-pillars">
                <div class="mini-pillar" v-for="(p, i) in store.compat[key].bazi" :key="i">
                  <span class="mini-label">{{ p.label.charAt(0) }}</span>
                  <span class="mini-han" :class="'wx-' + wxKey(p.wuXing.tianGan)">{{ p.value.charAt(0) }}</span>
                  <span class="mini-han" :class="'wx-' + wxKey(p.wuXing.diZhi)">{{ p.value.charAt(1) }}</span>
                </div>
              </div>
            </div>
            <div class="score">
              <svg viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" class="score-track"/>
                <circle cx="60" cy="60" r="52" class="score-arc" :style="{ strokeDashoffset: 326.7 * (1 - store.compat.score / 100) }"/>
              </svg>
              <div class="score-num"><b class="num">{{ store.compat.score }}</b><span>契合度</span></div>
            </div>
          </div>
          <ul class="factors">
            <li v-for="(f, i) in store.compat.factors" :key="i" :class="f.delta > 0 ? 'up' : 'down'">
              <b class="num">{{ f.delta > 0 ? '+' : '−' }}{{ Math.abs(f.delta) }}</b><span>{{ f.label }}</span><small>{{ f.text }}</small>
            </li>
            <li v-if="!store.compat.factors.length" class="flat"><b class="num">±0</b><span>无明显合冲</span><small>两人命局之间没有明显的合冲与互补，以基础分 60 计。</small></li>
          </ul>
          <p class="factors-note">以 60 分为基础，按上述因素加减，范围 30–98，仅供参考。</p>
          <ul v-if="compatNotes.length" class="notes">
            <li v-for="(n, i) in compatNotes" :key="i">{{ n }}</li>
          </ul>
        </div>
        <div class="block">
          <h3 class="block-title"><span>合盘解读</span><em>READING</em></h3>
          <dl class="reading">
            <template v-for="(item, i) in store.compat.reading" :key="i">
              <dt>{{ item.k }}</dt>
              <dd><TermText :text="item.v" /></dd>
            </template>
          </dl>
        </div>
      </div>
    </transition>
  </section>
</template>

<script>
// 八字合盘：表单 + 可解释的结果
import TermText from './TermText.vue';
import BirthFields from './BirthFields.vue';
import { store, calculateCompat } from '../composables/store.js';
import { wxKey } from '../engine/constants.js';
import { scrollToId } from '../composables/ui.js';

const PARTIES = Object.freeze({ party1: '甲方', party2: '乙方' });

export default {
  name: 'CompatPanel',
  components: { TermText, BirthFields },
  setup: () => ({ store, PARTIES, calculateCompat }),
  computed: {
    compatNotes() {
      const r = store.compat;
      if (!r) return [];
      return [...r.party1.notes.map(n => `甲方：${n}`), ...r.party2.notes.map(n => `乙方：${n}`)];
    }
  },
  watch: {
    'store.compat'(v) {
      if (v) this.$nextTick(() => scrollToId('hepan-result'));
    }
  },
  methods: {
    wxKey
  }
};
</script>
