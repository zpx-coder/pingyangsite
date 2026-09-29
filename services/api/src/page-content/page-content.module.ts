import { Module } from '@nestjs/common';
import { PageContentController } from './page-content.controller';
import { PageContentPublicController } from './page-content.public.controller';
import { PageContentService } from './page-content.service';

@Module({
  controllers: [PageContentController, PageContentPublicController],
  providers: [PageContentService],
})
export class PageContentModule {}
