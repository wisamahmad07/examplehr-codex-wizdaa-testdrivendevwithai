import {
  Body,
  Controller,
  Get,
  HttpException,
  Injectable,
  Module,
  Param,
  Post,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';

type BookingBehavior = 'success' | 'timeoutAfterApply' | 'rejectInvalid';

interface BookingRequest {
  idempotencyKey: string;
  employeeId: string;
  locationId: string;
  amountDays: number;
}

interface BookingResponse {
  bookingId: string;
  employeeId: string;
  locationId: string;
  remainingBalanceDays: number;
  bookedAt: string;
}

@Injectable()
class HcmMockState {
  private readonly balances = new Map<string, number>();
  private readonly bookingBehaviors = new Map<string, BookingBehavior>();
  private readonly bookingResponses = new Map<string, BookingResponse>();

  private toKey(employeeId: string, locationId: string) {
    return `${employeeId}:${locationId}`;
  }

  seedBalance(employeeId: string, locationId: string, balanceDays: number) {
    this.balances.set(this.toKey(employeeId, locationId), balanceDays);
  }

  adjustBalance(employeeId: string, locationId: string, deltaDays: number) {
    const key = this.toKey(employeeId, locationId);
    const current = this.balances.get(key);
    if (current === undefined) {
      throw new Error(`Missing balance for ${key}`);
    }

    this.balances.set(key, Number((current + deltaDays).toFixed(3)));
  }

  setBookingBehavior(idempotencyKey: string, behavior: BookingBehavior) {
    this.bookingBehaviors.set(idempotencyKey, behavior);
  }

  getBalance(employeeId: string, locationId: string) {
    const key = this.toKey(employeeId, locationId);
    const balanceDays = this.balances.get(key);
    if (balanceDays === undefined) {
      throw new HttpException(
        {
          code: 'INVALID_DIMENSION',
          message: 'Unknown employee/location combination',
        },
        422,
      );
    }

    return {
      employeeId,
      locationId,
      balanceDays,
      asOf: new Date().toISOString(),
    };
  }

  async book(body: BookingRequest): Promise<BookingResponse> {
    const existing = this.bookingResponses.get(body.idempotencyKey);
    if (existing) {
      return existing;
    }

    const behavior =
      this.bookingBehaviors.get(body.idempotencyKey) ?? 'success';
    if (behavior === 'rejectInvalid') {
      throw new HttpException(
        {
          code: 'INVALID_DIMENSION',
          message: 'Invalid employee/location combination',
        },
        422,
      );
    }

    const key = this.toKey(body.employeeId, body.locationId);
    const currentBalance = this.balances.get(key);
    if (currentBalance === undefined) {
      throw new HttpException(
        {
          code: 'INVALID_DIMENSION',
          message: 'Unknown employee/location combination',
        },
        422,
      );
    }

    if (currentBalance < body.amountDays) {
      throw new HttpException(
        {
          code: 'INSUFFICIENT_BALANCE',
          message: 'Insufficient balance in HCM',
        },
        409,
      );
    }

    const remainingBalanceDays = Number(
      (currentBalance - body.amountDays).toFixed(3),
    );
    this.balances.set(key, remainingBalanceDays);

    const response: BookingResponse = {
      bookingId: `booking-${body.idempotencyKey}`,
      employeeId: body.employeeId,
      locationId: body.locationId,
      remainingBalanceDays,
      bookedAt: new Date().toISOString(),
    };

    this.bookingResponses.set(body.idempotencyKey, response);

    if (behavior === 'timeoutAfterApply') {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return response;
  }

  getCorpus() {
    return {
      batchId: `mock-batch-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      balances: Array.from(this.balances.entries()).map(
        ([key, balanceDays]) => {
          const [employeeId, locationId] = key.split(':');
          return { employeeId, locationId, balanceDays };
        },
      ),
    };
  }
}

@Controller()
class HcmMockController {
  constructor(private readonly state: HcmMockState) {}

  @Get('balances/:employeeId/:locationId')
  getBalance(
    @Param('employeeId') employeeId: string,
    @Param('locationId') locationId: string,
  ) {
    return this.state.getBalance(employeeId, locationId);
  }

  @Post('bookings')
  book(@Body() body: BookingRequest) {
    return this.state.book(body);
  }

  @Get('balance-corpus')
  getCorpus() {
    return this.state.getCorpus();
  }
}

@Module({
  controllers: [HcmMockController],
  providers: [HcmMockState],
})
class HcmMockModule {}

export interface MockHcmServer {
  app: INestApplication;
  url: string;
  state: HcmMockState;
  close: () => Promise<void>;
}

export async function startMockHcmServer(): Promise<MockHcmServer> {
  const moduleRef = await Test.createTestingModule({
    imports: [HcmMockModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  await app.listen(0);

  const server = app.getHttpServer() as Server;
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Mock HCM server did not return a numeric address');
  }

  const port = address.port;

  return {
    app,
    url: `http://127.0.0.1:${port}`,
    state: app.get(HcmMockState),
    close: () => app.close(),
  };
}
