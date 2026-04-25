import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { HcmClient } from '../hcm/hcm.client';
import { HcmTransportError } from '../hcm/hcm.types';
import { BalancesService } from '../balances/balances.service';
import { TimeOffService } from './time-off.service';

describe('TimeOffService integration', () => {
  jest.setTimeout(20000);
  let app: INestApplication;
  let timeOffService: TimeOffService;
  let balancesService: BalancesService;
  const fakeHcmClient = {
    getBalance: jest.fn(),
    bookTimeOff: jest.fn(),
  };

  beforeEach(async () => {
    process.env.DATABASE_PATH = ':memory:';

    fakeHcmClient.getBalance.mockReset();
    fakeHcmClient.bookTimeOff.mockReset();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(HcmClient)
      .useValue(fakeHcmClient)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
    timeOffService = app.get(TimeOffService);
    balancesService = app.get(BalancesService);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    delete process.env.DATABASE_PATH;
  });

  it('counts pending requests as holds and blocks overbooking locally', async () => {
    fakeHcmClient.getBalance.mockResolvedValue({
      employeeId: 'emp-1',
      locationId: 'ams',
      balanceDays: 5,
      asOf: '2026-01-01T00:00:00.000Z',
    });

    const firstRequest = await timeOffService.createRequest({
      employeeId: 'emp-1',
      locationId: 'ams',
      amountDays: 3,
      reason: 'Trip',
    });

    expect(firstRequest.status).toBe('PENDING_APPROVAL');

    await expect(
      timeOffService.createRequest({
        employeeId: 'emp-1',
        locationId: 'ams',
        amountDays: 3,
        reason: 'Second trip',
      }),
    ).rejects.toHaveProperty('response.code', 'INSUFFICIENT_ESTIMATED_BALANCE');

    const balance = await balancesService.getBalanceView('emp-1', 'ams');
    expect(balance.activeHoldDays).toBe(3);
    expect(balance.estimatedAvailableDays).toBe(2);
  });

  it('moves approvals into reconciliation when HCM transport fails', async () => {
    fakeHcmClient.getBalance.mockResolvedValue({
      employeeId: 'emp-2',
      locationId: 'lon',
      balanceDays: 4,
      asOf: '2026-01-01T00:00:00.000Z',
    });
    fakeHcmClient.bookTimeOff.mockRejectedValue(
      new HcmTransportError('simulated timeout'),
    );

    const request = await timeOffService.createRequest({
      employeeId: 'emp-2',
      locationId: 'lon',
      amountDays: 2,
      reason: 'Trip',
    });

    const result = (await timeOffService.approveRequest(request.id, {
      actorId: 'mgr-1',
      note: 'Approve',
    })) as {
      status: string;
      reconciliationRequiredAt: string | null;
    };

    expect(result.status).toBe('REQUIRES_RECONCILIATION');
    expect(result.reconciliationRequiredAt).not.toBeNull();
  });
});
