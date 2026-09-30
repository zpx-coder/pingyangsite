// 分页列表状态（任务 3.2）：各管理模块列表页共享——筛选条件 + 分页 + 加载/错误状态
// fetchFn 接收当前筛选与分页参数，返回 { total, list }（后端分页信封 { page, pageSize, total, list }）
import { reactive, ref, type Ref } from 'vue';
import { notifyError } from '@/api/http';

export interface PageResult<T> {
  total: number;
  list: T[];
}

interface PagedOptions<T, F extends object> {
  pageSize?: number;
  /** 返回列表数据；抛错时由组合式函数统一弹错误消息 */
  fetchFn: (params: { page: number; pageSize: number; filters: F }) => Promise<PageResult<T>>;
}

export function usePagedList<T, F extends object>(options: PagedOptions<T, F>) {
  const filters = reactive({}) as F;
  const list = ref<T[]>([]) as Ref<T[]>;
  const total = ref(0);
  const page = ref(1);
  const pageSize = options.pageSize ?? 20;
  const loading = ref(false);
  let requestSeq = 0;

  async function load() {
    const seq = ++requestSeq;
    loading.value = true;
    try {
      const result = await options.fetchFn({ page: page.value, pageSize, filters: { ...filters } });
      if (seq !== requestSeq) return; // 过期响应丢弃（快速切换筛选时防串页）
      list.value = result.list;
      total.value = result.total;
    } catch (error) {
      if (seq === requestSeq) notifyError(error, '列表加载失败');
    } finally {
      if (seq === requestSeq) loading.value = false;
    }
  }

  /** 查询：筛选变化后回第 1 页并刷新 */
  function search(): void {
    page.value = 1;
    void load();
  }

  /** 翻页/每页条数变化 */
  function onPageChange(next: number): void {
    page.value = next;
    void load();
  }

  return { filters, list, total, page, pageSize, loading, load, search, onPageChange };
}
