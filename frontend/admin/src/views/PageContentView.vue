<script setup lang="ts">
// 页面内容管理（任务 3.8，PRD §7.4.2）：与原型 adminPages 一致
// 左栏配置项列表（.page-keys/.pk）+ 右栏选中项编辑表单；保存经 PUT /admin/pages/:key，服务端刷新缓存官网即时生效；
// 英文字段留空保存自动翻译（.auto-field）；宣传图 1–5 张每张含图片/主副标语/按钮文案双语
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { listPages, savePage, type PageContentItem, type PageContentKey } from '@/api/pages';
import { notifyError } from '@/api/http';
import { formatDateTime } from '@/utils/format';
import ImageUploader from '@/components/ImageUploader.vue';
import VideoUploader from '@/components/VideoUploader.vue';
import RichEditor from '@/components/RichEditor.vue';

const KEY_ITEMS: { key: PageContentKey; icon: string; label: string }[] = [
  { key: 'home_banner', icon: '🖼️', label: '首页宣传图（轮播）' },
  { key: 'home_about', icon: '🏠', label: '首页「关于平阳」模块' },
  { key: 'about_page', icon: '🏞️', label: '平阳介绍页' },
  { key: 'contact_info', icon: '✉️', label: '联系我们' },
  { key: 'footer_info', icon: '©️', label: '页脚信息' },
];

const activeKey = ref<PageContentKey>('home_banner');

interface BannerImageForm {
  image: string;
  titleZh: string;
  titleEn: string;
  subtitleZh: string;
  subtitleEn: string;
  buttonTextZh: string;
  buttonTextEn: string;
}

interface BannerForm {
  images: BannerImageForm[];
  interval: number;
}

interface HomeAboutForm {
  image: string;
  titleZh: string;
  titleEn: string;
  summaryZh: string;
  summaryEn: string;
}

interface AboutPageForm {
  bannerImage: string;
  videoUrl: string;
  contentZh: string;
  contentEn: string;
}

interface ContactForm {
  phone: string;
  email: string;
  addressZh: string;
  addressEn: string;
  workHoursZh: string;
  workHoursEn: string;
  mapCoordinate: string;
}

interface FooterForm {
  icp: string;
  copyrightZh: string;
  copyrightEn: string;
}

const BANNER_INTERVAL_MIN = 2;
const BANNER_INTERVAL_MAX = 30;
const BANNER_MAX_COUNT = 5;

const forms = reactive({
  home_banner: { images: [], interval: 5 } as BannerForm,
  home_about: { image: '', titleZh: '', titleEn: '', summaryZh: '', summaryEn: '' } as HomeAboutForm,
  about_page: { bannerImage: '', videoUrl: '', contentZh: '', contentEn: '' } as AboutPageForm,
  contact_info: {
    phone: '',
    email: '',
    addressZh: '',
    addressEn: '',
    workHoursZh: '',
    workHoursEn: '',
    mapCoordinate: '',
  } as ContactForm,
  footer_info: { icp: '', copyrightZh: '', copyrightEn: '' } as FooterForm,
});

/** 各配置项最近保存时间（p-head 右角展示，验证「保存即时生效」链路） */
const updatedAts = reactive<Record<PageContentKey, string>>({
  home_banner: '',
  home_about: '',
  about_page: '',
  contact_info: '',
  footer_info: '',
});

