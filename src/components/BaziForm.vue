<template>
  <div>
    <div v-if="store.archive.length" class="archive">
      <span class="archive-k">命盘档案</span>
      <div class="archive-list">
        <span v-for="e in store.archive" :key="e.id" class="arc" :class="{ me: e.id === store.meId }">
          <button type="button" class="arc-main" @click="load(e)">
            <b>{{ e.name }}</b><small v-if="e.tag">{{ e.tag }}</small><i v-if="e.id === store.meId">我</i>
          </button>
          <button type="button" class="arc-more" :aria-label="'管理 ' + e.name" @click="menu = menu === e.id ? null : e.id">⋯</button>
          <span v-if="menu === e.id" class="arc-menu">
            <button type="button" @click="makeMe(e)">设为我的命盘</button>
            <button type="button" class="danger" @click="remove(e)">删除</button>
          </span>
        </span>
      </div>
    </div>

    <form class="panel form" @submit.prevent="submit">
      <BirthFields :f="f" />
      <div class="form-foot">
        <div class="seg" role="radiogroup" aria-label="性别">
          <label :class="{ on: f.gender === 'male' }"><input type="radio" value="male" v-model="f.gender">乾 · 男</label>
          <label :class="{ on: f.gender === 'female' }"><input type="radio" value="female" v-model="f.gender">坤 · 女</label>
        </div>
        <label class="toggle">
          <input type="checkbox" v-model="f.useTrueSolarTime">
          <span class="toggle-track"><span class="toggle-dot"></span></span>
          真太阳时校正
        </label>
        <p v-if="store.chartError" class="form-error" role="alert">{{ store.chartError }}</p>
        <button type="submit" class="btn btn-primary">排 盘</button>
      </div>
    </form>
  </div>
</template>

<script>
import BirthFields from './BirthFields.vue';
import { store, calculateChart, loadEntry, removeFromArchive, setMe, placeKnown, STORAGE_FAIL_MSG } from '../composables/store.js';
import { showToast } from '../composables/ui.js';

export default {
  name: 'BaziForm',
  components: { BirthFields },
  setup: () => ({ store }),
  data: () => ({ menu: null }),
  mounted() {
    // 点菜单以外的地方或按 Esc 关闭“⋯”菜单
    this.onDocClick = e => { if (this.menu && !e.target.closest('.arc')) this.menu = null; };
    this.onKey = e => { if (e.key === 'Escape') this.menu = null; };
    document.addEventListener('click', this.onDocClick);
    document.addEventListener('keydown', this.onKey);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.onDocClick);
    document.removeEventListener('keydown', this.onKey);
  },
  computed: {
    f() { return store.form; }
  },
  methods: {
    submit() { calculateChart(); },
    load(e) {
      this.menu = null;
      const r = loadEntry(e) ? store.result : null;
      if (!placeKnown(e.input)) {
        // 是否校正以引擎实际结果为准（经度表与下拉列表是两份数据）
        const skipped = r && e.input.useTrueSolarTime && !r.trueSolarApplied;
        showToast(`“${e.name}”的出生地已不在地区列表中${skipped ? '，未做真太阳时校正' : ''}`);
      }
    },
    makeMe(e) {
      this.menu = null;
      if (setMe(e.id)) showToast(`已将“${e.name}”设为我的命盘`);
      else if (!store.archive.some(x => x.id === e.id)) showToast(`“${e.name}”已在其他页面删除`); // setMe 同步后发现条目已不在
      else showToast(STORAGE_FAIL_MSG);
    },
    remove(e) {
      const tip = e.id === store.meId ? `删除“${e.name}”？它是“我的命盘”，删除后每日运签将不再显示。` : `删除“${e.name}”？`;
      if (!window.confirm(tip)) return;
      const ok = removeFromArchive(e.id);
      this.menu = null;
      showToast(ok ? `已删除：${e.name}` : STORAGE_FAIL_MSG);
    }
  }
};
</script>
