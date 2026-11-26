<template>
  <svg class="miao-cat" viewBox="0 0 120 120" :class="'wx-' + wxKey" role="img" :aria-label="cat.breed">
    <!-- 天干意象 -->
    <g class="mc-motif">
      <path v-if="gan === '甲'" d="M60 27V6M60 13l-8-6M60 13l8-6M60 20l-10-7M60 20l10-7"/>
      <path v-else-if="gan === '乙'" d="M24 42C10 36 9 18 22 18c9 0 9 12 1 12-5 0-5-6-1-6"/>
      <g v-else-if="gan === '丙'"><circle cx="60" cy="13" r="6"/><path d="M60 1v4M60 21v4M48 13h4M68 13h4M51.5 4.5l3 3M65.5 18.5l3 3M68.5 4.5l-3 3M54.5 18.5l-3 3"/></g>
      <path v-else-if="gan === '丁'" class="fill" d="M60 2c7 8 8 14 0 19-8-5-7-11 0-19z"/>
      <path v-else-if="gan === '戊'" d="M40 24l12-16 7 9 8-12 13 19"/>
      <path v-else-if="gan === '己'" d="M42 9h36M46 16h28M50 23h20M50 9v-4M60 9v-5M70 9v-4"/>
      <path v-else-if="gan === '庚'" d="M104 4L84 30M88 22l9 6M104 4l-3 7"/>
      <g v-else-if="gan === '辛'"><path d="M60 3l9 9-9 12-9-12z"/><path d="M51 12h18M56 12l4 12 4-12"/></g>
      <path v-else-if="gan === '壬'" d="M14 113q8-6 16 0t16 0 16 0 16 0 16 0 16 0"/>
      <g v-else-if="gan === '癸'" class="fill"><path d="M46 6c3 4 4 6 0 9-4-3-3-5 0-9z"/><path d="M60 2c3 4 4 6 0 9-4-3-3-5 0-9z"/><path d="M74 6c3 4 4 6 0 9-4-3-3-5 0-9z"/></g>
    </g>
    <!-- 猫头 -->
    <g transform="translate(14 24) scale(0.77)">
      <path class="mc-head" d="M20 62C19 46 24 30 28.5 20Q30 15 34 18.5L50 34Q60 31 70 34L86 18.5Q90 15 91.5 20C96 30 101 46 100 62C101 88 84 104 60 104C36 104 19 88 20 62Z"/>
      <path class="mc-eye" d="M34 68q9-10 18 0q-9 10-18 0zM68 68q9-10 18 0q-9 10-18 0z"/>
      <path class="mc-pupil" d="M43 61.5q2 6.5 0 13q-2-6.5 0-13zM77 61.5q2 6.5 0 13q-2-6.5 0-13z"/>
      <path class="mc-nose" d="M57 82h6l-3 3.5z"/>
      <path class="mc-whisker" d="M30 82l-16-2M30 88l-16 3M90 82l16-2M90 88l16 3"/>
    </g>
  </svg>
</template>

<script>
import { GAN_WX, wxKey } from '../engine/constants.js';
import { CATS } from '../data/cats.js';


export default {
  name: 'MiaoCat',
  props: { gan: { type: String, required: true } },
  computed: {
    cat() { return CATS[this.gan]; },
    wxKey() { return wxKey(GAN_WX[this.gan]); }
  }
};
</script>
