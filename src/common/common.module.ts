import { Global, Module } from '@nestjs/common';
import { KeyedMutexService } from './keyed-mutex.service';

@Global()
@Module({
  providers: [KeyedMutexService],
  exports: [KeyedMutexService],
})
export class CommonModule {}
