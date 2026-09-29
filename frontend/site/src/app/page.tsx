// 站点根路径：按语言 Cookie 重定向（PRD §5.1 语言选择持久化，无 Cookie 默认中文）
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isLang } from '@/lib/i18n';

export default async function RootPage() {
  const lang = (await cookies()).get('lang')?.value;
  redirect(isLang(lang ?? '') ? `/${lang}` : '/zh-CN');
}