/** 后端 config 字段回填表单（machineFields 仅供翻译标记用，编辑表单不展示） */
function fill(item: PageContentItem): void {
  const c = item.config;
  const str = (v: unknown): string => (typeof v === 'string' ? v : '');
  updatedAts[item.key] = item.updatedAt;
  if (item.key === 'home_banner') {
    const images = Array.isArray(c.images) ? (c.images as unknown as BannerImageForm[]) : [];
    forms.home_banner.images = images.map((b) => ({
      image: str(b?.image),
      titleZh: str(b?.titleZh),
      titleEn: str(b?.titleEn),
      subtitleZh: str(b?.subtitleZh),
      subtitleEn: str(b?.subtitleEn),
      buttonTextZh: str(b?.buttonTextZh),
      buttonTextEn: str(b?.buttonTextEn),
    }));
    const interval = typeof c.interval === 'number' && Number.isFinite(c.interval) ? c.interval : 5;
    forms.home_banner.interval = Math.min(BANNER_INTERVAL_MAX, Math.max(BANNER_INTERVAL_MIN, Math.floor(interval)));
    return;
  }
  if (item.key === 'home_about') {
    forms.home_about = { image: str(c.image), titleZh: str(c.titleZh), titleEn: str(c.titleEn), summaryZh: str(c.summaryZh), summaryEn: str(c.summaryEn) };
    return;
  }
  if (item.key === 'about_page') {
    forms.about_page = { bannerImage: str(c.bannerImage), videoUrl: str(c.videoUrl), contentZh: str(c.contentZh), contentEn: str(c.contentEn) };
    return;
  }
  if (item.key === 'contact_info') {
    forms.contact_info = {
      phone: str(c.phone),
      email: str(c.email),
      addressZh: str(c.addressZh),
      addressEn: str(c.addressEn),
      workHoursZh: str(c.workHoursZh),
      workHoursEn: str(c.workHoursEn),
      mapCoordinate: str(c.mapCoordinate),
    };
    return;
  }
  forms.footer_info = { icp: str(c.icp), copyrightZh: str(c.copyrightZh), copyrightEn: str(c.copyrightEn) };
}

async function load(): Promise<void> {
  try {
    const items = await listPages();
    for (const item of items) fill(item);
  } catch (error) {
    notifyError(error, '加载页面内容失败');
  }
}

onMounted(() => {
  void load();
});

const saving = ref(false);

function buildConfig(key: PageContentKey): Record<string, unknown> {
  if (key === 'home_banner') {
    const interval = Math.min(
      BANNER_INTERVAL_MAX,
      Math.max(BANNER_INTERVAL_MIN, Number.isFinite(Number(forms.home_banner.interval)) ? Math.floor(Number(forms.home_banner.interval)) : 5),
    );
    return { images: forms.home_banner.images.map((b) => ({ ...b })), interval };
  }
  return { ...forms[key] };
}

async function save(): Promise<void> {
  if (saving.value) return;
  const key = activeKey.value;
  if (key === 'home_banner') {
    if (forms.home_banner.images.length === 0) {
      ElMessage.warning('至少保留 1 张宣传图');
      return;
    }
    const missing = forms.home_banner.images.findIndex((b) => !b.image.trim());
    if (missing >= 0) {
      ElMessage.warning(`第 ${missing + 1} 张宣传图缺少图片`);
      return;
    }
  }
  saving.value = true;
  try {
    const saved = await savePage(key, buildConfig(key));
    fill(saved);
    ElMessage.success('已保存，官网即时生效');
  } catch (error) {
    notifyError(error, '保存失败');
  } finally {
    saving.value = false;
  }
}

function addBanner(): void {
  if (forms.home_banner.images.length >= BANNER_MAX_COUNT) {
    ElMessage.warning(`首页宣传图最多 ${BANNER_MAX_COUNT} 张`);
    return;
  }
  forms.home_banner.images.push({ image: '', titleZh: '', titleEn: '', subtitleZh: '', subtitleEn: '', buttonTextZh: '', buttonTextEn: '' });
}

function removeBanner(index: number): void {
  forms.home_banner.images.splice(index, 1);
}
</script>

