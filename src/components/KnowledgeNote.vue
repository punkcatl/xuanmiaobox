<template>
  <section class="note" role="button" tabindex="0" title="点击换一则" aria-label="命理便签，按回车换一则"
    @click="manualNext" @keydown.enter.prevent="manualNext" @keydown.space.prevent="manualNext">
    <div class="note-tag">命理<br>便签</div>
    <transition name="fade" mode="out-in">
      <div class="note-body" :key="index">
        <h3 class="note-term">{{ current.term }}</h3>
        <p class="note-text">{{ current.explanation }}</p>
      </div>
    </transition>
    <span class="note-next">换一则 <i>↻</i></span>
  </section>
</template>

<script>
// 命理便签：每 30 秒自动轮换，点击手动切换
import { knowledgeList } from '../data/knowledge.js';

export default {
  name: 'KnowledgeNote',
  data: () => ({ index: 0 }),
  computed: { current() { return knowledgeList[this.index]; } },
  mounted() { this.timer = setInterval(this.tick, 30000); },
  beforeUnmount() { clearInterval(this.timer); },
  methods: {
    // 标签页隐藏时不轮换（与时钟一致，省电）
    tick() { if (!document.hidden) this.next(); },
    next() { this.index = (this.index + 1) % knowledgeList.length; },
    // 手动切换后重新计时，避免刚切换的便签立刻被自动换走
    manualNext() {
      this.next();
      clearInterval(this.timer);
      this.timer = setInterval(this.tick, 30000);
    }
  }
};
</script>
