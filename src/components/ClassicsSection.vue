<template>
  <section class="section" id="dianji">
    <header class="sec-head">
      <span class="sec-no">肆</span>
      <div>
        <h2 class="sec-title">典籍</h2>
        <p class="sec-en">THE CLASSICS</p>
      </div>
      <p class="sec-desc">命理三大经典，原文在线研读。正文术语可点开释义，自动记住读到哪一章。</p>
    </header>

    <div class="books">
      <article v-for="b in books" :key="b.id" class="book">
        <div class="book-spine" aria-hidden="true"><span>{{ b.title }}</span></div>
        <div class="book-body">
          <p class="book-level">{{ b.level }}</p>
          <h3 class="book-title">{{ b.title }}</h3>
          <p class="book-author">{{ b.dynasty }} · {{ b.author }}</p>
          <p class="book-intro">{{ b.intro }}</p>
          <div class="book-foot">
            <span class="book-count">{{ b.chapters.length }} 章</span>
            <button type="button" class="book-read" @click="open(b)">
              {{ progress[b.id] != null ? `续读 · ${b.chapters[progress[b.id]].title}` : '开卷' }}
            </button>
          </div>
        </div>
      </article>
    </div>

    <div class="about">
      <blockquote class="about-quote">命由天定<br>运由己造</blockquote>
      <div class="prose">
        <p>以上三部均为清代及以前的公有领域古籍。现代学者的入门著作与白话评注仍受版权保护，本站不收录全文，建议购买正版阅读。</p>
        <p>初学者可按 <b>子平真诠 → 穷通宝鉴 → 滴天髓</b> 的顺序阅读：先立格局用神之法，再识调候，最后体会五行气势之精微。</p>
        <p>读古籍之前，不妨先学完“入门”栏目的八节课。知命而不困于命，方为正道。</p>
      </div>
    </div>
  </section>
</template>

<script>
import index from '../content/books/index.json';
import { openReader } from '../composables/ui.js';
import { progressOf } from '../composables/progress.js';

export default {
  name: 'ClassicsSection',
  data: () => ({ books: index }),
  computed: {
    // 阅读器翻章时实时更新
    progress() { return Object.fromEntries(this.books.map(b => [b.id, progressOf(b.id, b.chapters.length)])); }
  },
  methods: {
    open(b) { openReader('book', b.id); }
  }
};
</script>
