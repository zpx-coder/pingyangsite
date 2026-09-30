<script setup lang="ts">
// 询盘管理列表页（任务 3.9，PRD §7.5）：与原型 adminInquiries 一致 + PRD 来源语言列
// 统计卡片（总数/未处理/今日/本周）→ 筛选（状态/产品·企业关键词/提交时间范围）→ 表格（勾选+11 列）
// → 单行标记 + 批量标记 + 详情弹窗（留言全文/产品·企业跳转）+ 导出 Excel（当前筛选结果）
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { usePagedList } from '@/composables/usePagedList';
import {
  batchInquiries,
  exportInquiries,
  getInquiryStats,
  listInquiries,
  updateInquiryStatus,
  type InquiryStats,
  type InquiryView,
} from '@/api/inquiries';
import { notifyError } from '@/api/http';
import { confirmDanger } from '@/utils/confirm';
import { formatDateTime } from '@/utils/format';
import StatusBadge from '@/components/StatusBadge.vue';
import PaginationBar from '@/components/PaginationBar.vue';

const router = useRouter();

interface InquiryFilters {
  status: 0 | 1 | undefined;
  keyword: string;
  startDate: string;
  endDate: string;
}

const { filters, list, total, page, pageSize, loading, search, onPageChange } = usePagedList<
  InquiryView,
  InquiryFilters
>({
  pageSize: 20,
  fetchFn: ({ page, pageSize, filters: f }) =>
    listInquiries({
      page,
      pageSize,
      status: f.status,
      keyword: f.keyword || undefined,
      startDate: f.startDate || undefined,
      endDate: f.endDate || undefined,
    }),
});

// ---- 统计卡片（加载失败不阻塞列表） ----
const stats = reactive<InquiryStats>({ total: 0, pending: 0, today: 0, week: 0 });

async function loadStats(): Promise<void> {
  try {
    const s = await getInquiryStats();
    stats.total = s.total;
    stats.pending = s.pending;
    stats.today = s.today;
    stats.week = s.week;
  } catch {
    // 统计加载失败保留上次值，不打扰列表使用
  }
}

onMounted(() => {
  void search();
  void loadStats();
});

// ---- 勾选（原型 .row-check + 全选） ----
const checkedIds = ref<number[]>([]);
const allChecked = computed({
  get: () => list.value.length > 0 && list.value.every((row) => checkedIds.value.includes(row.id)),
  set: (checked: boolean) => {
    checkedIds.value = checked ? list.value.map((row) => row.id) : [];
  },
});

function toggleCheck(id: number): void {
  const index = checkedIds.value.indexOf(id);
  if (index >= 0) {
    checkedIds.value.splice(index, 1);
  } else {
    checkedIds.value.push(id);
  }
}

const busyId = ref<number | null>(null);

async function toggleStatus(row: InquiryView): Promise<void> {
  busyId.value = row.id;
  try {
    const target: 0 | 1 = row.status === 1 ? 0 : 1;
    await updateInquiryStatus(row.id, target);
    ElMessage.success(target === 1 ? '已标记为已处理' : '已标记为未处理');
    await search();
    void loadStats();
  } catch (error) {
    notifyError(error, '状态变更失败');
  } finally {
    busyId.value = null;
  }
}

/** 批量标记（原型 batchInq：未勾选即时提示） */
async function batch(action: 'process' | 'unprocess'): Promise<void> {
  if (checkedIds.value.length === 0) {
    ElMessage.warning('请先勾选询盘');
    return;
  }
  const label = action === 'process' ? '已处理' : '未处理';
  const ok = await confirmDanger(`确定将选中的 ${checkedIds.value.length} 条询盘批量标记为「${label}」吗？`);
  if (!ok) return;
  try {
    const { count } = await batchInquiries([...checkedIds.value], action);
    ElMessage.success(`已批量标记 ${count} 条为「${label}」`);
    checkedIds.value = [];
    await search();
    void loadStats();
  } catch (error) {
    notifyError(error, '批量操作失败');
  }
}

