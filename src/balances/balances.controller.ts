import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { BalanceQueryDto } from './dto/balance-query.dto';
import { HcmBatchSyncDto } from './dto/hcm-batch.dto';
import { BalancesService } from './balances.service';

@Controller()
export class BalancesController {
  constructor(private readonly balancesService: BalancesService) {}

  @Get('balances')
  getBalance(@Query() query: BalanceQueryDto) {
    return this.balancesService.getBalanceView(
      query.employeeId,
      query.locationId,
      query.refresh ?? false,
    );
  }

  @Post('hcm-sync/batches')
  syncBatch(@Body() batch: HcmBatchSyncDto) {
    return this.balancesService.syncBatch(batch);
  }
}
