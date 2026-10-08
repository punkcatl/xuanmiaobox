<template>
  <div class="container">
    <div class="hero">
      <div class="hero-stardust"></div>
      <div class="hero-eye">
        <div class="eye-outer">
          <div class="eye-iris">
            <div class="eye-iris-ring"></div>
            <div class="eye-pupil"></div>
            <div class="eye-shine"></div>
          </div>
        </div>
      </div>
      <div class="hero-content">
        <h1 class="hero-title">玄喵盒子</h1>
        <div class="hero-meta">
          <span class="hero-date">{{ solarDate }}</span>
          <span class="hero-sep">·</span>
          <span class="hero-lunar">{{ lunarInfo }}</span>
          <template v-if="solarTerm">
            <span class="hero-sep">·</span>
            <span class="solar-term">{{ solarTerm }}</span>
          </template>
          <span class="hero-sep">·</span>
          <span class="hero-clock">{{ currentTime }}</span>
        </div>
      </div>
    </div>
    
    <div class="card knowledge-card" @click="nextKnowledge">
      <div class="knowledge-header">
        <h2>命理便签</h2>
        <div class="refresh-info">
          <span class="refresh-text">点击刷新</span>
          <span class="refresh-icon">↻</span>
        </div>
      </div>
      <transition name="knowledge-fade" mode="out-in">
        <div class="knowledge-content" :key="currentKnowledgeIndex">
          <h3>{{ currentKnowledge.term }}</h3>
          <p>{{ currentKnowledge.explanation }}</p>
        </div>
      </transition>
    </div>
    
    <div class="card">
      <h2>八字查询</h2>
        <div class="bazi-form">
          <form @submit.prevent="calculateBazi">
            <div class="form-row">
              <div class="form-group">
                <label for="year">年</label>
                <input type="number" id="year" v-model.number="form.year" min="1900" max="2050" required>
              </div>
              <div class="form-group">
                <label for="month">月</label>
                <select id="month" v-model.number="form.month" required>
                  <option v-for="m in 12" :key="m" :value="m">{{ m }}月</option>
                </select>
              </div>
              <div class="form-group">
                <label for="day">日</label>
                <input type="number" id="day" v-model.number="form.day" min="1" max="31" required>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group half">
                <label for="hour">时</label>
                <select id="hour" v-model.number="form.hour" required>
                  <option v-for="h in 24" :key="h-1" :value="h-1">{{ h-1 }}时</option>
                </select>
              </div>
              
              <div class="form-group half">
                <label for="minute">分</label>
                <select id="minute" v-model.number="form.minute" required>
                  <option v-for="m in 60" :key="m" :value="m-1">{{ m-1 }}分</option>
                </select>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="province">省</label>
                <select id="province" v-model="form.province" required @change="updateCities">
                  <option v-for="province in provinces" :key="province" :value="province">{{ province }}</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="city">市</label>
                <select id="city" v-model="form.city" required @change="updateDistricts">
                  <option v-for="city in cities" :key="city" :value="city">{{ city }}</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="district">区</label>
                <select id="district" v-model="form.district" required>
                  <option v-for="district in districts" :key="district" :value="district">{{ district }}</option>
                </select>
              </div>
            </div>
            
            <div class="form-row" style="align-items: flex-end;">
              <div class="form-group checkbox-group">
                <input type="checkbox" id="useTrueSolarTime" v-model="form.useTrueSolarTime">
                <label for="useTrueSolarTime">真太阳时</label>
              </div>
              <div class="form-group">
                <label for="gender">性别</label>
                <select id="gender" v-model="form.gender" required>
                  <option value="male">男</option>
                  <option value="female">女</option>
                </select>
              </div>
            </div>
            
            <button type="submit" class="btn">查询八字</button>
          </form>
        </div>
        
        <div v-if="result" class="bazi-result">
          <div class="result-section result-chart">
            <h3>八字命盘</h3>
            <div class="pillar-array">
              <div class="pillar" v-for="(p, i) in result.bazi" :key="i" :class="'wx-' + p.wuXing.tianGan">
                <div class="pillar-label">{{ p.label }}</div>
                <div class="pillar-body">
                  <div class="pillar-stem">
                    <span class="pillar-han">{{ p.value.charAt(0) }}</span>
                    <span class="pillar-meta">{{ p.wuXing.tianGan.toUpperCase ? wuXingEn[p.wuXing.tianGan] : '' }}</span>
                  </div>
                  <div class="pillar-divider"></div>
                  <div class="pillar-branch">
                    <span class="pillar-han">{{ p.value.charAt(1) }}</span>
                    <span class="pillar-meta">{{ p.wuXing.diZhi.toUpperCase ? wuXingEn[p.wuXing.diZhi] : '' }}</span>
                  </div>
                </div>
                <div class="pillar-glow"></div>
              </div>
            </div>
            <div class="wu-xing-analysis">
              <div class="wu-xing-stats">
                <div class="wu-xing-item" v-for="(count, name) in result.wuXing" :key="name">
                  <span class="wu-xing-label" :class="name">{{ name }}</span>
                  <span class="wu-xing-value">{{ count }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="result-section result-reading">
            <h3>八字解读</h3>
            <div class="analysis">
              <p v-for="(line, i) in result.analysis.split('\n').filter(l => l.trim())" :key="i">{{ line }}</p>
            </div>
          </div>

          <div class="result-section result-forecast">
            <h3>大运流年分析</h3>
            <div class="大运流年分析">
              <div class="大运分析">
                <h4>大运</h4>
                <div class="大运列表">
                  <div class="大运项" v-for="(大运, index) in result.大运" :key="index">
                    <span class="大运年份">{{大运.startYear}}-{{大运.endYear}}岁</span>
                    <span class="大运干支">{{大运.ganZhi}}</span>
                    <span class="大运解读">{{大运.analysis}}</span>
                  </div>
                </div>
              </div>

              <div class="流年分析">
                <h4>流年</h4>
                <div class="流年列表">
                  <div class="流年项" v-for="(流年, index) in result.流年" :key="index">
                    <span class="流年年份">{{流年.year}}年</span>
                    <span class="流年干支">{{流年.ganZhi}}</span>
                    <span class="流年解读">{{流年.analysis}}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
    

    
    <div class="card">
      <h2>八字合盘</h2>
      <form @submit.prevent="calculateCompatibility">
        <div class="form-sections">
          <div class="form-section">
            <h3>甲方信息</h3>
            <div class="form-group">
              <label for="party1-year">出生年份</label>
              <input type="number" id="party1-year" v-model.number="form2.party1.year" min="1900" max="2050" required>
            </div>
            
            <div class="form-group">
              <label for="party1-month">出生月份</label>
              <select id="party1-month" v-model.number="form2.party1.month" required>
                <option v-for="m in 12" :key="m" :value="m">{{ m }}月</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="party1-day">出生日</label>
              <input type="number" id="party1-day" v-model.number="form2.party1.day" min="1" max="31" required>
            </div>
            
            <div class="form-row">
              <div class="form-group half">
                <label for="party1-hour">出生时</label>
                <select id="party1-hour" v-model.number="form2.party1.hour" required>
                  <option v-for="h in 24" :key="h-1" :value="h-1">{{ h-1 }}时</option>
                </select>
              </div>
              
              <div class="form-group half">
                <label for="party1-minute">出生分</label>
                <select id="party1-minute" v-model.number="form2.party1.minute" required>
                  <option v-for="m in 60" :key="m" :value="m-1">{{ m-1 }}分</option>
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <label for="party1-gender">性别</label>
              <select id="party1-gender" v-model="form2.party1.gender" required>
                <option value="male">男</option>
                <option value="female">女</option>
              </select>
            </div>
          </div>
          
          <div class="form-section">
            <h3>乙方信息</h3>
            <div class="form-group">
              <label for="party2-year">出生年份</label>
              <input type="number" id="party2-year" v-model.number="form2.party2.year" min="1900" max="2050" required>
            </div>
            
            <div class="form-group">
              <label for="party2-month">出生月份</label>
              <select id="party2-month" v-model.number="form2.party2.month" required>
                <option v-for="m in 12" :key="m" :value="m">{{ m }}月</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="party2-day">出生日</label>
              <input type="number" id="party2-day" v-model.number="form2.party2.day" min="1" max="31" required>
            </div>
            
            <div class="form-row">
              <div class="form-group half">
                <label for="party2-hour">出生时</label>
                <select id="party2-hour" v-model.number="form2.party2.hour" required>
                  <option v-for="h in 24" :key="h-1" :value="h-1">{{ h-1 }}时</option>
                </select>
              </div>
              
              <div class="form-group half">
                <label for="party2-minute">出生分</label>
                <select id="party2-minute" v-model.number="form2.party2.minute" required>
                  <option v-for="m in 60" :key="m" :value="m-1">{{ m-1 }}分</option>
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <label for="party2-gender">性别</label>
              <select id="party2-gender" v-model="form2.party2.gender" required>
                <option value="male">男</option>
                <option value="female">女</option>
              </select>
            </div>
          </div>
        </div>
        
        <button type="submit" class="btn">合盘分析</button>
      </form>
      
      <div v-if="compatibilityResult" class="result">
        <h3>合盘分析结果</h3>
        <div class="compatibility-charts">
          <div class="compatibility-chart">
            <h4>甲方八字</h4>
            <div class="bazi-chart">
              <div class="bazi-row header">
                <div class="bazi-cell label">项目</div>
                <div class="bazi-cell">年柱</div>
                <div class="bazi-cell">月柱</div>
                <div class="bazi-cell">日柱</div>
                <div class="bazi-cell">时柱</div>
              </div>
              <div class="bazi-row">
                <div class="bazi-cell label">天干</div>
                <div class="bazi-cell gan"><span>{{ compatibilityResult.party1.bazi[0].value.charAt(0) }}</span></div>
                <div class="bazi-cell gan"><span>{{ compatibilityResult.party1.bazi[1].value.charAt(0) }}</span></div>
                <div class="bazi-cell gan"><span>{{ compatibilityResult.party1.bazi[2].value.charAt(0) }}</span></div>
                <div class="bazi-cell gan"><span>{{ compatibilityResult.party1.bazi[3].value.charAt(0) }}</span></div>
              </div>
              <div class="bazi-row">
                <div class="bazi-cell label">地支</div>
                <div class="bazi-cell zhi"><span>{{ compatibilityResult.party1.bazi[0].value.charAt(1) }}</span></div>
                <div class="bazi-cell zhi"><span>{{ compatibilityResult.party1.bazi[1].value.charAt(1) }}</span></div>
                <div class="bazi-cell zhi"><span>{{ compatibilityResult.party1.bazi[2].value.charAt(1) }}</span></div>
                <div class="bazi-cell zhi"><span>{{ compatibilityResult.party1.bazi[3].value.charAt(1) }}</span></div>
              </div>
            </div>
          </div>
          
          <div class="compatibility-chart">
            <h4>乙方八字</h4>
            <div class="bazi-chart">
              <div class="bazi-row header">
                <div class="bazi-cell label">项目</div>
                <div class="bazi-cell">年柱</div>
                <div class="bazi-cell">月柱</div>
                <div class="bazi-cell">日柱</div>
                <div class="bazi-cell">时柱</div>
              </div>
              <div class="bazi-row">
                <div class="bazi-cell label">天干</div>
                <div class="bazi-cell gan"><span>{{ compatibilityResult.party2.bazi[0].value.charAt(0) }}</span></div>
                <div class="bazi-cell gan"><span>{{ compatibilityResult.party2.bazi[1].value.charAt(0) }}</span></div>
                <div class="bazi-cell gan"><span>{{ compatibilityResult.party2.bazi[2].value.charAt(0) }}</span></div>
                <div class="bazi-cell gan"><span>{{ compatibilityResult.party2.bazi[3].value.charAt(0) }}</span></div>
              </div>
              <div class="bazi-row">
                <div class="bazi-cell label">地支</div>
                <div class="bazi-cell zhi"><span>{{ compatibilityResult.party2.bazi[0].value.charAt(1) }}</span></div>
                <div class="bazi-cell zhi"><span>{{ compatibilityResult.party2.bazi[1].value.charAt(1) }}</span></div>
                <div class="bazi-cell zhi"><span>{{ compatibilityResult.party2.bazi[2].value.charAt(1) }}</span></div>
                <div class="bazi-cell zhi"><span>{{ compatibilityResult.party2.bazi[3].value.charAt(1) }}</span></div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="compatibility-analysis">
          <h4>合盘解读</h4>
          <div class="analysis">
            <p v-for="(line, i) in compatibilityResult.analysis.split('\n').filter(l => l.trim())" :key="i">{{ line }}</p>
          </div>
          <div class="compatibility-score">
            <span class="score-label">合盘得分：</span>
            <span class="score-value">{{ compatibilityResult.score }}</span>
            <span class="score-max">/100</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="card">
      <h2>关于八字</h2>
      <div class="analysis">
        <p>八字，也叫四柱，是中国传统命理学术语，由年、月、日、时四柱组成，每柱包含天干和地支两个字，共八个字，故称八字。</p>
        <p>八字命理学认为，一个人的出生时间决定了其命运的基本格局，通过分析八字可以了解个人的性格、事业、婚姻、健康等方面的信息。</p>
        <p>本工具提供基础的八字查询和解读功能，仅供参考，切勿过分迷信。</p>
      </div>
    </div>
    
    <div class="footer">
      <p>© 2026 玄喵盒子 - 八字查询与解读</p>
    </div>
  </div>
</template>

<script>
// 导入 lunar-calendar 库
import LunarCalendar from 'lunar-calendar';

export default {
  name: 'App',
  data() {
    return {
      form: {
        year: 1993,
        month: 1,
        day: 4,
        hour: 14,
        minute: 0,
        province: '北京市',
        city: '北京市',
        district: '东城区',
        useTrueSolarTime: true,
        gender: 'male'
      },
      // 中国省份、城市、区县数据
      regions: {
        '北京市': {
          '北京市': ['东城区', '西城区', '朝阳区', '丰台区', '石景山区', '海淀区', '门头沟区', '房山区', '通州区', '顺义区', '昌平区', '大兴区', '怀柔区', '平谷区', '密云区', '延庆区']
        },
        '天津市': {
          '天津市': ['和平区', '河东区', '河西区', '南开区', '河北区', '红桥区', '东丽区', '西青区', '津南区', '北辰区', '武清区', '宝坻区', '滨海新区', '宁河区', '静海区', '蓟州区']
        },
        '上海市': {
          '上海市': ['黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '杨浦区', '浦东新区', '闵行区', '宝山区', '嘉定区', '金山区', '松江区', '青浦区', '奉贤区', '崇明区']
        },
        '广东省': {
          '广州市': ['荔湾区', '越秀区', '海珠区', '天河区', '白云区', '黄埔区', '番禺区', '花都区', '南沙区', '从化区', '增城区'],
          '深圳市': ['罗湖区', '福田区', '南山区', '宝安区', '龙岗区', '盐田区', '龙华区', '坪山区', '光明区', '大鹏新区'],
          '东莞市': ['莞城街道', '东城街道', '南城街道', '万江街道', '石龙镇', '石排镇', '茶山镇', '企石镇', '桥头镇', '东坑镇', '横沥镇', '常平镇', '虎门镇', '长安镇', '沙田镇', '厚街镇', '寮步镇', '大岭山镇', '大朗镇', '黄江镇', '樟木头镇', '谢岗镇', '塘厦镇', '清溪镇', '凤岗镇', '麻涌镇', '中堂镇', '高埗镇', '石碣镇', '望牛墩镇', '洪梅镇', '道滘镇', '石龙镇'],
          '佛山市': ['禅城区', '南海区', '顺德区', '三水区', '高明区']
        },
        '四川省': {
          '成都市': ['锦江区', '青羊区', '金牛区', '武侯区', '成华区', '龙泉驿区', '青白江区', '新都区', '温江区', '双流区', '郫都区', '新津区', '都江堰市', '彭州市', '邛崃市', '崇州市', '简阳市', '金堂县', '大邑县', '蒲江县'],
          '绵阳市': ['涪城区', '游仙区', '安州区', '江油市', '三台县', '盐亭县', '梓潼县', '北川羌族自治县', '平武县'],
          '德阳市': ['旌阳区', '罗江区', '广汉市', '什邡市', '绵竹市', '中江县']
        },
        '湖北省': {
          '武汉市': ['江岸区', '江汉区', '硚口区', '汉阳区', '武昌区', '青山区', '洪山区', '东西湖区', '汉南区', '蔡甸区', '江夏区', '黄陂区', '新洲区'],
          '宜昌市': ['西陵区', '伍家岗区', '点军区', '猇亭区', '夷陵区', '宜都市', '当阳市', '枝江市', '远安县', '兴山县', '秭归县', '长阳土家族自治县', '五峰土家族自治县'],
          '襄阳市': ['襄城区', '樊城区', '襄州区', '老河口市', '枣阳市', '宜城市', '南漳县', '谷城县', '保康县']
        },
        '陕西省': {
          '西安市': ['新城区', '碑林区', '莲湖区', '灞桥区', '未央区', '雁塔区', '阎良区', '临潼区', '长安区', '高陵区', '鄠邑区', '蓝田县', '周至县'],
          '咸阳市': ['秦都区', '杨陵区', '渭城区', '兴平市', '三原县', '泾阳县', '乾县', '礼泉县', '永寿县', '彬州市', '长武县', '旬邑县', '淳化县', '武功县'],
          '宝鸡市': ['渭滨区', '金台区', '陈仓区', '凤翔区', '岐山县', '扶风县', '眉县', '陇县', '千阳县', '麟游县', '凤县', '太白县']
        },
        '江苏省': {
          '南京市': ['玄武区', '秦淮区', '建邺区', '鼓楼区', '浦口区', '栖霞区', '雨花台区', '江宁区', '六合区', '溧水区', '高淳区'],
          '苏州市': ['姑苏区', '虎丘区', '吴中区', '相城区', '吴江区', '常熟市', '张家港市', '昆山市', '太仓市'],
          '无锡市': ['梁溪区', '锡山区', '惠山区', '滨湖区', '新吴区', '江阴市', '宜兴市'],
          '常州市': ['天宁区', '钟楼区', '新北区', '武进区', '金坛区', '溧阳市']
        },
        '重庆市': {
          '重庆市': ['万州区', '涪陵区', '渝中区', '大渡口区', '江北区', '沙坪坝区', '九龙坡区', '南岸区', '北碚区', '綦江区', '大足区', '渝北区', '巴南区', '黔江区', '长寿区', '江津区', '合川区', '永川区', '南川区', '璧山区', '铜梁区', '潼南区', '荣昌区', '开州区', '梁平区', '武隆区', '城口县', '丰都县', '垫江县', '忠县', '云阳县', '奉节县', '巫山县', '巫溪县', '石柱土家族自治县', '秀山土家族苗族自治县', '酉阳土家族苗族自治县', '彭水苗族土家族自治县']
        },
        '浙江省': {
          '杭州市': ['上城区', '下城区', '江干区', '拱墅区', '西湖区', '滨江区', '萧山区', '余杭区', '富阳区', '临安区', '桐庐县', '淳安县', '建德市'],
          '宁波市': ['海曙区', '江北区', '北仑区', '镇海区', '鄞州区', '奉化区', '余姚市', '慈溪市', '象山县', '宁海县'],
          '温州市': ['鹿城区', '龙湾区', '瓯海区', '洞头区', '瑞安市', '乐清市', '永嘉县', '平阳县', '苍南县', '文成县', '泰顺县']
        },
        '山东省': {
          '济南市': ['历下区', '市中区', '槐荫区', '天桥区', '历城区', '长清区', '章丘区', '济阳区', '莱芜区', '钢城区', '平阴县', '商河县'],
          '青岛市': ['市南区', '市北区', '黄岛区', '崂山区', '李沧区', '城阳区', '即墨区', '胶州市', '平度市', '莱西市'],
          '烟台市': ['芝罘区', '福山区', '牟平区', '莱山区', '蓬莱区', '龙口市', '莱阳市', '莱州市', '招远市', '栖霞市', '海阳市']
        },
        '河南省': {
          '郑州市': ['中原区', '二七区', '管城回族区', '金水区', '上街区', '惠济区', '中牟县', '巩义市', '荥阳市', '新密市', '新郑市', '登封市'],
          '洛阳市': ['老城区', '西工区', '瀍河回族区', '涧西区', '吉利区', '洛龙区', '孟津区', '新安县', '栾川县', '嵩县', '汝阳县', '宜阳县', '洛宁县', '伊川县', '偃师区'],
          '开封市': ['龙亭区', '顺河回族区', '鼓楼区', '禹王台区', '祥符区', '杞县', '通许县', '尉氏县', '兰考县']
        },
        '河北省': {
          '石家庄市': ['长安区', '桥西区', '新华区', '井陉矿区', '裕华区', '藁城区', '鹿泉区', '栾城区', '井陉县', '正定县', '行唐县', '灵寿县', '高邑县', '深泽县', '赞皇县', '无极县', '平山县', '元氏县', '赵县', '辛集市', '晋州市', '新乐市'],
          '唐山市': ['路南区', '路北区', '古冶区', '开平区', '丰南区', '丰润区', '曹妃甸区', '滦南县', '乐亭县', '迁西县', '玉田县', '遵化市', '迁安市'],
          '秦皇岛市': ['海港区', '山海关区', '北戴河区', '抚宁区', '青龙满族自治县', '昌黎县', '卢龙县']
        },
        '湖南省': {
          '长沙市': ['芙蓉区', '天心区', '岳麓区', '开福区', '雨花区', '望城区', '长沙县', '宁乡市', '浏阳市'],
          '株洲市': ['荷塘区', '芦淞区', '石峰区', '天元区', '渌口区', '攸县', '茶陵县', '炎陵县', '醴陵市'],
          '湘潭市': ['雨湖区', '岳塘区', '湘潭县', '湘乡市', '韶山市']
        },
        '福建省': {
          '福州市': ['鼓楼区', '台江区', '仓山区', '马尾区', '晋安区', '长乐区', '闽侯县', '连江县', '罗源县', '闽清县', '永泰县', '平潭县', '福清市'],
          '厦门市': ['思明区', '海沧区', '湖里区', '集美区', '同安区', '翔安区'],
          '泉州市': ['鲤城区', '丰泽区', '洛江区', '泉港区', '惠安县', '安溪县', '永春县', '德化县', '金门县', '石狮市', '晋江市', '南安市']
        },
        '广西壮族自治区': {
          '南宁市': ['兴宁区', '青秀区', '江南区', '西乡塘区', '良庆区', '邕宁区', '武鸣区', '隆安县', '马山县', '上林县', '宾阳县', '横州市'],
          '柳州市': ['城中区', '鱼峰区', '柳南区', '柳北区', '柳江区', '柳城县', '鹿寨县', '融安县', '融水苗族自治县', '三江侗族自治县'],
          '桂林市': ['秀峰区', '叠彩区', '象山区', '七星区', '雁山区', '临桂区', '阳朔县', '灵川县', '全州县', '兴安县', '永福县', '灌阳县', '龙胜各族自治县', '资源县', '平乐县', '恭城瑶族自治县']
        },
        '云南省': {
          '昆明市': ['五华区', '盘龙区', '官渡区', '西山区', '东川区', '呈贡区', '晋宁区', '富民县', '宜良县', '石林彝族自治县', '嵩明县', '禄劝彝族苗族自治县', '寻甸回族彝族自治县', '安宁市'],
          '曲靖市': ['麒麟区', '沾益区', '马龙区', '陆良县', '师宗县', '罗平县', '富源县', '会泽县', '宣威市'],
          '玉溪市': ['红塔区', '江川区', '澄江市', '通海县', '华宁县', '易门县', '峨山彝族自治县', '新平彝族傣族自治县', '元江哈尼族彝族傣族自治县']
        },
        '贵州省': {
          '贵阳市': ['南明区', '云岩区', '花溪区', '乌当区', '白云区', '观山湖区', '开阳县', '息烽县', '修文县', '清镇市'],
          '遵义市': ['红花岗区', '汇川区', '播州区', '桐梓县', '绥阳县', '正安县', '道真仡佬族苗族自治县', '务川仡佬族苗族自治县', '凤冈县', '湄潭县', '余庆县', '习水县', '赤水市', '仁怀市'],
          '六盘水市': ['钟山区', '六枝特区', '水城区', '盘州市']
        },
        '安徽省': {
          '合肥市': ['瑶海区', '庐阳区', '蜀山区', '包河区', '长丰县', '肥东县', '肥西县', '庐江县', '巢湖市'],
          '芜湖市': ['镜湖区', '弋江区', '鸠江区', '湾沚区', '繁昌区', '南陵县', '无为市'],
          '蚌埠市': ['龙子湖区', '蚌山区', '禹会区', '淮上区', '怀远县', '五河县', '固镇县']
        },
        '江西省': {
          '南昌市': ['东湖区', '西湖区', '青云谱区', '湾里管理局', '青山湖区', '新建区', '南昌县', '安义县', '进贤县'],
          '九江市': ['浔阳区', '濂溪区', '柴桑区', '武宁县', '修水县', '永修县', '德安县', '都昌县', '湖口县', '彭泽县', '瑞昌市', '共青城市', '庐山市'],
          '赣州市': ['章贡区', '南康区', '赣县区', '信丰县', '大余县', '上犹县', '崇义县', '安远县', '龙南县', '定南县', '全南县', '宁都县', '于都县', '兴国县', '会昌县', '寻乌县', '石城县', '瑞金市', '龙南市']
        },
        '黑龙江省': {
          '哈尔滨市': ['道里区', '南岗区', '道外区', '平房区', '松北区', '香坊区', '呼兰区', '阿城区', '双城区', '依兰县', '方正县', '宾县', '巴彦县', '木兰县', '通河县', '延寿县', '尚志市', '五常市'],
          '齐齐哈尔市': ['龙沙区', '建华区', '铁锋区', '昂昂溪区', '富拉尔基区', '碾子山区', '梅里斯达斡尔族区', '龙江县', '依安县', '泰来县', '甘南县', '富裕县', '克山县', '克东县', '拜泉县', '讷河市'],
          '牡丹江市': ['东安区', '阳明区', '爱民区', '西安区', '林口县', '绥芬河市', '海林市', '宁安市', '穆棱市', '东宁市']
        },
        '吉林省': {
          '长春市': ['南关区', '宽城区', '朝阳区', '二道区', '绿园区', '双阳区', '九台区', '农安县', '榆树市', '德惠市', '公主岭市'],
          '吉林市': ['昌邑区', '龙潭区', '船营区', '丰满区', '永吉县', '蛟河市', '桦甸市', '舒兰市', '磐石市'],
          '四平市': ['铁西区', '铁东区', '梨树县', '伊通满族自治县', '公主岭市', '双辽市']
        },
        '辽宁省': {
          '沈阳市': ['和平区', '沈河区', '大东区', '皇姑区', '铁西区', '苏家屯区', '浑南区', '沈北新区', '于洪区', '辽中区', '康平县', '法库县', '新民市'],
          '大连市': ['中山区', '西岗区', '沙河口区', '甘井子区', '旅顺口区', '金州区', '普兰店区', '长海县', '瓦房店市', '庄河市'],
          '鞍山市': ['铁东区', '铁西区', '立山区', '千山区', '台安县', '岫岩满族自治县', '海城市']
        },
        '山西省': {
          '太原市': ['小店区', '迎泽区', '杏花岭区', '尖草坪区', '万柏林区', '晋源区', '清徐县', '阳曲县', '娄烦县', '古交市'],
          '大同市': ['新荣区', '平城区', '云冈区', '云州区', '阳高县', '天镇县', '广灵县', '灵丘县', '浑源县', '左云县'],
          '朔州市': ['朔城区', '平鲁区', '山阴县', '应县', '右玉县', '怀仁市']
        },
        '内蒙古自治区': {
          '呼和浩特市': ['新城区', '回民区', '玉泉区', '赛罕区', '土默特左旗', '托克托县', '和林格尔县', '清水河县', '武川县'],
          '包头市': ['东河区', '昆都仑区', '青山区', '石拐区', '白云鄂博矿区', '九原区', '土默特右旗', '固阳县', '达尔罕茂明安联合旗'],
          '呼伦贝尔市': ['海拉尔区', '扎赉诺尔区', '阿荣旗', '莫力达瓦达斡尔族自治旗', '鄂伦春自治旗', '鄂温克族自治旗', '陈巴尔虎旗', '新巴尔虎左旗', '新巴尔虎右旗', '满洲里市', '牙克石市', '扎兰屯市', '额尔古纳市', '根河市']
        },
        '新疆维吾尔自治区': {
          '乌鲁木齐市': ['天山区', '沙依巴克区', '新市区', '水磨沟区', '头屯河区', '达坂城区', '米东区', '乌鲁木齐县'],
          '克拉玛依市': ['独山子区', '克拉玛依区', '白碱滩区', '乌尔禾区'],
          '吐鲁番市': ['高昌区', '鄯善县', '托克逊县']
        },
        '西藏自治区': {
          '拉萨市': ['城关区', '堆龙德庆区', '达孜区', '林周县', '当雄县', '尼木县', '曲水县', '墨竹工卡县'],
          '日喀则市': ['桑珠孜区', '南木林县', '江孜县', '定日县', '萨迦县', '拉孜县', '昂仁县', '谢通门县', '白朗县', '仁布县', '康马县', '定结县', '仲巴县', '亚东县', '吉隆县', '聂拉木县', '萨嘎县', '岗巴县'],
          '昌都市': ['卡若区', '江达县', '贡觉县', '类乌齐县', '丁青县', '察雅县', '八宿县', '左贡县', '芒康县', '洛隆县', '边坝县']
        },
        '宁夏回族自治区': {
          '银川市': ['兴庆区', '西夏区', '金凤区', '永宁县', '贺兰县', '灵武市'],
          '石嘴山市': ['大武口区', '惠农区', '平罗县'],
          '吴忠市': ['利通区', '红寺堡区', '盐池县', '同心县', '青铜峡市']
        },
        '青海省': {
          '西宁市': ['城东区', '城中区', '城西区', '城北区', '大通回族土族自治县', '湟中县', '湟源县'],
          '海东市': ['乐都区', '平安区', '民和回族土族自治县', '互助土族自治县', '化隆回族自治县', '循化撒拉族自治县'],
          '海北藏族自治州': ['门源回族自治县', '祁连县', '海晏县', '刚察县']
        },
        '甘肃省': {
          '兰州市': ['城关区', '七里河区', '西固区', '安宁区', '红古区', '永登县', '皋兰县', '榆中县'],
          '嘉峪关市': ['雄关区', '长城区', '镜铁区'],
          '金昌市': ['金川区', '永昌县']
        },
        '海南省': {
          '海口市': ['秀英区', '龙华区', '琼山区', '美兰区'],
          '三亚市': ['海棠区', '吉阳区', '天涯区', '崖州区'],
          '三沙市': ['西沙群岛', '中沙群岛', '南沙群岛']
        },
        '台湾省': {
          '台北市': ['中正区', '大同区', '中山区', '松山区', '大安区', '万华区', '信义区', '士林区', '北投区', '内湖区', '南港区', '文山区'],
          '高雄市': ['楠梓区', '左营区', '鼓山区', '三民区', '盐埕区', '前金区', '新兴区', '苓雅区', '前镇区', '旗津区', '小港区', '凤山区', '大寮区', '鸟松区', '林园区', '仁武区', '大树区', '旗山区', '美浓区', '六龟区', '甲仙区', '杉林区', '内门区', '茂林区', '桃源区', '那玛夏区'],
          '台中市': ['中区', '东区', '南区', '西区', '北区', '北屯区', '西屯区', '南屯区', '太平区', '大里区', '雾峰区', '乌日区', '丰原区', '后里区', '潭子区', '大雅区', '神冈区', '石冈区', '东势区', '新社区', '和平区', '大肚区', '沙鹿区', '龙井区', '梧栖区', '清水区', '大甲区', '外埔区', '大安']
        },
        '香港特别行政区': {
          '香港岛': ['中西区', '湾仔区', '东区', '南区'],
          '九龙': ['油尖旺区', '深水埗区', '九龙城区', '黄大仙区', '观塘区'],
          '新界': ['北区', '大埔区', '沙田区', '西贡区', '荃湾区', '屯门区', '元朗区', '葵青区', '离岛区']
        },
        '澳门特别行政区': {
          '澳门半岛': ['花地玛堂区', '圣安多尼堂区', '大堂区', '望德堂区', '风顺堂区'],
          '凼仔岛': ['嘉模堂区'],
          '路环岛': ['圣方济各堂区']
        }
      },
      // 区县经纬度数据
      districtCoordinates: {
        '东城区': { longitude: 116.4167, latitude: 39.9289 },
        '西城区': { longitude: 116.3667, latitude: 39.9167 },
        '朝阳区': { longitude: 116.4333, latitude: 39.9167 },
        '丰台区': { longitude: 116.2833, latitude: 39.8667 },
        '石景山区': { longitude: 116.2167, latitude: 39.9 },
        '海淀区': { longitude: 116.2667, latitude: 39.9667 },
        '黄浦区': { longitude: 121.4833, latitude: 31.2333 },
        '徐汇区': { longitude: 121.4333, latitude: 31.1833 },
        '长宁区': { longitude: 121.4, latitude: 31.2 },
        '静安区': { longitude: 121.45, latitude: 31.2333 },
        '荔湾区': { longitude: 113.25, latitude: 23.125 },
        '越秀区': { longitude: 113.2667, latitude: 23.125 },
        '海珠区': { longitude: 113.3, latitude: 23.0833 },
        '天河区': { longitude: 113.35, latitude: 23.1333 },
        '锦江区': { longitude: 104.0833, latitude: 30.65 },
        '青羊区': { longitude: 104.0667, latitude: 30.675 },
        '金牛区': { longitude: 104.05, latitude: 30.7 },
        '武侯区': { longitude: 104.05, latitude: 30.6333 },
        '江岸区': { longitude: 114.3, latitude: 30.6 },
        '江汉区': { longitude: 114.2833, latitude: 30.6333 },
        '硚口区': { longitude: 114.25, latitude: 30.6333 },
        '汉阳区': { longitude: 114.2, latitude: 30.5833 },
        '新城区': { longitude: 108.95, latitude: 34.3833 },
        '碑林区': { longitude: 108.9667, latitude: 34.3667 },
        '莲湖区': { longitude: 108.9333, latitude: 34.35 },
        '灞桥区': { longitude: 109.0667, latitude: 34.3333 },
        '玄武区': { longitude: 118.8, latitude: 32.05 },
        '秦淮区': { longitude: 118.7833, latitude: 32.0417 },
        '建邺区': { longitude: 118.75, latitude: 32.0333 },
        '鼓楼区': { longitude: 118.7667, latitude: 32.0667 },
        '万州区': { longitude: 108.35, latitude: 30.8 },
        '涪陵区': { longitude: 107.35, latitude: 29.7 },
        '渝中区': { longitude: 106.55, latitude: 29.5667 },
        '大渡口区': { longitude: 106.4667, latitude: 29.4333 },
        '上城区': { longitude: 120.15, latitude: 30.25 },
        '下城区': { longitude: 120.1667, latitude: 30.2667 },
        '江干区': { longitude: 120.2, latitude: 30.2667 },
        '拱墅区': { longitude: 120.15, latitude: 30.3 }  
      },
      form2: {
        party1: {
          year: 1993,
          month: 1,
          day: 4,
          hour: 14,
          minute: 0,
          gender: 'male'
        },
        party2: {
          year: 1995,
          month: 5,
          day: 20,
          hour: 8,
          minute: 30,
          gender: 'female'
        }
      },
      result: null,
      compatibilityResult: null,
      currentKnowledgeIndex: 0,
      knowledgeTimer: null,
      currentTime: '',
      solarDate: '',
      lunarInfo: '',
      solarTerm: '',
      timeTimer: null,
      // 命理小知识
      knowledgeList: [
        {
          term: '天干',
          explanation: '天干是中国古代历法中的重要组成部分，共有十个：甲、乙、丙、丁、戊、己、庚、辛、壬、癸。天干与地支配合，组成六十甲子，用于纪年纪月纪日纪时。'
        },
        {
          term: '地支',
          explanation: '地支是中国古代历法中的重要组成部分，共有十二个：子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥。地支与天干配合，组成六十甲子，用于纪年纪月纪日纪时。'
        },
        {
          term: '八字',
          explanation: '八字，也叫四柱，是由年、月、日、时四柱组成，每柱包含天干和地支两个字，共八个字，故称八字。八字命理学认为，一个人的出生时间决定了其命运的基本格局。'
        },
        {
          term: '节气',
          explanation: '节气是中国古代历法中的重要组成部分，一年有二十四节气，每个节气对应太阳黄经的特定位置。在八字计算中，月份的划分以节气为界，而不是以公历月份为界。'
        },
        {
          term: '大运',
          explanation: '大运是八字命理学中的重要概念，指人一生中每十年一个阶段的运势。大运的计算基于八字中的月柱，按照一定的规则排列。'
        },
        {
          term: '流年',
          explanation: '流年指的是每年的天干地支，用于分析当年的运势。在八字命理学中，流年与八字的相互作用会影响当年的吉凶祸福。'
        },
        {
          term: '五行',
          explanation: '五行是中国古代哲学中的重要概念，包括金、木、水、火、土五种元素。五行之间存在相生相克的关系，在八字命理学中用于分析命局的平衡与失衡。'
        },
        {
          term: '十神',
          explanation: '十神是八字命理学中的重要概念，包括正官、七杀、正财、偏财、正印、偏印、食神、伤官、比肩、劫财十种。十神用于分析八字中各天干地支之间的关系。'
        },
        {
          term: '五行相生相克',
          explanation: '五行相生：金生水，水生木，木生火，火生土，土生金。五行相克：金克木，木克土，土克水，水克火，火克金。在八字命理学中，五行的相生相克关系是分析命局的重要依据。'
        },
        {
          term: '八字格局',
          explanation: '八字格局是指八字中天干地支的组合方式，常见的格局有正官格、七杀格、正财格、偏财格、正印格、偏印格、食神格、伤官格等。不同的格局代表着不同的性格特点和运势倾向。'
        },
        {
          term: '用神',
          explanation: '用神是八字命理学中的核心概念，指命局中最需要的五行元素。用神的选择基于命局的平衡与失衡情况，选择用神的目的是为了调整命局，使其达到平衡状态。'
        },
        {
          term: '喜忌',
          explanation: '喜忌是指命局中喜欢和忌讳的五行元素。喜神是对命局有益的五行，忌神是对命局有害的五行。在八字预测中，喜忌的分析是判断运势吉凶的重要依据。'
        },
        {
          term: '桃花',
          explanation: '桃花是八字命理学中的重要概念，指异性缘和感情运势。命局中桃花旺盛的人通常异性缘好，感情生活丰富。桃花分为墙内桃花和墙外桃花，前者主婚姻美满，后者主婚外情。'
        },
        {
          term: '驿马',
          explanation: '驿马是八字命理学中的重要神煞，代表走动、出行、变动等。命局中驿马旺盛的人通常一生走动较多，适合从事与旅行、运输相关的行业，也容易有异地发展的机会。'
        },
        {
          term: '华盖',
          explanation: '华盖是八字命理学中的重要神煞，代表孤独、清高、艺术天赋等。命局中华盖旺盛的人通常性格孤独，喜欢独处，有艺术天赋，适合从事与艺术、宗教、哲学相关的行业。'
        },
        {
          term: '贵人',
          explanation: '贵人是八字命理学中的重要神煞，代表帮助、支持、机遇等。命局中贵人旺盛的人通常一生多得贵人相助，遇到困难时容易得到他人的帮助和支持。'
        },
        {
          term: '六亲',
          explanation: '六亲是八字命理学中的重要概念，指与命主有血缘关系的亲属，包括父母、兄弟姐妹、配偶、子女等。在八字预测中，六亲的分析是判断家庭关系和感情运势的重要依据。'
        },
        {
          term: '命宫',
          explanation: '命宫是八字命理学中的重要概念，是命主的精神居所，代表命主的性格、气质、命运等。命宫的计算基于出生时间，不同的命宫代表着不同的性格特点和运势倾向。'
        },
        {
          term: '胎元',
          explanation: '胎元是八字命理学中的重要概念，指命主在母腹中的月份。胎元的计算基于出生月份，代表命主的先天素质和潜在能力。'
        },
        {
          term: '纳音',
          explanation: '纳音是八字命理学中的重要概念，是将六十甲子与五行相配的一种方法。每个甲子都有对应的纳音五行，用于分析命局的性格特点和运势倾向。'
        },
        {
          term: '地支藏干',
          explanation: '地支藏干是八字命理学中的重要概念，指每个地支中蕴含的天干。地支藏干的分析是八字预测中的重要环节，用于更准确地判断命局的五行强弱和十神关系。'
        },
        {
          term: '八字合婚',
          explanation: '八字合婚是八字命理学中的重要应用，通过分析男女双方的八字来判断婚姻的和谐程度。合婚的主要内容包括五行互补、十神关系、用神是否相合等方面。'
        },
        {
          term: '八字预测',
          explanation: '八字预测是八字命理学的主要应用，通过分析命局的五行强弱、十神关系、大运流年等因素，来预测命主的事业、财运、感情、健康等方面的运势。'
        }
      ],
      // 天干
      tianGan: ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'],
      // 地支
      diZhi: ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'],
      // 五行与天干地支对应关系
      wuXing: {
        // 天干五行
        tianGan: {
          '甲': '木', '乙': '木',
          '丙': '火', '丁': '火',
          '戊': '土', '己': '土',
          '庚': '金', '辛': '金',
          '壬': '水', '癸': '水'
        },
        // 地支五行
        diZhi: {
          '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
          '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水'
        }
      },
      // 六十甲子
      liuShiJiaZi: [
        '甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己巳', '庚午', '辛未', '壬申', '癸酉',
        '甲戌', '乙亥', '丙子', '丁丑', '戊寅', '己卯', '庚辰', '辛巳', '壬午', '癸未',
        '甲申', '乙酉', '丙戌', '丁亥', '戊子', '己丑', '庚寅', '辛卯', '壬辰', '癸巳',
        '甲午', '乙未', '丙申', '丁酉', '戊戌', '己亥', '庚子', '辛丑', '壬寅', '癸卯',
        '甲辰', '乙巳', '丙午', '丁未', '戊申', '己酉', '庚戌', '辛亥', '壬子', '癸丑',
        '甲寅', '乙卯', '丙辰', '丁巳', '戊午', '己未', '庚申', '辛酉', '壬戌', '癸亥'
      ],
      // 地支藏干表（本气/中气/余气 + 权重）
      diZhiCangGan: {
        '子': [['癸', 100]],
        '丑': [['己', 100], ['癸', 60], ['辛', 30]],
        '寅': [['甲', 100], ['丙', 60], ['戊', 30]],
        '卯': [['乙', 100]],
        '辰': [['戊', 100], ['乙', 60], ['癸', 30]],
        '巳': [['丙', 100], ['庚', 60], ['戊', 30]],
        '午': [['丁', 100], ['己', 60]],
        '未': [['己', 100], ['丁', 60], ['乙', 30]],
        '申': [['庚', 100], ['壬', 60], ['戊', 30]],
        '酉': [['辛', 100]],
        '戌': [['戊', 100], ['辛', 60], ['丁', 30]],
        '亥': [['壬', 100], ['甲', 60]]
      },
      // 十二节（月界标志，非气）
      jieTerms: ['小寒', '立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪'],
      // 同党五行（印+比劫）
      allyMap: {
        '木': ['木', '水'],
        '火': ['火', '木'],
        '土': ['土', '火'],
        '金': ['金', '土'],
        '水': ['水', '金']
      },
      wuXingEn: { '木': 'WOOD', '火': 'FIRE', '土': 'EARTH', '金': 'METAL', '水': 'WATER' }
    }
  },
  computed: {
    currentKnowledge() {
      return this.knowledgeList[this.currentKnowledgeIndex];
    },
    // 省份列表
    provinces() {
      return Object.keys(this.regions);
    },
    // 城市列表（基于选中的省份）
    cities() {
      if (this.form.province) {
        return Object.keys(this.regions[this.form.province]);
      }
      return [];
    },
    // 区县列表（基于选中的城市）
    districts() {
      if (this.form.province && this.form.city) {
        return this.regions[this.form.province][this.form.city] || [];
      }
      return [];
    }
  },
  mounted() {
    // 启动定时器，每隔30秒切换一个小知识
    this.startKnowledgeTimer();
    // 启动时间定时器，每秒更新一次时间
    this.updateTime();
    this.timeTimer = setInterval(() => {
      this.updateTime();
    }, 1000);
  },
  beforeUnmount() {
    // 清除定时器
    if (this.knowledgeTimer) {
      clearInterval(this.knowledgeTimer);
    }
    if (this.timeTimer) {
      clearInterval(this.timeTimer);
    }
  },
  methods: {
    startKnowledgeTimer() {
      this.knowledgeTimer = setInterval(() => {
        this.currentKnowledgeIndex = (this.currentKnowledgeIndex + 1) % this.knowledgeList.length;
      }, 30000); // 30秒切换一次
    },
    nextKnowledge() {
      // 手动切换到下一个小知识
      this.currentKnowledgeIndex = (this.currentKnowledgeIndex + 1) % this.knowledgeList.length;
    },
    
    // 更新城市列表
    updateCities() {
      // 当省份改变时，重置城市和区县
      const cities = Object.keys(this.regions[this.form.province]);
      this.form.city = cities[0];
      this.updateDistricts();
    },
    
    // 更新区县列表
    updateDistricts() {
      // 当城市改变时，重置区县
      const districts = this.regions[this.form.province][this.form.city];
      if (districts && districts.length > 0) {
        this.form.district = districts[0];
      } else {
        this.form.district = '';
      }
    },

    
    // 计算真太阳时
    calculateTrueSolarTime(year, month, day, hour, minute, longitude) {
      // 1. 经度时差（每度4分钟，以120°E为基准）
      const longitudeOffset = (longitude - 120) * 4;

      // 2. 均时差（Equation of Time）
      const d = new Date(year, month - 1, day);
      const startOfYear = new Date(year, 0, 1);
      const dayOfYear = Math.floor((d - startOfYear) / 86400000) + 1;
      const B = (360 / 365.24) * (dayOfYear - 81) * Math.PI / 180;
      const EoT = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);

      // 3. 总修正 = 经度差 + 均时差
      const totalOffset = longitudeOffset + EoT;

      // 4. 应用修正
      let totalMinutes = hour * 60 + minute + totalOffset;
      if (totalMinutes < 0) totalMinutes += 1440;
      if (totalMinutes >= 1440) totalMinutes -= 1440;

      return {
        hour: Math.floor(totalMinutes / 60),
        minute: Math.round(totalMinutes % 60)
      };
    },
    
    // 计算八字五行
    calculateWuXing(ganZhi) {
      const tianGan = ganZhi.charAt(0);
      const diZhi = ganZhi.charAt(1);
      return {
        tianGan: this.wuXing.tianGan[tianGan] || '',
        diZhi: this.wuXing.diZhi[diZhi] || ''
      };
    },
    calculateWeightedWuXing(bazi) {
      const stats = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
      // 天干：各 100
      bazi.forEach(p => {
        const gan = p.value.charAt(0);
        const wx = this.wuXing.tianGan[gan];
        if (wx) stats[wx] += 100;
      });
      // 地支藏干：本气100/中气60/余气30，月支本气×1.5
      bazi.forEach((p, i) => {
        const zhi = p.value.charAt(1);
        const hidden = this.diZhiCangGan[zhi];
        if (!hidden) return;
        hidden.forEach(([stem, weight], j) => {
          const wx = this.wuXing.tianGan[stem];
          if (!wx) return;
          const multiplier = (i === 1 && j === 0) ? 1.5 : 1;
          stats[wx] += weight * multiplier;
        });
      });
      return stats;
    },
    
    calculateBazi() {
      const testDate = new Date(this.form.year, this.form.month - 1, this.form.day)
      if (testDate.getMonth() + 1 !== this.form.month || testDate.getDate() !== this.form.day) {
        alert('日期不存在，请检查输入')
        return
      }
      try {
        // 获取区县的经纬度
        const districtCoord = this.districtCoordinates[this.form.district];
        let hour = this.form.hour;
        let minute = this.form.minute;
        
        // 如果使用真太阳时，进行时间调整
        if (this.form.useTrueSolarTime && districtCoord) {
          const trueSolarTime = this.calculateTrueSolarTime(
            this.form.year, 
            this.form.month, 
            this.form.day, 
            this.form.hour, 
            this.form.minute, 
            districtCoord.longitude
          );
          hour = trueSolarTime.hour;
          minute = trueSolarTime.minute;
        }
        
        // 晚子时处理：23:00后日柱归次日
        let calcYear = this.form.year;
        let calcMonth = this.form.month;
        let calcDay = this.form.day;
        if (hour >= 23) {
          const nextDay = new Date(this.form.year, this.form.month - 1, this.form.day + 1);
          calcYear = nextDay.getFullYear();
          calcMonth = nextDay.getMonth() + 1;
          calcDay = nextDay.getDate();
        }
        // 使用 lunar-calendar 库计算八字
        const lunar = LunarCalendar.solarToLunar(calcYear, calcMonth, calcDay)

        const yearGanZhi = lunar.GanZhiYear
        const monthGanZhi = lunar.GanZhiMonth
        const dayGanZhi = lunar.GanZhiDay

        // 时柱：日干起时法
        const shiChenIndex = Math.floor((hour + 1) % 24 / 2)
        const dayGanIndex = this.tianGan.indexOf(dayGanZhi.charAt(0))
        const shiGanStart = [0, 2, 4, 6, 8][dayGanIndex % 5]
        const hourGanZhi = this.tianGan[(shiGanStart + shiChenIndex) % 10] + this.diZhi[shiChenIndex]
        
        // 计算五行
        const yearWuXing = this.calculateWuXing(yearGanZhi);
        const monthWuXing = this.calculateWuXing(monthGanZhi);
        const dayWuXing = this.calculateWuXing(dayGanZhi);
        const hourWuXing = this.calculateWuXing(hourGanZhi);
        
        // 生成八字结果
        const bazi = [
          { 
            label: '年柱', 
            value: yearGanZhi, 
            wuXing: yearWuXing 
          },
          { 
            label: '月柱', 
            value: monthGanZhi, 
            wuXing: monthWuXing 
          },
          { 
            label: '日柱', 
            value: dayGanZhi, 
            wuXing: dayWuXing 
          },
          { 
            label: '时柱', 
            value: hourGanZhi, 
            wuXing: hourWuXing 
          }
        ];
        
        // 计算五行统计
        const wuXingStats = {
          木: 0, 火: 0, 土: 0, 金: 0, 水: 0
        };
        
        [yearWuXing, monthWuXing, dayWuXing, hourWuXing].forEach(item => {
          if (item.tianGan) wuXingStats[item.tianGan]++;
          if (item.diZhi) wuXingStats[item.diZhi]++;
        });
        
        // 计算大运
        const 大运 = this.calculate大运(bazi, this.form.gender);
        const weightedWuXing = this.calculateWeightedWuXing(bazi);

        // 先创建 result（流年解读需要 this.result.bazi）
        this.result = {
          bazi: bazi,
          wuXing: wuXingStats,
          analysis: this.generateAnalysis(yearGanZhi, monthGanZhi, dayGanZhi, hourGanZhi, weightedWuXing),
          大运: 大运,
          流年: []
        };
        // 流年需要 this.result 已存在才能读日元
        this.result.流年 = this.calculate流年(bazi);
        

      } catch (error) {
        console.error('八字计算错误:', error);
        // 如果库计算失败，使用备用算法
        this.calculateBaziFallback();
      }
    },
    calculateBaziFallback() {
      // 备用的八字计算逻辑
      // 获取区县的经纬度
      const districtCoord = this.districtCoordinates[this.form.district];
      let hour = this.form.hour;
      let minute = this.form.minute;
      
      // 如果使用真太阳时，进行时间调整
      if (this.form.useTrueSolarTime && districtCoord) {
        const trueSolarTime = this.calculateTrueSolarTime(
          this.form.year, 
          this.form.month, 
          this.form.day, 
          this.form.hour, 
          this.form.minute, 
          districtCoord.longitude
        );
        hour = trueSolarTime.hour;
        minute = trueSolarTime.minute;
      }
      
      // 计算年柱
      const yearIndex = (this.form.year - 1900) % 60;
      const yearGanZhi = this.liuShiJiaZi[yearIndex];
      
      // 计算月柱
      const monthIndex = (this.form.year * 12 + this.form.month - 1900 * 12 - 1) % 60;
      const monthGanZhi = this.liuShiJiaZi[monthIndex];
      
      // 计算日柱
      const dayIndex = (this.form.year * 365 + this.form.month * 30 + this.form.day) % 60;
      const dayGanZhi = this.liuShiJiaZi[dayIndex];
      
      // 计算时柱
      const hourIndex = (hour * 2) % 60;
      const hourGanZhi = this.liuShiJiaZi[hourIndex];
      
      // 计算五行
      const yearWuXing = this.calculateWuXing(yearGanZhi);
      const monthWuXing = this.calculateWuXing(monthGanZhi);
      const dayWuXing = this.calculateWuXing(dayGanZhi);
      const hourWuXing = this.calculateWuXing(hourGanZhi);
      
      // 生成八字结果
      const bazi = [
        { 
          label: '年柱', 
          value: yearGanZhi, 
          wuXing: yearWuXing 
        },
        { 
          label: '月柱', 
          value: monthGanZhi, 
          wuXing: monthWuXing 
        },
        { 
          label: '日柱', 
          value: dayGanZhi, 
          wuXing: dayWuXing 
        },
        { 
          label: '时柱', 
          value: hourGanZhi, 
          wuXing: hourWuXing 
        }
      ];
      
      // 计算五行统计
      const wuXingStats = {
        木: 0, 火: 0, 土: 0, 金: 0, 水: 0
      };
      
      [yearWuXing, monthWuXing, dayWuXing, hourWuXing].forEach(item => {
        if (item.tianGan) wuXingStats[item.tianGan]++;
        if (item.diZhi) wuXingStats[item.diZhi]++;
      });
      
      const 大运 = this.calculate大运(bazi, this.form.gender);
      const weightedWuXing = this.calculateWeightedWuXing(bazi);

      this.result = {
        bazi: bazi,
        wuXing: wuXingStats,
        analysis: this.generateAnalysis(yearGanZhi, monthGanZhi, dayGanZhi, hourGanZhi, weightedWuXing),
        大运: 大运,
        流年: []
      };
      this.result.流年 = this.calculate流年(bazi);
    },
    generateAnalysis(year, month, day, hour, weightedWuXing) {
      const yearGanZhi = year;
      const monthGanZhi = month;
      const dayGanZhi = day;
      const hourGanZhi = hour;
      
      const dayGan = dayGanZhi.charAt(0);
      const dayWuXing = this.wuXing.tianGan[dayGan];
      
      const wuXingStats = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
      
      [yearGanZhi, monthGanZhi, dayGanZhi, hourGanZhi].forEach(ganZhi => {
        const gan = ganZhi.charAt(0);
        const zhi = ganZhi.charAt(1);
        if (this.wuXing.tianGan[gan]) wuXingStats[this.wuXing.tianGan[gan]]++;
        if (this.wuXing.diZhi[zhi]) wuXingStats[this.wuXing.diZhi[zhi]]++;
      });
      
      const dayMasterInfo = this.getDayMasterInfo(dayGan, dayWuXing);
      const analysis = this.analyzeWuXingBalance(weightedWuXing || wuXingStats, dayWuXing, monthGanZhi);
      
      return this.generateComprehensiveAnalysis(dayMasterInfo, wuXingStats, analysis);
    },
    
    getDayMasterInfo(gan, wuXing) {
      const infoMap = {
        '甲': { 
          name: '甲木', desc: '阳木', 
          traits: '性格刚直豪爽，有担当，有上进心，喜欢独立发展，重视原则，行事磊落。',
          personality: '您行动力强，有魄力，敢于承担责任。但有时可能过于固执，需学会灵活变通。'
        },
        '乙': { 
          name: '乙木', desc: '阴木', 
          traits: '性格柔和细腻，善于变通，有韧性，适应能力强，擅长沟通协调。',
          personality: '您温柔体贴，善解人意，有较强的适应能力。但有时可能缺乏主见，需学会果断决策。'
        },
        '丙': { 
          name: '丙火', desc: '阳火', 
          traits: '性格热烈外向，精力充沛，行动力强，有领导气质，喜欢表现自己。',
          personality: '您热情开朗，感染力强，善于带动气氛。但有时可能过于冲动，需注意控制情绪。'
        },
        '丁': { 
          name: '丁火', desc: '阴火', 
          traits: '性格温暖细腻，善于思考，有耐心，责任心强，适合从事细致的工作。',
          personality: '您心思缜密，责任感强，善于分析问题。但有时可能过于追求完美，需学会接受不完美。'
        },
        '戊': { 
          name: '戊土', desc: '阳土', 
          traits: '性格稳重厚道，诚实守信，有责任感，适合从事管理或稳定的工作。',
          personality: '您踏实可靠，值得信赖，有较强的领导能力。但有时可能过于保守，需敢于尝试新事物。'
        },
        '己': { 
          name: '己土', desc: '阴土', 
          traits: '性格包容豁达，善于变通，有耐心，擅长处理复杂问题。',
          personality: '您包容心强，善于协调，有较强的沟通能力。但有时可能过于随和，需学会坚持原则。'
        },
        '庚': { 
          name: '庚金', desc: '阳金', 
          traits: '性格刚毅果断，行动力强，有魄力，适合从事挑战性的工作。',
          personality: '您意志坚定，果断有力，敢于面对困难。但有时可能过于刚硬，需学会柔韧处事。'
        },
        '辛': { 
          name: '辛金', desc: '阴金', 
          traits: '性格细腻精致，善于分析，有审美眼光，适合从事精细或艺术类工作。',
          personality: '您追求完美，注重细节，有较强的审美能力。但有时可能过于挑剔，需学会抓大放小。'
        },
        '壬': { 
          name: '壬水', desc: '阳水', 
          traits: '性格聪明智慧，思维活跃，擅长谋略，有较强的适应能力。',
          personality: '您思路开阔，适应力强，善于把握机会。但有时可能过于善变，需学会专注坚持。'
        },
        '癸': { 
          name: '癸水', desc: '阴水', 
          traits: '性格温柔细腻，善于观察，有直觉力，适合从事需要洞察力的工作。',
          personality: '您直觉敏锐，感受力强，善于发现细节。但有时可能过于敏感，需学会调整心态。'
        }
      };
      return infoMap[gan] || { name: gan, desc: '', traits: '', personality: '' };
    },
    
    analyzeWuXingBalance(wuXingStats, dayWuXing, monthGanZhi) {
      let dayMasterStatus = '';
      let useGod = [];
      let avoidGod = [];

      // 计算同党（印+比劫）占比
      const allies = this.allyMap[dayWuXing] || [dayWuXing];
      const total = Object.values(wuXingStats).reduce((a, b) => a + b, 0);
      const allyTotal = allies.reduce((sum, wx) => sum + (wuXingStats[wx] || 0), 0);
      const ratio = total > 0 ? allyTotal / total : 0.5;

      if (ratio > 0.55) {
        dayMasterStatus = '身强';
      } else if (ratio < 0.45) {
        dayMasterStatus = '身弱';
      } else {
        dayMasterStatus = '中和';
      }

      const isStrong = ratio > 0.5;

      if (isStrong) {
        if (dayWuXing === '木') { useGod = ['金', '土']; avoidGod = ['水', '木']; }
        else if (dayWuXing === '火') { useGod = ['水', '金']; avoidGod = ['木', '火']; }
        else if (dayWuXing === '土') { useGod = ['木', '水']; avoidGod = ['火', '土']; }
        else if (dayWuXing === '金') { useGod = ['火', '木']; avoidGod = ['土', '金']; }
        else if (dayWuXing === '水') { useGod = ['土', '火']; avoidGod = ['金', '水']; }
      } else {
        if (dayWuXing === '木') { useGod = ['水', '木']; avoidGod = ['金', '土']; }
        else if (dayWuXing === '火') { useGod = ['木', '火']; avoidGod = ['水', '金']; }
        else if (dayWuXing === '土') { useGod = ['火', '土']; avoidGod = ['木', '水']; }
        else if (dayWuXing === '金') { useGod = ['土', '金']; avoidGod = ['火', '木']; }
        else if (dayWuXing === '水') { useGod = ['金', '水']; avoidGod = ['土', '火']; }
      }

      return { status: dayMasterStatus, useGod, avoidGod, ratio };
    },
    
    generateComprehensiveAnalysis(dayMasterInfo, wuXingStats, analysis) {
      const { name, desc, traits, personality } = dayMasterInfo;
      const { status, useGod, avoidGod } = analysis;
      
      let wuXingDesc = '';
      if (wuXingStats['水'] >= 3) wuXingDesc += '水气旺盛，';
      if (wuXingStats['火'] >= 3) wuXingDesc += '火气兴旺，';
      if (wuXingStats['木'] >= 3) wuXingDesc += '木气充盈，';
      if (wuXingStats['金'] >= 3) wuXingDesc += '金气有力，';
      if (wuXingStats['土'] >= 3) wuXingDesc += '土气厚实，';
      if (wuXingStats['水'] === 0) wuXingDesc += '命中无水，';
      if (wuXingStats['火'] === 0) wuXingDesc += '命中缺火，';
      if (wuXingStats['木'] === 0) wuXingDesc += '命中无木，';
      if (wuXingStats['金'] === 0) wuXingDesc += '命中少金，';
      if (wuXingStats['土'] === 0) wuXingDesc += '命中无土，';
      
      const useGodStr = useGod.join('、');
      const avoidGodStr = avoidGod.join('、');
      
      let careerAdvice = '';
      if (useGod.includes('火')) careerAdvice += '教育、互联网、能源电力、餐饮，';
      if (useGod.includes('土')) careerAdvice += '建筑、房地产、矿产，';
      if (useGod.includes('木')) careerAdvice += '林业、教育、家具，';
      if (useGod.includes('金')) careerAdvice += '金融、珠宝、机械加工、矿业，';
      if (useGod.includes('水')) careerAdvice += '物流、运输、旅游、水利，';
      if (careerAdvice.length > 0) careerAdvice = careerAdvice.slice(0, -1) + '等行业';
      
      let healthAdvice = '';
      if (avoidGod.includes('火')) healthAdvice += '心血管疾病、';
      if (avoidGod.includes('水')) healthAdvice += '泌尿系统疾病、';
      if (avoidGod.includes('木')) healthAdvice += '肝胆疾病、';
      if (avoidGod.includes('金')) healthAdvice += '呼吸系统疾病、';
      if (avoidGod.includes('土')) healthAdvice += '消化系统疾病、';
      if (healthAdvice.length > 0) healthAdvice = healthAdvice.slice(0, -1);
      
      let analysisText = `【命主属性】您是${name}（${desc}），${traits}\n`;
      analysisText += `【命局旺衰】${status}之命。${wuXingDesc}五行分布各有特点。\n`;
      analysisText += `【五行喜忌】命局喜用神为${useGodStr}，需避免${avoidGodStr}。建议多接触属${useGodStr}的事物，可起到调和命局的作用。\n`;
      analysisText += `【性格特点】${personality}\n`;
      analysisText += `【事业方向】适合从事${careerAdvice}，这些行业有助于发挥您的命局优势。\n`;
      analysisText += `【健康注意】平时应注意${healthAdvice}，保持良好的生活习惯和作息规律。\n`;
      analysisText += `【幸运颜色】${this.getLuckyColors(useGod)}。\n`;
      analysisText += `【幸运数字】${this.getLuckyNumbers(useGod)}。`;
      
      return analysisText;
    },
    
    getLuckyColors(useGod) {
      const colorMap = { '木': '绿色、青色', '火': '红色、紫色', '土': '黄色、棕色', '金': '白色、金色', '水': '蓝色、黑色' };
      return useGod.map(w => colorMap[w]).join('、');
    },
    
    getLuckyNumbers(useGod) {
      const numberMap = { '木': '3、8', '火': '2、7', '土': '5、10', '金': '4、9', '水': '1、6' };
      return useGod.map(w => numberMap[w]).join('、');
    },

    updateTime() {
      // 更新实时时间
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      
      // 更新公历日期
      this.solarDate = `${year}-${month}-${day}`;
      
      // 更新时间，确保格式一致，避免位置变化
      this.currentTime = `${hours}:${minutes}:${seconds}`;
      
      // 更新农历信息和节气信息
      this.updateLunarInfo(now);
    },
    updateLunarInfo(date) {
      try {
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const day = date.getDate()
        const lunar = LunarCalendar.solarToLunar(year, month, day)

        const zodiacEmojiMap = {
          '鼠': '🐭', '牛': '🐮', '虎': '🐯', '兔': '🐰', '龙': '🐲', '蛇': '🐍',
          '马': '🐴', '羊': '🐑', '猴': '🐵', '鸡': '🐔', '狗': '🐶', '猪': '🐷'
        }
        const zodiacEmoji = zodiacEmojiMap[lunar.zodiac] || '🐾'
        const monthName = lunar.lunarMonthName || ''
        const dayName = lunar.lunarDayName || `${Math.floor(lunar.lunarDay)}日`
        this.lunarInfo = `${monthName}${dayName} ${zodiacEmoji}`
        this.solarTerm = lunar.term || ''
      } catch (error) {
        console.error('农历计算错误:', error)
        this.lunarInfo = '农历加载中...'
        this.solarTerm = ''
      }
    },
    calculate大运(bazi, gender) {
      const 大运List = [];
      const 月柱 = bazi[1].value;
      const 月柱Index = this.liuShiJiaZi.indexOf(月柱);

      // 大运方向：阳年男/阴年女 顺行，阴年男/阳年女 逆行
      const yearGan = bazi[0].value.charAt(0);
      const yearGanIndex = this.tianGan.indexOf(yearGan);
      const isYangYear = yearGanIndex % 2 === 0;
      const isMale = gender === 'male';
      const direction = (isYangYear === isMale) ? 1 : -1;

      // 大运起步年龄：从出生日到最近的节（顺行找后一个节，逆行找前一个节）
      let startAge = 6; // fallback
      try {
        let days = 0;
        const searchDir = direction;
        const searchDate = new Date(this.form.year, this.form.month - 1, this.form.day);
        for (let i = 1; i <= 45; i++) {
          searchDate.setDate(searchDate.getDate() + searchDir);
          days++;
          const y = searchDate.getFullYear();
          const m = searchDate.getMonth() + 1;
          const d = searchDate.getDate();
          try {
            const lunar = LunarCalendar.solarToLunar(y, m, d);
            if (lunar.term && this.jieTerms.includes(lunar.term)) break;
          } catch(e) { /* skip */ }
        }
        startAge = Math.max(1, Math.min(10, Math.round(days / 3)));
      } catch(e) { /* use fallback */ }

      // 日元五行（用于解读）
      const dayGan = bazi[2].value.charAt(0);
      const dayWuXing = this.wuXing.tianGan[dayGan];

      for (let i = 0; i < 10; i++) {
        const idx = (月柱Index + (i + 1) * direction + 60) % 60;
        const ganZhi = this.liuShiJiaZi[idx];
        const start = startAge + i * 10;

        大运List.push({
          startYear: start,
          endYear: start + 9,
          ganZhi: ganZhi,
          analysis: this.generate大运解读(ganZhi, dayWuXing)
        });
      }

      return 大运List;
    },
    calculate流年(bazi) {
      const 流年List = [];
      const 当前年份 = new Date().getFullYear();

      for (let i = -5; i <= 5; i++) {
        const 流年年份 = 当前年份 + i;
        const 流年Index = (流年年份 - 4) % 60;
        const 流年干支 = this.liuShiJiaZi[流年Index];

        const 流年解读 = this.generate流年解读(流年干支, i);

        流年List.push({
          year: 流年年份,
          ganZhi: 流年干支,
          analysis: 流年解读
        });
      }

      return 流年List;
    },
    generate大运解读(大运干支, dayWuXing) {
      const gan = 大运干支.charAt(0);
      const zhi = 大运干支.charAt(1);
      const ganWx = this.wuXing.tianGan[gan];
      const zhiWx = this.wuXing.diZhi[zhi];
      if (!dayWuXing || !ganWx) return '';

      const sheng = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
      const ke = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };

      let desc = '';
      if (ganWx === dayWuXing) {
        desc = '比肩劫财运，同辈助力增，人际拓展期，宜合作共事。';
      } else if (sheng[dayWuXing] === ganWx) {
        desc = '食伤泄秀运，才华显露期，利创作表达，注意把控尺度。';
      } else if (sheng[ganWx] === dayWuXing) {
        desc = '印绶生身运，贵人扶持期，利学业深造，宜稳扎稳打。';
      } else if (ke[dayWuXing] === ganWx) {
        desc = '财星入运，求财有道期，利投资经营，忌贪多嚼不烂。';
      } else if (ke[ganWx] === dayWuXing) {
        desc = '官杀临运，事业变动期，有升迁机遇，亦须防小人压力。';
      }

      if (zhiWx === dayWuXing) desc += '地支助身，根基稳固。';
      else if (sheng[zhiWx] === dayWuXing) desc += '地支生身，暗中有助。';
      else if (ke[zhiWx] === dayWuXing) desc += '地支克身，暗藏压力。';

      return desc;
    },
    generate流年解读(流年干支, offset) {
      if (!this.result || !this.result.bazi) {
        return offset === 0 ? '今年运势平稳。' : '';
      }
      const dayGan = this.result.bazi[2].value.charAt(0);
      const dayWuXing = this.wuXing.tianGan[dayGan];
      const gan = 流年干支.charAt(0);
      const zhi = 流年干支.charAt(1);
      const ganWx = this.wuXing.tianGan[gan];
      const zhiWx = this.wuXing.diZhi[zhi];
      if (!dayWuXing || !ganWx) return '';

      const sheng = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
      const ke = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };

      let timeLabel = offset === 0 ? '今年' : offset === 1 ? '明年' : offset === -1 ? '去年' : offset > 0 ? `${offset}年后` : `${Math.abs(offset)}年前`;
      let desc = '';

      if (ganWx === dayWuXing) {
        desc = '比劫年，同辈竞争与合作并存，利合伙但防争财。';
      } else if (sheng[dayWuXing] === ganWx) {
        desc = '食伤年，才思泉涌利表达创作，但忌口舌是非。';
      } else if (sheng[ganWx] === dayWuXing) {
        desc = '印星年，利学业考试晋升，长辈贵人相助。';
      } else if (ke[dayWuXing] === ganWx) {
        desc = '财星年，求财机遇增多，但须量力而行。';
      } else if (ke[ganWx] === dayWuXing) {
        desc = '官杀年，事业有变动压力，亦有晋升契机。';
      }

      return timeLabel + '，' + desc;
    },
    calculateCompatibility() {
      const p1 = this.form2.party1
      const td1 = new Date(p1.year, p1.month - 1, p1.day)
      if (td1.getMonth() + 1 !== p1.month || td1.getDate() !== p1.day) {
        alert('甲方日期不存在，请检查输入')
        return
      }
      const p2 = this.form2.party2
      const td2 = new Date(p2.year, p2.month - 1, p2.day)
      if (td2.getMonth() + 1 !== p2.month || td2.getDate() !== p2.day) {
        alert('乙方日期不存在，请检查输入')
        return
      }
      try {
        // 计算甲方八字
        const party1Bazi = this.calculateSingleBazi(this.form2.party1);
        // 计算乙方八字
        const party2Bazi = this.calculateSingleBazi(this.form2.party2);
        
        // 计算合盘得分
        const score = this.calculateCompatibilityScore(party1Bazi, party2Bazi);
        // 生成合盘解读
        const analysis = this.generateCompatibilityAnalysis(party1Bazi, party2Bazi, score);
        
        // 生成合盘结果
        this.compatibilityResult = {
          party1: {
            bazi: party1Bazi
          },
          party2: {
            bazi: party2Bazi
          },
          score: score,
          analysis: analysis
        };
      } catch (error) {
        console.error('合盘计算错误:', error);
        // 如果计算失败，使用备用算法
        this.calculateCompatibilityFallback();
      }
    },
    calculateSingleBazi(person) {
      try {
        // 使用 lunar-calendar 库计算八字
        const lunar = LunarCalendar.solarToLunar(person.year, person.month, person.day)

        const yearGanZhi = lunar.GanZhiYear
        const monthGanZhi = lunar.GanZhiMonth
        const dayGanZhi = lunar.GanZhiDay

        // 时柱：日干起时法
        const shiChenIndex = Math.floor((person.hour + 1) % 24 / 2)
        const dayGanIndex = this.tianGan.indexOf(dayGanZhi.charAt(0))
        const shiGanStart = [0, 2, 4, 6, 8][dayGanIndex % 5]
        const hourGanZhi = this.tianGan[(shiGanStart + shiChenIndex) % 10] + this.diZhi[shiChenIndex]

        return [
          { label: '年柱', value: yearGanZhi },
          { label: '月柱', value: monthGanZhi },
          { label: '日柱', value: dayGanZhi },
          { label: '时柱', value: hourGanZhi }
        ];
      } catch (error) {
        // 备用算法
        const yearIndex = (person.year - 1900) % 60;
        const monthIndex = (person.year * 12 + person.month - 1900 * 12 - 1) % 60;
        const dayIndex = (person.year * 365 + person.month * 30 + person.day) % 60;
        const hourIndex = (person.hour * 2) % 60;
        
        return [
          { label: '年柱', value: this.liuShiJiaZi[yearIndex] },
          { label: '月柱', value: this.liuShiJiaZi[monthIndex] },
          { label: '日柱', value: this.liuShiJiaZi[dayIndex] },
          { label: '时柱', value: this.liuShiJiaZi[hourIndex] }
        ];
      }
    },
    calculateCompatibilityScore(party1Bazi, party2Bazi) {
      let score = 50;
      
      // 计算天干地支的匹配度
      for (let i = 0; i < 4; i++) {
        const p1Gan = party1Bazi[i].value.charAt(0);
        const p1Zhi = party1Bazi[i].value.charAt(1);
        const p2Gan = party2Bazi[i].value.charAt(0);
        const p2Zhi = party2Bazi[i].value.charAt(1);
        
        if (p1Gan === p2Gan) score += 5;
        if (p1Zhi === p2Zhi) score += 5;
      }
      
      // 计算五行相生相克
      const p1WuXing = this.getBaziWuXing(party1Bazi);
      const p2WuXing = this.getBaziWuXing(party2Bazi);
      
      // 五行相生加分
      if (this.wuXingSheng(p1WuXing.max, p2WuXing.max)) score += 10;
      if (this.wuXingSheng(p2WuXing.max, p1WuXing.max)) score += 10;
      
      // 五行相克减分
      if (this.wuXingKe(p1WuXing.max, p2WuXing.max)) score -= 5;
      if (this.wuXingKe(p2WuXing.max, p1WuXing.max)) score -= 5;
      
      return Math.max(0, Math.min(100, score));
    },
    
    getBaziWuXing(bazi) {
      const stats = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
      bazi.forEach(item => {
        const gan = item.value.charAt(0);
        const zhi = item.value.charAt(1);
        if (this.wuXing.tianGan[gan]) stats[this.wuXing.tianGan[gan]]++;
        if (this.wuXing.diZhi[zhi]) stats[this.wuXing.diZhi[zhi]]++;
      });
      const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]);
      return { max: sorted[0][0], stats };
    },
    
    wuXingSheng(wx1, wx2) {
      const sheng = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
      return sheng[wx1] === wx2;
    },
    
    wuXingKe(wx1, wx2) {
      const ke = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };
      return ke[wx1] === wx2;
    },
    
    generateCompatibilityAnalysis(party1Bazi, party2Bazi, score) {
      const p1DayGan = party1Bazi[2].value.charAt(0);
      const p2DayGan = party2Bazi[2].value.charAt(0);
      const p1DayWuXing = this.wuXing.tianGan[p1DayGan];
      const p2DayWuXing = this.wuXing.tianGan[p2DayGan];
      
      const p1WuXing = this.getBaziWuXing(party1Bazi);
      const p2WuXing = this.getBaziWuXing(party2Bazi);
      
      let analysis = '';
      
      if (score >= 80) {
        analysis = `【契合度】非常高。两人八字配合极佳，是难得的佳缘。\n\n`;
        analysis += `【性格互补】一方为${p1DayWuXing}性，一方为${p2DayWuXing}性，阴阳相济，性格互补。\n\n`;
        analysis += this.generateCompatibilityDetail(party1Bazi, party2Bazi, p1WuXing, p2WuXing);
      } else if (score >= 60) {
        analysis = `【契合度】较高。两人八字配合较好，相处和谐。\n\n`;
        analysis += `【性格特点】一方为${p1DayWuXing}，一方为${p2DayWuXing}，可以相互理解。\n\n`;
        analysis += this.generateCompatibilityDetail(party1Bazi, party2Bazi, p1WuXing, p2WuXing);
      } else if (score >= 40) {
        analysis = `【契合度】中等。两人八字有一定差异，需要磨合。\n\n`;
        analysis += `【性格差异】一方为${p1DayWuXing}，一方为${p2DayWuXing}，性格有所不同。\n\n`;
        analysis += this.generateCompatibilityTips(party1Bazi, party2Bazi, p1WuXing, p2WuXing);
      } else {
        analysis = `【契合度】较低。两人八字差异较大，需要更多包容。\n\n`;
        analysis += `【性格挑战】一方为${p1DayWuXing}，一方为${p2DayWuXing}，性格差异明显。\n\n`;
        analysis += this.generateCompatibilityTips(party1Bazi, party2Bazi, p1WuXing, p2WuXing);
      }
      
      return analysis;
    },
    
    generateCompatibilityDetail(party1Bazi, party2Bazi, p1WuXing, p2WuXing) {
      let detail = '【五行关系】\n';
      
      const shengRelations = [];
      const keRelations = [];
      
      ['木', '火', '土', '金', '水'].forEach(wx => {
        if (this.wuXingSheng(p1WuXing.max, wx) && p2WuXing.stats[wx] > 0) {
          shengRelations.push(`${p1WuXing.max}生${wx}`);
        }
        if (this.wuXingSheng(p2WuXing.max, wx) && p1WuXing.stats[wx] > 0) {
          shengRelations.push(`${p2WuXing.max}生${wx}`);
        }
        if (this.wuXingKe(p1WuXing.max, wx) && p2WuXing.stats[wx] > 0) {
          keRelations.push(`${p1WuXing.max}克${wx}`);
        }
        if (this.wuXingKe(p2WuXing.max, wx) && p1WuXing.stats[wx] > 0) {
          keRelations.push(`${p2WuXing.max}克${wx}`);
        }
      });
      
      if (shengRelations.length > 0) {
        detail += `相生：${shengRelations.join('、')}。这有利于互相扶持。\n`;
      }
      if (keRelations.length > 0) {
        detail += `相克：${keRelations.join('、')}。需要相互包容。\n`;
      }
      
      detail += '\n【综合建议】两人默契十足，相互欣赏，是理想的伴侣组合。';
      return detail;
    },
    
    generateCompatibilityTips(party1Bazi, party2Bazi, p1WuXing, p2WuXing) {
      let tips = '【相处建议】\n';
      
      if (this.wuXingSheng(p1WuXing.max, p2WuXing.max)) {
        tips += '一方能生助另一方，建议多倾听对方意见。\n';
      }
      if (this.wuXingKe(p1WuXing.max, p2WuXing.max)) {
        tips += '存在五行相克关系，建议多沟通理解，避免冲突。\n';
      }
      if (p1WuXing.max === p2WuXing.max) {
        tips += '两人五行属性相近，能相互理解但也可能缺乏互补。\n';
      }
      
      tips += '\n【综合建议】虽然存在差异，但通过相互理解和包容，仍可建立稳定关系。';
      return tips;
    },
    
    calculateCompatibilityFallback() {
      const party1Bazi = [
        { label: '年柱', value: this.liuShiJiaZi[(this.form2.party1.year - 1900) % 60] },
        { label: '月柱', value: this.liuShiJiaZi[(this.form2.party1.year * 12 + this.form2.party1.month - 1900 * 12 - 1) % 60] },
        { label: '日柱', value: this.liuShiJiaZi[(this.form2.party1.year * 365 + this.form2.party1.month * 30 + this.form2.party1.day) % 60] },
        { label: '时柱', value: this.liuShiJiaZi[(this.form2.party1.hour * 2) % 60] }
      ];
      
      const party2Bazi = [
        { label: '年柱', value: this.liuShiJiaZi[(this.form2.party2.year - 1900) % 60] },
        { label: '月柱', value: this.liuShiJiaZi[(this.form2.party2.year * 12 + this.form2.party2.month - 1900 * 12 - 1) % 60] },
        { label: '日柱', value: this.liuShiJiaZi[(this.form2.party2.year * 365 + this.form2.party2.month * 30 + this.form2.party2.day) % 60] },
        { label: '时柱', value: this.liuShiJiaZi[(this.form2.party2.hour * 2) % 60] }
      ];
      
      const score = this.calculateCompatibilityScore(party1Bazi, party2Bazi);
      const analysis = this.generateCompatibilityAnalysis(party1Bazi, party2Bazi, score);
      
      this.compatibilityResult = {
        party1: { bazi: party1Bazi },
        party2: { bazi: party2Bazi },
        score: score,
        analysis: analysis
      };
    }
  }
}
</script>

<style>
/* 样式已在 style.css 中定义 */
</style>