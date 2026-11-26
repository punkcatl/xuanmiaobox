<template>
  <span class="term-text"><template v-for="(part, i) in segments" :key="i"><button
    v-if="part.term" type="button" class="term" @click.stop="openTerm(part.term, $event.currentTarget)">{{ part.text }}</button><template
    v-else>{{ part.text }}</template></template></span>
</template>

<script>
// 把文本中的术语渲染为可点击的释义按钮
import { splitTerms } from '../data/glossary.js';
import { openTerm } from '../composables/ui.js';

export default {
  name: 'TermText',
  props: {
    text: { type: String, default: '' },
    parts: { type: Array, default: null } // 预先切分好的片段（如阅读器整章共享“只标一次”）
  },
  setup: () => ({ openTerm }),
  computed: {
    segments() { return this.parts || splitTerms(this.text); }
  }
};
</script>