<template>
  <div>
    <div class="alert">💡 页面内容保存后官网即时生效（CDN 缓存刷新）；文案字段按双语方案自动翻译。</div>
    <div class="pages-layout">
      <div class="page-keys">
        <div v-for="item in KEY_ITEMS" :key="item.key" class="pk" :class="{ on: activeKey === item.key }" @click="activeKey = item.key">
          <span>{{ item.icon }}</span>{{ item.label }}
        </div>
      </div>

      <div>
        <!-- 首页宣传图（轮播） -->
        <div v-if="activeKey === 'home_banner'" class="panel">
          <div class="p-head">
            <h3>首页宣传图（轮播）</h3>
            <span class="badge badge-gray">配置项 key：home_banner</span>
            <span class="p-updated">最近保存 {{ formatDateTime(updatedAts.home_banner) }}</span>
          </div>
          <div class="p-body">
            <div class="form-tip">宣传图 1–5 张，建议 16:9、≥ 1920×800；官网按序自动轮播（默认 5 秒/张），鼠标悬停暂停</div>
            <div v-for="(b, i) in forms.home_banner.images" :key="i" class="banner-card">
              <div class="banner-card-head">
                <b>宣传图 {{ i + 1 }}</b>
                <span v-if="forms.home_banner.images.length > 1" class="link danger" @click="removeBanner(i)">删除本张</span>
              </div>
              <div class="banner-grid">
                <div class="form-group">
                  <label>图片</label>
                  <ImageUploader v-model="b.image" scope="content" :size="120" :width="160" tip="上传图片" />
                </div>
                <div class="form-group">
                  <label>主标语（中文）</label>
                  <input v-model="b.titleZh" maxlength="200" placeholder="如：聚焦特色产业集群，链接全球贸易商机" />
                </div>
                <div class="form-group">
                  <label>主标语（英文）</label>
                  <input v-model="b.titleEn" class="auto-field" maxlength="200" placeholder="留空保存时自动翻译" />
                </div>
                <div class="form-group">
                  <label>副标语（中文）</label>
                  <input v-model="b.subtitleZh" maxlength="200" placeholder="如：山海之城 · 制造之都" />
                </div>
                <div class="form-group">
                  <label>副标语（英文）</label>
                  <input v-model="b.subtitleEn" class="auto-field" maxlength="200" placeholder="留空保存时自动翻译" />
                </div>
                <div class="form-group">
                  <label>按钮文案（中文）</label>
                  <input v-model="b.buttonTextZh" maxlength="50" placeholder="如：了解平阳" />
                </div>
                <div class="form-group">
                  <label>按钮文案（英文）</label>
                  <input v-model="b.buttonTextEn" class="auto-field" maxlength="50" placeholder="留空保存时自动翻译" />
                </div>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>轮播间隔（秒）</label>
                <input v-model.number="forms.home_banner.interval" type="number" :min="BANNER_INTERVAL_MIN" :max="BANNER_INTERVAL_MAX" style="width: 140px" />
                <div class="form-tip">2–30 秒，保存时自动校正到区间内</div>
              </div>
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end">
              <button class="btn btn-ghost" @click="addBanner">＋ 添加图片</button>
              <button class="btn btn-primary" :disabled="saving" @click="save">保存</button>
            </div>
          </div>
        </div>

        <!-- 首页「关于平阳」模块 -->
        <div v-else-if="activeKey === 'home_about'" class="panel">
          <div class="p-head">
            <h3>首页「关于平阳」模块</h3>
            <span class="badge badge-gray">配置项 key：home_about</span>
            <span class="p-updated">最近保存 {{ formatDateTime(updatedAts.home_about) }}</span>
          </div>
          <div class="p-body">
            <div class="form-group">
              <label>图片</label>
              <ImageUploader v-model="forms.home_about.image" scope="content" :size="130" :width="200" tip="上传图片" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>标题（中文）</label>
                <input v-model="forms.home_about.titleZh" maxlength="200" placeholder="如：关于平阳" />
              </div>
              <div class="form-group">
                <label>标题（英文）</label>
                <input v-model="forms.home_about.titleEn" class="auto-field" maxlength="200" placeholder="留空保存时自动翻译" />
              </div>
            </div>
            <div class="form-group">
              <label>摘要文案（中文）</label>
              <textarea v-model="forms.home_about.summaryZh" maxlength="500" rows="3" placeholder="首页关于平阳模块摘要"></textarea>
            </div>
            <div class="form-group">
              <label>摘要文案（英文）</label>
              <textarea v-model="forms.home_about.summaryEn" class="auto-field" maxlength="500" rows="3" placeholder="留空保存时自动翻译"></textarea>
            </div>
            <div style="text-align: right">
              <button class="btn btn-primary" :disabled="saving" @click="save">保存</button>
            </div>
          </div>
        </div>

        <!-- 平阳介绍页 -->
        <div v-else-if="activeKey === 'about_page'" class="panel">
          <div class="p-head">
            <h3>平阳介绍页</h3>
            <span class="badge badge-gray">配置项 key：about_page</span>
            <span class="p-updated">最近保存 {{ formatDateTime(updatedAts.about_page) }}</span>
          </div>
          <div class="p-body">
            <div class="form-row">
              <div class="form-group">
                <label>横幅图</label>
                <ImageUploader v-model="forms.about_page.bannerImage" scope="content" :size="110" :width="200" tip="上传横幅" />
              </div>
              <div class="form-group">
                <label>介绍视频（OSS）</label>
                <VideoUploader v-model="forms.about_page.videoUrl" />
              </div>
            </div>
            <div class="form-group">
              <label>正文（中文 · 富文本）</label>
              <RichEditor v-model="forms.about_page.contentZh" scope="content" :min-height="220" placeholder="请输入平阳介绍正文" />
            </div>
            <div class="form-group">
              <label>正文（英文 · 富文本）</label>
              <RichEditor v-model="forms.about_page.contentEn" scope="content" :min-height="220" placeholder="留空保存时自动翻译" />
              <div class="form-tip">英文正文留空时保存自动翻译</div>
            </div>
            <div style="text-align: right">
              <button class="btn btn-primary" :disabled="saving" @click="save">保存</button>
            </div>
          </div>
        </div>

        <!-- 联系我们 -->
        <div v-else-if="activeKey === 'contact_info'" class="panel">
          <div class="p-head">
            <h3>联系我们</h3>
            <span class="badge badge-gray">配置项 key：contact_info</span>
            <span class="p-updated">最近保存 {{ formatDateTime(updatedAts.contact_info) }}</span>
          </div>
          <div class="p-body">
            <div class="form-row">
              <div class="form-group">
                <label>联系电话</label>
                <input v-model="forms.contact_info.phone" maxlength="50" placeholder="如 0577-6372 8888" />
              </div>
              <div class="form-group">
                <label>电子邮箱</label>
                <input v-model="forms.contact_info.email" maxlength="255" placeholder="如 info@pycy.example.com" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>地址（中文）</label>
                <input v-model="forms.contact_info.addressZh" maxlength="500" />
              </div>
              <div class="form-group">
                <label>地址（英文）</label>
                <input v-model="forms.contact_info.addressEn" class="auto-field" maxlength="500" placeholder="留空保存时自动翻译" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>工作时间（中文）</label>
                <input v-model="forms.contact_info.workHoursZh" maxlength="100" />
              </div>
              <div class="form-group">
                <label>工作时间（英文）</label>
                <input v-model="forms.contact_info.workHoursEn" class="auto-field" maxlength="100" placeholder="留空保存时自动翻译" />
              </div>
            </div>
            <div class="form-group">
              <label>地图坐标（预留）</label>
              <input v-model="forms.contact_info.mapCoordinate" maxlength="100" placeholder="如：120.5657, 27.6619（首期静态图占位，后续接入地图 API）" />
            </div>
            <div style="text-align: right">
              <button class="btn btn-primary" :disabled="saving" @click="save">保存</button>
            </div>
          </div>
        </div>

        <!-- 页脚信息 -->
        <div v-else class="panel">
          <div class="p-head">
            <h3>页脚信息</h3>
            <span class="badge badge-gray">配置项 key：footer_info</span>
            <span class="p-updated">最近保存 {{ formatDateTime(updatedAts.footer_info) }}</span>
          </div>
          <div class="p-body">
            <div class="form-group">
              <label>ICP 备案号</label>
              <input v-model="forms.footer_info.icp" maxlength="100" placeholder="如：浙ICP备XXXXXXXX号" />
              <div class="form-tip">⚠ 上线前必须替换为真实备案号</div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>版权文字（中文）</label>
                <input v-model="forms.footer_info.copyrightZh" maxlength="200" />
              </div>
              <div class="form-group">
                <label>版权文字（英文）</label>
                <input v-model="forms.footer_info.copyrightEn" class="auto-field" maxlength="200" placeholder="留空保存时自动翻译" />
              </div>
            </div>
            <div style="text-align: right">
              <button class="btn btn-primary" :disabled="saving" @click="save">保存</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 最近保存时间（p-head 右角） */
.p-updated {
  margin-left: auto;
  color: var(--muted);
  font-size: 12px;
  font-weight: 400;
}
/* 宣传图卡片（原型 .form-row 180px 1fr 1fr 布局的纵向化） */
.banner-card {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 14px;
  background: #fbfdff;
}
.banner-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-size: 13.5px;
}
.banner-grid {
  display: grid;
  grid-template-columns: 180px 1fr 1fr;
  gap: 10px 14px;
}
.banner-grid > :first-child {
  grid-row: span 3;
}
</style>
