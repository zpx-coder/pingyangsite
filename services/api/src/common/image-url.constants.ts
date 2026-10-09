// 图片地址校验公共规则（2026-10-09 缺陷修复）：
// 演示数据封面/主图/图集/荣誉图使用站内相对路径（/img/*.jpg，官网 public 静态资源同源直读），
// 原 IsUrl(require_protocol) 会拦截此类值，导致后台编辑演示记录保存报「地址格式不正确」。
// 合法值 = http/https 绝对地址（本地上传与 OSS 上传返回值），或单斜杠开头的站内相对路径。
// 拒绝无协议裸域名（example.com/a.jpg）与协议相对地址（//cdn.example.com/a.jpg）。
export const IMAGE_URL_PATTERN = /^(\/(?!\/)[^\s]*|https?:\/\/[^\s]+)$/;
