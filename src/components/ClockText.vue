<template><span class="v num">{{ text }}</span></template>

<script>
// 每秒跳动的北京时间：单独成组件，只有它每秒重渲染（时令栏其余部分与黄历面板不受影响）
import { bj } from '../composables/clock.js';
import { pad } from '../utils/date.js';

export default {
  name: 'ClockText',
  computed: {
    text() { const t = bj.value; return `${pad(t.hour)}:${pad(t.minute)}:${pad(t.second)}`; }
  }
};
</script>
