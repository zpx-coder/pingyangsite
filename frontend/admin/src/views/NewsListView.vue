<script setup lang="ts">
// 新闻管理列表页（任务 3.7，PRD §7.4）：与原型 adminNews 一致
// 按标题关键词 + 状态筛选；表格 6 列（封面/标题/状态/发布时间/置顶/操作）；单行 编辑/发布(下线)/删除（逻辑删除二次确认）
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { usePagedList } from '@/composables/usePagedList';
import { listNews, removeNews, updateNewsStatus, type NewsView } from '@/api/news';
import { notifyError } from '@/api/http';
import { confirmDanger } from '@/utils/confirm';
import { formatDateTime } from '@/utils/format';
import StatusBadge from '@/components/StatusBadge.vue';
import PaginationBar from '@/components/PaginationBar.vue';

const router = useRouter();

interface NewsFilters {
  keyword: string;
  status: 0 | 1 | undefined;
}

const { filters, list, total, page, pageSize, loading, search, onPageChange } = usePagedList<
  NewsView,
  NewsFilters
>({
  pageSize: 20,
  fetchFn: ({ page, pageSize, filters: f }) =>
    listNews({
      page,
      pageSize,
      keyword: f.keyword || undefined,
      status: f.status,
    }),
});

onMounted(() => {
  void search();
});

const busyId = ref<number | null>(null);

function goCreate(): void {
  void router.push('/news/edit');
}

function goEdit(id: number): void {
  void router.push(`/news/edit/${id}`);
}

/** 单行发布/下线（新闻状态 0 草稿 / 1 已发布，走专用状态接口；定时发布由服务端查询时按 publishTime 判定） */
async function toggleStatus(row: NewsView): Promise<void> {
  busyId.value = row.id;
  try {
    const target: 0 | 1 = row.status === 1 ? 0 : 1;
    await updateNewsStatus(row.id, target);
    ElMessage.success(target === 1 ? '已发布' : '已下线');
    await search();
  } catch (error) {
    notifyError(error, '状态变更失败');
  } finally {
    busyId.value = null;
  }
}

async function removeRow(row: NewsView): Promise<void> {
  const ok = await confirmDanger(`确定删除新闻「${row.titleZh}」吗？删除后前台不再展示`);
  if (!ok) return;
  busyId.value = row.id;
  try {
    await removeNews(row.id);
    ElMessage.success('已删除');
    await search();
  } catch (error) {
    notifyError(error, '删除失败');
  } finally {
    busyId.value = null;
  }
}

/** 定时发布标记：已发布且发布时间在未来（到达时间后前台自动展示） */
function isScheduled(row: NewsView): boolean {
  return row.status === 1 && new Date(row.publishTime).getTime() > Date.now();
}
</script>

<template>
  <div>
    <div class="panel">
      <div class="p-body">
        <div class="filter-bar">
          <input v-model="filters.keyword" class="grow" placeholder="按新闻标题搜索" @keyup.enter="search" />
          <select v-model.number="filters.status">
            <option :value="undefined">全部状态</option>
            <option :value="1">已发布</option>
            <option :value="0">草稿</option>
          </select>
          <button class="btn btn-primary btn-sm" @click="search">查询</button>
          <div class="spacer"></div>
          <button class="btn btn-primary btn-sm" @click="goCreate">＋ 新增新闻</button>
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
              <th style="width: 110px">封面</th>
              <th>新闻标题</th>
              <th>状态</th>
              <th>发布时间</th>
              <th>置顶</th>
              <th style="width: 150px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in list" :key="row.id">
              <td>
                <div class="thumb wide"><img v-if="row.coverUrl" :src="row.coverUrl" alt="" loading="lazy" /><span v-else>—</span></div>
              </td>
              <td><b>{{ row.titleZh }}</b><span v-if="row.titleEn" class="name-en">{{ row.titleEn }}</span></td>
              <td><StatusBadge kind="news" :value="row.status" /></td>
              <td>
                {{ formatDateTime(row.publishTime) }}
                <span v-if="isScheduled(row)" class="sched">定时</span>
              </td>
              <td>
                <span v-if="row.isTop" class="badge badge-amber">置顶</span>
                <span v-else class="badge badge-gray">否</span>
              </td>
              <td>
                <div class="ops">
                  <span class="link" @click="goEdit(row.id)">编辑</span>
                  <span class="link" :class="{ 'link-busy': busyId === row.id }" @click="toggleStatus(row)">
                    {{ row.status === 1 ? '下线' : '发布' }}
                  </span>
                  <span class="link danger" @click="removeRow(row)">删除</span>
                </div>
              </td>
            </tr>
            <tr v-if="list.length === 0">
              <td colspan="6" style="text-align: center; color: var(--muted); padding: 40px">暂无新闻数据</td>
            </tr>
          </tbody>
        </table>
        <PaginationBar v-model:page="page" :page-size="pageSize" :total="total" @update:page="onPageChange" />
      </template>
    </div>
  </div>
</template>

<style scoped>
/* 封面 90×60 横版缩略图（原型 adminNews） */
.thumb.wide {
  width: 90px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}
.thumb.wide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
/* 定时发布标记 */
.sched {
  margin-left: 6px;
  padding: 1px 7px;
  border-radius: 4px;
  font-size: 11px;
  color: #b46a00;
  background: #fdf3e3;
  border: 1px solid #f3ddb6;
}
</style>
