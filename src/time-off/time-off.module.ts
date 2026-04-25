import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BalancesModule } from '../balances/balances.module';
import { HcmModule } from '../hcm/hcm.module';
import { HcmCommandEntity } from './hcm-command.entity';
import { TimeOffController } from './time-off.controller';
import { TimeOffRequestEntity } from './time-off-request.entity';
import { TimeOffService } from './time-off.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TimeOffRequestEntity, HcmCommandEntity]),
    BalancesModule,
    HcmModule,
  ],
  controllers: [TimeOffController],
  providers: [TimeOffService],
  exports: [TimeOffService, TypeOrmModule],
})
export class TimeOffModule {}
