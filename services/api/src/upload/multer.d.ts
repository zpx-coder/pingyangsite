// multer 2.4.0（Nest 12 内置）未随包提供类型声明，且 @types/multer 停更于 1.x
// 与 2.x 不一致——此处按项目实际用法（diskStorage 固定目录）做最小声明。
declare module 'multer' {
  interface MulterDiskStorageOptions {
    destination: string;
  }

  function diskStorage(options: MulterDiskStorageOptions): unknown;
}
