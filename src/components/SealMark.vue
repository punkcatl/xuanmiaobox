<template>
  <svg class="seal-mark" viewBox="6 3 52 58" aria-hidden="true">
    <template v-if="line">
      <path :d="SEAL" class="seal-line"/>
      <path :d="GLYPH_LINE" class="seal-glyph-line"/>
    </template>
    <template v-else>
      <path :d="SEAL" class="seal-body"/>
      <path :d="SEAL_FRAME" class="seal-frame"/>
      <path :d="GLYPH" class="seal-glyph"/>
    </template>
  </svg>
</template>

<script>
import { SEAL, SEAL_FRAME, GLYPH, GLYPH_LINE } from '../data/seal.js';

export default {
  name: 'SealMark',
  props: { line: { type: Boolean, default: false } },
  setup: () => ({ SEAL, SEAL_FRAME, GLYPH, GLYPH_LINE })
};
</script>
