import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../app.module';
import { BalancesService } from './balances.service';
import { HcmClient } from '../hcm/hcm.client';

describe('BalancesService integration', () => {
  jest.setTimeout(20000);
  let app: INestApplication;
  let service: BalancesService;
  const fakeHcmClient = {
    getBalance: jest.fn(),
    bookTimeOff: jest.fn(),
  };

  beforeEach(async () => {
    process.env.DATABASE_PATH = ':memory:';
    delete process.env.HCM_BASE_URL;

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
    service = app.get(BalancesService);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    delete process.env.DATABASE_PATH;
  });

  it('ignores stale batch rows and detects duplicate deliveries', async () => {
    const firstResult = await service.syncBatch({
      batchId: 'batch-2',
      generatedAt: '2026-01-02T00:00:00.000Z',
      balances: [
        {
          employeeId: 'emp-1',
          locationId: 'ams',
          balanceDays: 12,
        },
      ],
    });

    expect(firstResult).toMatchObject({
      status: 'processed',
      appliedRows: 1,
      skippedRows: 0,
    });

    const staleResult = await service.syncBatch({
      batchId: 'batch-1',
      generatedAt: '2026-01-01T00:00:00.000Z',
      balances: [
        {
          employeeId: 'emp-1',
          locationId: 'ams',
          balanceDays: 8,
        },
      ],
    });

    expect(staleResult).toMatchObject({
      status: 'processed',
      appliedRows: 0,
      skippedRows: 1,
    });

    const duplicateResult = await service.syncBatch({
      batchId: 'batch-2',
      generatedAt: '2026-01-02T00:00:00.000Z',
      balances: [
        {
          employeeId: 'emp-1',
          locationId: 'ams',
          balanceDays: 12,
        },
      ],
    });

    expect(duplicateResult).toMatchObject({
      status: 'duplicate',
      appliedRows: 1,
      skippedRows: 0,
    });

    const balance = await service.getBalanceView('emp-1', 'ams');
    expect(balance.snapshotBalanceDays).toBe(12);
  });
});