/** 导出当前筛选结果为 Excel（blob 下载；文件名与后端 Content-Disposition 对应） */
async function exportExcel(): Promise<void> {
  try {
    const blob = await exportInquiries({
      status: filters.status,
      keyword: filters.keyword || undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
    });
    const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `询盘导出_${dateStamp}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    ElMessage.success('已导出 Excel');
  } catch (error) {
    notifyError(error, '导出失败');
  }
}

// ---- 详情弹窗 ----
const dialogVisible = ref(false);
const detail = ref<InquiryView | null>(null);

function openDetail(row: InquiryView): void {
  detail.value = row;
  dialogVisible.value = true;
}

async function toggleDetailStatus(): Promise<void> {
  if (!detail.value) return;
  busyId.value = detail.value.id;
  try {
    const target: 0 | 1 = detail.value.status === 1 ? 0 : 1;
    const updated = await updateInquiryStatus(detail.value.id, target);
    detail.value = updated;
    ElMessage.success(target === 1 ? '已标记为已处理' : '已标记为未处理');
    await search();
    void loadStats();
  } catch (error) {
    notifyError(error, '状态变更失败');
  } finally {
    busyId.value = null;
  }
}

/** 产品/企业快照跳转（仅有关联 id 时展示为链接） */
function goProduct(id: number | null): void {
  if (id !== null) void router.push(`/products/edit/${id}`);
}

function goCompany(id: number | null): void {
  if (id !== null) void router.push(`/companies/edit/${id}`);
}

function langLabel(lang: string): string {
  return lang === 'en' ? 'English' : '中文';
}
</script>

<template>
  <div>
    <!-- 统计卡片（原型 .stat-row：询盘总数/未处理/今日新增/本周新增） -->
    <div class="stat-row" style="grid-template-columns: repeat(4, 1fr)">
      <div class="stat-card">
        <div><div class="num">{{ stats.total }}</div><div class="lbl">询盘总数</div></div>
        <div class="ic" style="background: #e8f0f8">✉️</div>
      </div>
      <div class="stat-card">
        <div><div class="num">{{ stats.pending }}</div><div class="lbl">未处理</div></div>
        <div class="ic" style="background: #fdecec">⏳</div>
      </div>
      <div class="stat-card">
        <div><div class="num">{{ stats.today }}</div><div class="lbl">今日新增</div></div>
        <div class="ic" style="background: #e8f7ee">📈</div>
      </div>
      <div class="stat-card">
        <div><div class="num">{{ stats.week }}</div><div class="lbl">本周新增</div></div>
        <div class="ic" style="background: #fef3c7">📅</div>
      </div>
    </div>

    <div class="panel">
      <div class="p-body">
        <div class="filter-bar">
          <select v-model.number="filters.status">
            <option :value="undefined">全部状态</option>
            <option :value="0">未处理</option>
            <option :value="1">已处理</option>
          </select>
          <input v-model="filters.keyword" class="grow" placeholder="按产品/企业名称搜索" @keyup.enter="search" />
          <input v-model="filters.startDate" type="date" />
          <span style="color: var(--muted)">至</span>
          <input v-model="filters.endDate" type="date" />
          <button class="btn btn-primary btn-sm" @click="search">查询</button>
          <div class="spacer"></div>
          <button class="btn btn-ghost btn-sm" @click="batch('process')">批量标记已处理</button>
          <button class="btn btn-ghost btn-sm" @click="batch('unprocess')">批量标记未处理</button>
          <button class="btn btn-primary btn-sm" @click="exportExcel">⬇ 导出 Excel</button>
        </div>
      </div>
    </div>

    <div class="panel">
      <div v-if="loading" class="p-body" style="padding: 40px; text-align: center; color: var(--muted)">
        加载中…
      </div>
      <template v-else>
        <table class="table">
          <thead>
            <tr>
              <th style="width: 36px"><input type="checkbox" :checked="allChecked" @change="allChecked = ($event.target as HTMLInputElement).checked" /></th>
              <th style="white-space: nowrap">提交时间</th>
              <th>产品</th>
              <th>企业</th>
              <th>客户姓名</th>
              <th>国家/地区</th>
              <th>邮箱</th>
              <th>电话</th>
              <th>留言摘要</th>
              <th>来源语言</th>
              <th>状态</th>
              <th style="width: 150px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in list" :key="row.id">
              <td><input type="checkbox" :checked="checkedIds.includes(row.id)" @change="toggleCheck(row.id)" /></td>
              <td style="white-space: nowrap">{{ formatDateTime(row.createdAt) }}</td>
              <td>
                <span v-if="row.productId !== null" class="link" @click="goProduct(row.productId)">{{ row.productNameSnapshot }}</span>
                <span v-else class="muted-dash">—</span>
              </td>
              <td>
                <span v-if="row.companyId !== null" class="link" @click="goCompany(row.companyId)">{{ row.companyNameSnapshot }}</span>
                <span v-else class="muted-dash">—</span>
              </td>
              <td>{{ row.name }}</td>
              <td>{{ row.country ?? '—' }}</td>
              <td>{{ row.email ?? '—' }}</td>
              <td style="white-space: nowrap">{{ row.phone ?? '—' }}</td>
              <td><span class="sum" style="max-width: 150px">{{ row.content }}</span></td>
              <td>{{ langLabel(row.lang) }}</td>
              <td><StatusBadge kind="inquiry" :value="row.status" /></td>
              <td>
                <div class="ops">
                  <span class="link" @click="openDetail(row)">查看</span>
                  <span class="link" :class="{ 'link-busy': busyId === row.id }" @click="toggleStatus(row)">
                    标记{{ row.status === 1 ? '未处理' : '已处理' }}
                  </span>
                </div>
              </td>
            </tr>
            <tr v-if="list.length === 0">
              <td colspan="12" style="text-align: center; color: var(--muted); padding: 40px">暂无询盘数据</td>
            </tr>
          </tbody>
        </table>
        <PaginationBar v-model:page="page" :page-size="pageSize" :total="total" @update:page="onPageChange" />
      </template>
    </div>

    <!-- 详情弹窗（原型 showInquiryModal：全部字段 + 留言全文 + 产品/企业跳转） -->
    <el-dialog v-model="dialogVisible" :title="detail ? `询盘详情 #${detail.id}` : '询盘详情'" width="640" :close-on-click-modal="false">
      <div v-if="detail" class="inq-detail">
        <table class="spec-table">
          <tr><th>提交时间</th><td>{{ formatDateTime(detail.createdAt) }}</td></tr>
          <tr>
            <th>产品</th>
            <td>
              <span v-if="detail.productId !== null" class="link" @click="goProduct(detail.productId)">{{ detail.productNameSnapshot }}</span>
              <span v-else>—</span>
            </td>
          </tr>
          <tr>
            <th>企业</th>
            <td>
              <span v-if="detail.companyId !== null" class="link" @click="goCompany(detail.companyId)">{{ detail.companyNameSnapshot }}</span>
              <span v-else>—</span>
            </td>
          </tr>
          <tr><th>客户姓名</th><td>{{ detail.name }}</td></tr>
          <tr><th>客户公司</th><td>{{ detail.companyName ?? '—' }}</td></tr>
          <tr><th>国家/地区</th><td>{{ detail.country ?? '—' }}</td></tr>
          <tr><th>邮箱</th><td>{{ detail.email ?? '—' }}</td></tr>
          <tr><th>电话/WhatsApp</th><td>{{ detail.phone ?? '—' }}</td></tr>
          <tr><th>来源语言</th><td>{{ langLabel(detail.lang) }}</td></tr>
          <tr><th>状态</th><td><StatusBadge kind="inquiry" :value="detail.status" /></td></tr>
        </table>
        <div class="inq-content-label">询盘内容</div>
        <div class="inq-content">{{ detail.content }}</div>
      </div>
      <template #footer>
        <button class="btn btn-ghost" @click="dialogVisible = false">关闭</button>
        <button class="btn btn-primary" :disabled="busyId === detail?.id" @click="toggleDetailStatus">
          {{ detail?.status === 1 ? '标记为未处理' : '标记为已处理' }}
        </button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
/* 详情弹窗字段表（原型 .spec-table 两列键值表） */
.spec-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}
.spec-table th {
  width: 110px;
  text-align: left;
  color: var(--muted);
  font-weight: 400;
  padding: 6px 10px;
  background: #f7fafd;
  border: 1px solid var(--line);
}
.spec-table td {
  padding: 6px 10px;
  border: 1px solid var(--line);
  word-break: break-all;
}
.inq-content-label {
  margin: 14px 0 6px;
  font-size: 13px;
  color: #33475b;
}
.inq-content {
  background: #f7fafd;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 13.5px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-all;
}
.muted-dash {
  color: var(--muted);
}
</style>
