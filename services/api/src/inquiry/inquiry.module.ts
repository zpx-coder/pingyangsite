import { Module } from '@nestjs/common';
import { InquiryController } from './inquiry.controller';
import { InquiryPublicController } from './inquiry.public.controller';
import { InquiryService } from './inquiry.service';

@Module({
  controllers: [InquiryController, InquiryPublicController],
  providers: [InquiryService],
})
export class InquiryModule {}
