import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { startMockHcmServer, MockHcmServer } from './support/mock-hcm-server';

type RequestTarget = Parameters<typeof request>[0];

interface TimeOffRequestView {
  id: string;
  status: string;
  statusReasonCode: string | null;
}

interface BalanceView {
  snapshotBalanceDays: number;
  activeHoldDays: number;
  estimatedAvailableDays: number;
}

interface BatchSyncResult {
  status: string;
  appliedRows: number;
  skippedRows: number;
}

describe('Time-off microservice e2e', () => {
  jest.setTimeout(30000);
  let app: INestApplication;
  let mockHcm: MockHcmServer;

  beforeEach(async () => {
    mockHcm = await startMockHcmServer();
    process.env.DATABASE_PATH = ':memory:';
    process.env.HCM_BASE_URL = mockHcm.url;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    if (mockHcm) {
      await mockHcm.close();
    }
    delete process.env.DATABASE_PATH;
    delete process.env.HCM_BASE_URL;
  });

  const api = () => request(app.getHttpServer() as RequestTarget);
  const mockApi = () => request(mockHcm.url);

  it('creates and approves a request against HCM authority', async () => {
    mockHcm.state.seedBalance('emp-1', 'ams', 10);

    const createResponse = await api()
      .post('/time-off-requests')
      .send({
        employeeId: 'emp-1',
        locationId: 'ams',
        amountDays: 2,
        reason: 'Vacation',
      })
      .expect(201);
    const createBody = createResponse.body as TimeOffRequestView;

    const approvalResponse = await api()
      .post(`/time-off-requests/${createBody.id}/approve`)
      .send({
        actorId: 'mgr-1',
        note: 'Looks good',
      })
      .expect(201);
    const approvalBody = approvalResponse.body as TimeOffRequestView;

    expect(approvalBody.status).toBe('APPROVED');

    const balanceResponse = await api()
      .get('/balances')
      .query({
        employeeId: 'emp-1',
        locationId: 'ams',
      })
      .expect(200);
    const balanceBody = balanceResponse.body as BalanceView;

    expect(balanceBody.snapshotBalanceDays).toBe(8);
    expect(balanceBody.activeHoldDays).toBe(0);
  });

  it('rejects approval when HCM balance decreased externally', async () => {
    mockHcm.state.seedBalance('emp-2', 'lon', 5);

    const createResponse = await api()
      .post('/time-off-requests')
      .send({
        employeeId: 'emp-2',
        locationId: 'lon',
        amountDays: 4,
      })
      .expect(201);
    const createBody = createResponse.body as TimeOffRequestView;

    mockHcm.state.adjustBalance('emp-2', 'lon', -3);

    const approvalResponse = await api()
      .post(`/time-off-requests/${createBody.id}/approve`)
      .send({
        actorId: 'mgr-2',
      })
      .expect(201);
    const approvalBody = approvalResponse.body as TimeOffRequestView;

    expect(approvalBody.status).toBe('REJECTED');
    expect(approvalBody.statusReasonCode).toBe('INSUFFICIENT_BALANCE');
  });

  it('refreshes stale local data before rejecting create when HCM granted a bonus', async () => {
    await api()
      .post('/hcm-sync/batches')
      .send({
        batchId: 'batch-seed',
        generatedAt: '2026-01-01T00:00:00.000Z',
        balances: [
          {
            employeeId: 'emp-3',
            locationId: 'nyc',
            balanceDays: 1,
          },
        ],
      })
      .expect(201);

    mockHcm.state.seedBalance('emp-3', 'nyc', 3);

    const createResponse = await api()
      .post('/time-off-requests')
      .send({
        employeeId: 'emp-3',
        locationId: 'nyc',
        amountDays: 2,
      })
      .expect(201);
    const createBody = createResponse.body as TimeOffRequestView;

    expect(createBody.status).toBe('PENDING_APPROVAL');

    const balanceResponse = await api()
      .get('/balances')
      .query({
        employeeId: 'emp-3',
        locationId: 'nyc',
      })
      .expect(200);
    const balanceBody = balanceResponse.body as BalanceView;

    expect(balanceBody.snapshotBalanceDays).toBe(3);
    expect(balanceBody.estimatedAvailableDays).toBe(1);
  });

  it('prevents duplicate pending requests from overbooking the local hold view', async () => {
    mockHcm.state.seedBalance('emp-4', 'par', 5);

    await api()
      .post('/time-off-requests')
      .send({
        employeeId: 'emp-4',
        locationId: 'par',
        amountDays: 3,
      })
      .expect(201);

    const secondResponse = await api()
      .post('/time-off-requests')
      .send({
        employeeId: 'emp-4',
        locationId: 'par',
        amountDays: 3,
      })
      .expect(409);
    const secondBody = secondResponse.body as { code: string };

    expect(secondBody.code).toBe('INSUFFICIENT_ESTIMATED_BALANCE');
  });

  it('moves timeout outcomes to reconciliation and resolves them idempotently', async () => {
    mockHcm.state.seedBalance('emp-5', 'ber', 6);

    const createResponse = await api()
      .post('/time-off-requests')
      .send({
        employeeId: 'emp-5',
        locationId: 'ber',
        amountDays: 2,
      })
      .expect(201);
    const createBody = createResponse.body as TimeOffRequestView;

    mockHcm.state.setBookingBehavior(
      `time-off:${createBody.id}`,
      'timeoutAfterApply',
    );

    const approveResponse = await api()
      .post(`/time-off-requests/${createBody.id}/approve`)
      .send({
        actorId: 'mgr-3',
      })
      .expect(201);
    const approveBody = approveResponse.body as TimeOffRequestView;

    expect(approveBody.status).toBe('REQUIRES_RECONCILIATION');

    const reconcileResponse = await api()
      .post(`/time-off-requests/${createBody.id}/reconcile`)
      .send({
        actorId: 'ops-1',
        note: 'Retry with same idempotency key',
      })
      .expect(201);
    const reconcileBody = reconcileResponse.body as TimeOffRequestView;

    expect(reconcileBody.status).toBe('APPROVED');

    const duplicateApproval = await api()
      .post(`/time-off-requests/${createBody.id}/approve`)
      .send({
        actorId: 'mgr-3',
      })
      .expect(201);
    const duplicateBody = duplicateApproval.body as TimeOffRequestView;

    expect(duplicateBody.status).toBe('APPROVED');
  });

  it('accepts batch corpus from mock HCM and ignores duplicate batch ids', async () => {
    mockHcm.state.seedBalance('emp-6', 'mad', 9);
    mockHcm.state.seedBalance('emp-7', 'mad', 4);

    const corpusResponse = await mockApi().get('/balance-corpus').expect(200);

    const syncResponse = await api()
      .post('/hcm-sync/batches')
      .send(corpusResponse.body as object)
      .expect(201);
    const syncBody = syncResponse.body as BatchSyncResult;

    expect(syncBody).toMatchObject({
      status: 'processed',
      appliedRows: 2,
      skippedRows: 0,
    });

    const duplicateResponse = await api()
      .post('/hcm-sync/batches')
      .send(corpusResponse.body as object)
      .expect(201);
    const duplicateBody = duplicateResponse.body as BatchSyncResult;

    expect(duplicateBody.status).toBe('duplicate');
  });
});
