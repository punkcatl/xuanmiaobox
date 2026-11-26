<template>
  <section class="section" id="rumen">
    <header class="sec-head">
      <span class="sec-no">叁</span>
      <div>
        <h2 class="sec-title">八字入门</h2>
        <p class="sec-en">LEARN THE BASICS</p>
      </div>
      <p class="sec-desc">八节短课，每节几分钟。从阴阳五行到大运流年，零基础读懂自己的命盘。</p>
    </header>
    <ol class="lessons">
      <li v-for="(l, i) in lessons" :key="l.id">
        <button type="button" class="lesson" @click="openReader('lesson', l.id)">
          <span class="lesson-no num">{{ pad(i + 1) }}</span>
          <span class="lesson-title">{{ l.title }}</span>
          <span class="lesson-sub">{{ l.subtitle }}</span>
          <i class="lesson-go" aria-hidden="true">→</i>
        </button>
      </li>
    </ol>
  </section>
</template>

<script>
import { lessons } from '../data/lessons.js';
import { openReader } from '../composables/ui.js';
import { pad } from '../utils/date.js';

export default {
  name: 'LearnSection',
  setup: () => ({ lessons, openReader, pad })
};
</script>
