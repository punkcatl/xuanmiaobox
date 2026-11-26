<template>
  <!-- 紧凑版（合盘）：年月日 / 时分 / 省市区，不含性别 -->
  <div v-if="compact" class="grid g-compact">
    <BirthField v-for="d in COMPACT" :key="d.k" :d="d" :f="f" :options="optionsOf(d)" @change="onChange(d)" />
  </div>
  <!-- 标准版（排盘）：出生时间 / 出生地点 两组 -->
  <template v-else>
    <fieldset class="fs">
      <legend>出生时间</legend>
      <div class="grid g-5">
        <BirthField v-for="d in TIME" :key="d.k" :d="d" :f="f" :options="optionsOf(d)" @change="onChange(d)" />
      </div>
    </fieldset>
    <fieldset class="fs">
      <legend>出生地点</legend>
      <div class="grid g-3">
        <BirthField v-for="d in PLACE" :key="d.k" :d="d" :f="f" :options="optionsOf(d)" @change="onChange(d)" />
      </div>
    </fieldset>
  </template>
</template>

<script>
// 出生信息字段（排盘与合盘共用）：字段定义只有一份，两种布局只是分组不同。
// f 为响应式表单对象，直接双向绑定其字段。
import { h } from 'vue';
import { provinces, citiesOf, districtsOf, onProvinceChange, onCityChange } from '../composables/region.js';
import { YEAR_MIN, YEAR_MAX } from '../utils/validate.js';

const range = (from, to, unit) => Array.from({ length: to - from + 1 }, (_, i) => ({ value: from + i, label: `${from + i} ${unit}` }));
const FIELDS = {
  year: { k: 'year', label: '年', number: true, min: YEAR_MIN, max: YEAR_MAX },
  month: { k: 'month', label: '月', options: range(1, 12, '月') },
  day: { k: 'day', label: '日', number: true, min: 1, max: 31 },
  hour: { k: 'hour', label: '时', options: range(0, 23, '时') },
  minute: { k: 'minute', label: '分', options: range(0, 59, '分') },
  province: { k: 'province', label: '省', place: true },
  city: { k: 'city', label: '市', place: true },
  district: { k: 'district', label: '区', place: true }
};
const TIME = ['year', 'month', 'day', 'hour', 'minute'].map(k => FIELDS[k]);
const PLACE = ['province', 'city', 'district'].map(k => FIELDS[k]);
// 合盘不区分性别（计分与解读不用性别），不显示该字段
const COMPACT = [...TIME, ...PLACE];
const asOptions = list => list.map(v => ({ value: v, label: v }));

// 单个字段：数字输入框或下拉框
const BirthField = {
  props: ['d', 'f', 'options'],
  emits: ['change'],
  setup(props, { emit }) {
    return () => {
      const { d, f } = props;
      const control = d.number
        // 前导零会被规范化（“05”显示为“5”），与 Vue 的 v-model.number 行为一致；清空时为 ''，由 required 拦截
        ? h('input', {
          type: 'number', min: d.min, max: d.max, required: true, value: f[d.k],
          onInput: e => { const v = e.target.valueAsNumber; f[d.k] = Number.isNaN(v) ? '' : v; }
        })
        : h('select', {
          required: props.options.length > 0, value: f[d.k], // 无可选项（如旧地名）时不阻止提交
          onChange: e => {
            const opt = props.options[e.target.selectedIndex];
            f[d.k] = opt ? opt.value : e.target.value;
            emit('change');
          }
        }, props.options.map(o => h('option', { value: o.value, selected: o.value === f[d.k] }, o.label)));
      return h('label', { class: 'field' }, [h('span', d.label), control]);
    };
  }
};

export default {
  name: 'BirthFields',
  components: { BirthField },
  props: {
    f: { type: Object, required: true },
    compact: { type: Boolean, default: false }
  },
  setup: () => ({ TIME, PLACE, COMPACT }),
  methods: {
    optionsOf(d) {
      const list = d.k === 'province' ? provinces : d.k === 'city' ? citiesOf(this.f.province)
        : d.k === 'district' ? districtsOf(this.f.province, this.f.city) : null;
      if (!list) return d.options || [];
      const opts = asOptions(list);
      // 档案中的地名已不在列表（如区划调整）：保留并标注，避免下拉框显示成别的地方
      const v = this.f[d.k];
      if (v && !list.includes(v)) opts.unshift({ value: v, label: `${v}（已不在列表）` });
      return opts;
    },
    onChange(d) {
      if (d.k === 'province') onProvinceChange(this.f);
      if (d.k === 'city') onCityChange(this.f);
    }
  }
};
</script>
