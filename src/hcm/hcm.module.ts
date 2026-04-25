import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HcmClient } from './hcm.client';

@Module({
  imports: [
    HttpModule.register({
      timeout: 1500,
    }),
  ],
  providers: [HcmClient],
  exports: [HcmClient],
})
export class HcmModule {}
