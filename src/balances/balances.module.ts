import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HcmModule } from '../hcm/hcm.module';
import { TimeOffRequestEntity } from '../time-off/time-off-request.entity';
import { BalanceSnapshotEntity } from './balance-snapshot.entity';
import { BalancesController } from './balances.controller';
import { BalancesService } from './balances.service';
import { SyncBatchEntity } from './sync-batch.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BalanceSnapshotEntity,
      SyncBatchEntity,
      TimeOffRequestEntity,
    ]),
    HcmModule,
  ],
  controllers: [BalancesController],
  providers: [BalancesService],
  exports: [BalancesService, TypeOrmModule],
})
export class BalancesModule {}
