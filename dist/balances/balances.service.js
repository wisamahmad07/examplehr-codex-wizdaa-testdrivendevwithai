"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BalancesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const balance_units_1 = require("../common/balance-units");
const hcm_client_1 = require("../hcm/hcm.client");
const hcm_types_1 = require("../hcm/hcm.types");
const time_off_constants_1 = require("../time-off/time-off.constants");
const time_off_request_entity_1 = require("../time-off/time-off-request.entity");
const balance_snapshot_entity_1 = require("./balance-snapshot.entity");
const sync_batch_entity_1 = require("./sync-batch.entity");
let BalancesService = class BalancesService {
    balanceRepository;
    batchRepository;
    requestRepository;
    hcmClient;
    constructor(balanceRepository, batchRepository, requestRepository, hcmClient) {
        this.balanceRepository = balanceRepository;
        this.batchRepository = batchRepository;
        this.requestRepository = requestRepository;
        this.hcmClient = hcmClient;
    }
    async getBalanceView(employeeId, locationId, refresh = false) {
        let snapshot = await this.balanceRepository.findOne({
            where: { employeeId, locationId },
        });
        if (refresh || !snapshot) {
            snapshot = await this.refreshSnapshot(employeeId, locationId);
        }
        const activeHoldUnits = await this.getActiveHoldUnits(employeeId, locationId);
        return this.toBalanceView(snapshot, activeHoldUnits);
    }
    async ensureSnapshot(employeeId, locationId) {
        const snapshot = await this.balanceRepository.findOne({
            where: { employeeId, locationId },
        });
        if (snapshot) {
            return snapshot;
        }
        return this.refreshSnapshot(employeeId, locationId);
    }
    async refreshSnapshot(employeeId, locationId) {
        try {
            const response = await this.hcmClient.getBalance(employeeId, locationId);
            return this.upsertSnapshot({
                employeeId: response.employeeId,
                locationId: response.locationId,
                balanceUnits: (0, balance_units_1.daysToUnits)(response.balanceDays),
                sourceType: 'REALTIME',
                sourceUpdatedAt: new Date(response.asOf),
            });
        }
        catch (error) {
            if (error instanceof hcm_types_1.HcmValidationError) {
                throw new common_1.UnprocessableEntityException({
                    code: error.code,
                    message: error.message,
                });
            }
            if (error instanceof hcm_types_1.HcmTransportError) {
                throw new common_1.ServiceUnavailableException({
                    code: 'HCM_UNAVAILABLE',
                    message: error.message,
                });
            }
            throw error;
        }
    }
    async recordApprovedBalance(employeeId, locationId, remainingBalanceDays, bookedAt) {
        await this.upsertSnapshot({
            employeeId,
            locationId,
            balanceUnits: (0, balance_units_1.daysToUnits)(remainingBalanceDays),
            sourceType: 'REALTIME',
            sourceUpdatedAt: new Date(bookedAt),
        });
    }
    async getActiveHoldUnits(employeeId, locationId, excludeRequestId) {
        const query = this.requestRepository
            .createQueryBuilder('request')
            .select('COALESCE(SUM(request.amountUnits), 0)', 'holdUnits')
            .where('request.employeeId = :employeeId', { employeeId })
            .andWhere('request.locationId = :locationId', { locationId })
            .andWhere('request.status IN (:...statuses)', {
            statuses: time_off_constants_1.ACTIVE_HOLD_STATUSES,
        });
        if (excludeRequestId) {
            query.andWhere('request.id != :excludeRequestId', { excludeRequestId });
        }
        const result = await query.getRawOne();
        return Number(result?.holdUnits ?? 0);
    }
    async syncBatch(batch) {
        const existingBatch = await this.batchRepository.findOne({
            where: { batchId: batch.batchId },
        });
        if (existingBatch) {
            return {
                batchId: existingBatch.batchId,
                status: 'duplicate',
                appliedRows: existingBatch.appliedRows,
                skippedRows: existingBatch.skippedRows,
            };
        }
        const generatedAt = new Date(batch.generatedAt);
        let appliedRows = 0;
        let skippedRows = 0;
        for (const row of batch.balances) {
            const currentSnapshot = await this.balanceRepository.findOne({
                where: {
                    employeeId: row.employeeId,
                    locationId: row.locationId,
                },
            });
            if (currentSnapshot && currentSnapshot.sourceUpdatedAt > generatedAt) {
                skippedRows += 1;
                continue;
            }
            await this.upsertSnapshot({
                employeeId: row.employeeId,
                locationId: row.locationId,
                balanceUnits: (0, balance_units_1.daysToUnits)(row.balanceDays),
                sourceType: 'BATCH',
                sourceUpdatedAt: generatedAt,
            });
            appliedRows += 1;
        }
        await this.batchRepository.save(this.batchRepository.create({
            batchId: batch.batchId,
            generatedAt,
            receivedAt: new Date(),
            appliedRows,
            skippedRows,
        }));
        return {
            batchId: batch.batchId,
            status: 'processed',
            appliedRows,
            skippedRows,
        };
    }
    async getSnapshotOrFail(employeeId, locationId) {
        const snapshot = await this.balanceRepository.findOne({
            where: { employeeId, locationId },
        });
        if (!snapshot) {
            throw new common_1.NotFoundException('Balance snapshot not found');
        }
        return snapshot;
    }
    async upsertSnapshot(input) {
        const existing = await this.balanceRepository.findOne({
            where: {
                employeeId: input.employeeId,
                locationId: input.locationId,
            },
        });
        const snapshot = this.balanceRepository.create({
            ...existing,
            employeeId: input.employeeId,
            locationId: input.locationId,
            balanceUnits: input.balanceUnits,
            sourceType: input.sourceType,
            sourceUpdatedAt: input.sourceUpdatedAt,
            updatedAt: new Date(),
        });
        return this.balanceRepository.save(snapshot);
    }
    toBalanceView(snapshot, activeHoldUnits) {
        const estimatedAvailableUnits = (0, balance_units_1.clampAvailableUnits)(snapshot.balanceUnits - activeHoldUnits);
        return {
            employeeId: snapshot.employeeId,
            locationId: snapshot.locationId,
            snapshotBalanceDays: (0, balance_units_1.unitsToDays)(snapshot.balanceUnits),
            activeHoldDays: (0, balance_units_1.unitsToDays)(activeHoldUnits),
            estimatedAvailableDays: (0, balance_units_1.unitsToDays)(estimatedAvailableUnits),
            sourceType: snapshot.sourceType,
            sourceUpdatedAt: snapshot.sourceUpdatedAt.toISOString(),
            updatedAt: snapshot.updatedAt.toISOString(),
        };
    }
};
exports.BalancesService = BalancesService;
exports.BalancesService = BalancesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(balance_snapshot_entity_1.BalanceSnapshotEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(sync_batch_entity_1.SyncBatchEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(time_off_request_entity_1.TimeOffRequestEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        hcm_client_1.HcmClient])
], BalancesService);
//# sourceMappingURL=balances.service.js.map