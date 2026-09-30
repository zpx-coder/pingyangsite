// 确认弹窗（任务 3.2）：ElMessageBox 二次确认统一封装——删除/批量操作必过确认（PRD §7.1/7.3）
import { ElMessageBox } from 'element-plus';

/**
 * 危险操作二次确认；返回 true 表示用户确认执行。
 * PRD 要求批量删除二次确认、类目删除保护提示等场景复用。
 */
export async function confirmDanger(message: string, title = '操作确认'): Promise<boolean> {
  try {
    await ElMessageBox.confirm(message, title, {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning',
    });
    return true;
  } catch {
    return false; // 取消 / 关闭
  }
}
