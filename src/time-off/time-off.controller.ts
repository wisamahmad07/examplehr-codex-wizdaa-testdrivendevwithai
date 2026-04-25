import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CreateTimeOffRequestDto } from './dto/create-time-off-request.dto';
import { RequestDecisionDto } from './dto/request-decision.dto';
import { TimeOffService } from './time-off.service';

@Controller('time-off-requests')
export class TimeOffController {
  constructor(private readonly timeOffService: TimeOffService) {}

  @Post()
  createRequest(@Body() input: CreateTimeOffRequestDto) {
    return this.timeOffService.createRequest(input);
  }

  @Get()
  listRequests(
    @Query('employeeId') employeeId?: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.timeOffService.listRequests(employeeId, locationId);
  }

  @Get(':id')
  getRequest(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.timeOffService.getRequest(id);
  }

  @Post(':id/approve')
  approveRequest(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: RequestDecisionDto,
  ) {
    return this.timeOffService.approveRequest(id, input);
  }

  @Post(':id/reject')
  rejectRequest(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: RequestDecisionDto,
  ) {
    return this.timeOffService.rejectRequest(id, input);
  }

  @Post(':id/cancel')
  cancelRequest(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: RequestDecisionDto,
  ) {
    return this.timeOffService.cancelRequest(id, input);
  }

  @Post(':id/reconcile')
  reconcileRequest(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: RequestDecisionDto,
  ) {
    return this.timeOffService.reconcileRequest(id, input);
  }
}
