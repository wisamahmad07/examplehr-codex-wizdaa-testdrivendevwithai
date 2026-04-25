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
exports.TimeOffService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const balances_service_1 = require("../balances/balances.service");
const balance_units_1 = require("../common/balance-units");
const keyed_mutex_service_1 = require("../common/keyed-mutex.service");
const hcm_client_1 = require("../hcm/hcm.client");
const hcm_types_1 = require("../hcm/hcm.types");
const hcm_command_entity_1 = require("./hcm-command.entity");
const time_off_domain_1 = require("./time-off.domain");
const time_off_constants_1 = require("./time-off.constants");
const time_off_request_entity_1 = require("./time-off-request.entity");
let TimeOffService = class TimeOffService {
    requestRepository;
    commandRepository;
    balancesService;
    hcmClient;
    keyedMutexService;
    constructor(requestRepository, commandRepository, balancesService, hcmClient, keyedMutexService) {
        this.requestRepository = requestRepository;
        this.commandRepository = commandRepository;
        this.balancesService = balancesService;
        this.hcmClient = hcmClient;
        this.keyedMutexService = keyedMutexService;
    }
    async createRequest(input) {
        const amountUnits = (0, balance_units_1.daysToUnits)(input.amountDays);
        return this.keyedMutexService.withLock((0, time_off_domain_1.getLockKey)(input.employeeId, input.locationId), async () => {
            let snapshot = await this.balancesService.ensureSnapshot(input.employeeId, input.locationId);
            let activeHoldUnits = await this.balancesService.getActiveHoldUnits(input.employeeId, input.locationId);
            let estimatedAvailableUnits = (0, time_off_domain_1.calculateEstimatedAvailableUnits)(snapshot.balanceUnits, activeHoldUnits);
            if (amountUnits > estimatedAvailableUnits) {
                snapshot = await this.balancesService.refreshSnapshot(input.employeeId, input.locationId);
                activeHoldUnits = await this.balancesService.getActiveHoldUnits(input.employeeId, input.locationId);
                estimatedAvailableUnits = (0, time_off_domain_1.calculateEstimatedAvailableUnits)(snapshot.balanceUnits, activeHoldUnits);
            }
            if (amountUnits > estimatedAvailableUnits) {
                throw new common_1.ConflictException({
                    code: 'INSUFFICIENT_ESTIMATED_BALANCE',
                    message: 'The latest available balance is not enough for this request.',
                    estimatedAvailableDays: (0, balance_units_1.unitsToDays)(estimatedAvailableUnits),
                });
            }
            const now = new Date();
            const request = await this.requestRepository.save(this.requestRepository.create({
                employeeId: input.employeeId,
                locationId: input.locationId,
                amountUnits,
                reason: input.reason ?? null,
                status: time_off_constants_1.TimeOffRequestStatus.PENDING_APPROVAL,
                createdAt: now,
                updatedAt: now,
            }));
            return this.toRequestView(request);
        });
    }
    async getRequest(id) {
        const request = await this.requestRepository.findOne({ where: { id } });
        if (!request) {
            throw new common_1.NotFoundException('Time-off request not found');
        }
        return this.toRequestView(request);
    }
    async listRequests(employeeId, locationId) {
        const query = this.requestRepository
            .createQueryBuilder('request')
            .orderBy('request.createdAt', 'DESC');
        if (employeeId) {
            query.andWhere('request.employeeId = :employeeId', { employeeId });
        }
        if (locationId) {
            query.andWhere('request.locationId = :locationId', { locationId });
        }
        const requests = await query.getMany();
        return requests.map((request) => this.toRequestView(request));
    }
    async approveRequest(id, input) {
        const existing = await this.getRequestEntity(id);
        if (existing.status === time_off_constants_1.TimeOffRequestStatus.APPROVED) {
            return this.toRequestView(existing);
        }
        if (existing.status !== time_off_constants_1.TimeOffRequestStatus.PENDING_APPROVAL) {
            throw new common_1.ConflictException(`Cannot approve a request in status ${existing.status}`);
        }
        return this.keyedMutexService.withLock((0, time_off_domain_1.getLockKey)(existing.employeeId, existing.locationId), async () => {
            const request = await this.getRequestEntity(id);
            if (request.status === time_off_constants_1.TimeOffRequestStatus.APPROVED) {
                return this.toRequestView(request);
            }
            if (request.status !== time_off_constants_1.TimeOffRequestStatus.PENDING_APPROVAL) {
                throw new common_1.ConflictException(`Cannot approve a request in status ${request.status}`);
            }
            request.status = time_off_constants_1.TimeOffRequestStatus.APPROVAL_IN_PROGRESS;
            request.actedBy = input.actorId;
            request.decisionNote = input.note ?? null;
            request.updatedAt = new Date();
            await this.requestRepository.save(request);
            const command = await this.prepareCommand(request);
            try {
                const booking = await this.hcmClient.bookTimeOff({
                    idempotencyKey: command.idempotencyKey,
                    employeeId: request.employeeId,
                    locationId: request.locationId,
                    amountDays: (0, balance_units_1.unitsToDays)(request.amountUnits),
                });
                command.status = time_off_constants_1.HcmCommandStatus.SUCCEEDED;
                command.lastAttemptAt = new Date();
                command.completedAt = new Date();
                command.lastErrorCode = null;
                command.lastErrorMessage = null;
                await this.commandRepository.save(command);
                request.status = time_off_constants_1.TimeOffRequestStatus.APPROVED;
                request.externalBookingId = booking.bookingId;
                request.approvedAt = new Date(booking.bookedAt);
                request.reconciliationRequiredAt = null;
                request.updatedAt = new Date();
                await this.requestRepository.save(request);
                await this.balancesService.recordApprovedBalance(booking.employeeId, booking.locationId, booking.remainingBalanceDays, booking.bookedAt);
                return this.toRequestView(request);
            }
            catch (error) {
                if (error instanceof hcm_types_1.HcmValidationError) {
                    command.status = time_off_constants_1.HcmCommandStatus.FAILED;
                    command.completedAt = new Date();
                    command.lastErrorCode = error.code;
                    command.lastErrorMessage = error.message;
                    await this.commandRepository.save(command);
                    request.status = time_off_constants_1.TimeOffRequestStatus.REJECTED;
                    request.statusReasonCode = error.code;
                    request.rejectedAt = new Date();
                    request.updatedAt = new Date();
                    await this.requestRepository.save(request);
                    return this.toRequestView(request);
                }
                if (error instanceof hcm_types_1.HcmTransportError) {
                    command.status = time_off_constants_1.HcmCommandStatus.UNKNOWN;
                    command.lastErrorCode = 'HCM_TRANSPORT_ERROR';
                    command.lastErrorMessage = error.message;
                    await this.commandRepository.save(command);
                    request.status = time_off_constants_1.TimeOffRequestStatus.REQUIRES_RECONCILIATION;
                    request.reconciliationRequiredAt = new Date();
                    request.updatedAt = new Date();
                    await this.requestRepository.save(request);
                    return this.toRequestView(request);
                }
                throw error;
            }
        });
    }
    async rejectRequest(id, input) {
        return this.transitionPendingRequest(id, time_off_constants_1.TimeOffRequestStatus.REJECTED, input, 'rejectedAt');
    }
    async cancelRequest(id, input) {
        return this.transitionPendingRequest(id, time_off_constants_1.TimeOffRequestStatus.CANCELLED, input, 'cancelledAt');
    }
    async reconcileRequest(id, input) {
        const request = await this.getRequestEntity(id);
        if (request.status === time_off_constants_1.TimeOffRequestStatus.APPROVED) {
            return this.toRequestView(request);
        }
        if (request.status !== time_off_constants_1.TimeOffRequestStatus.REQUIRES_RECONCILIATION) {
            throw new common_1.ConflictException(`Cannot reconcile a request in status ${request.status}`);
        }
        return this.keyedMutexService.withLock((0, time_off_domain_1.getLockKey)(request.employeeId, request.locationId), async () => {
            const freshRequest = await this.getRequestEntity(id);
            const command = await this.getCommandOrFail(freshRequest.id);
            try {
                const booking = await this.hcmClient.bookTimeOff({
                    idempotencyKey: command.idempotencyKey,
                    employeeId: freshRequest.employeeId,
                    locationId: freshRequest.locationId,
                    amountDays: (0, balance_units_1.unitsToDays)(freshRequest.amountUnits),
                });
                command.status = time_off_constants_1.HcmCommandStatus.SUCCEEDED;
                command.attemptCount += 1;
                command.lastAttemptAt = new Date();
                command.completedAt = new Date();
                command.lastErrorCode = null;
                command.lastErrorMessage = null;
                await this.commandRepository.save(command);
                freshRequest.status = time_off_constants_1.TimeOffRequestStatus.APPROVED;
                freshRequest.actedBy = input.actorId;
                freshRequest.decisionNote = input.note ?? null;
                freshRequest.externalBookingId = booking.bookingId;
                freshRequest.approvedAt = new Date(booking.bookedAt);
                freshRequest.reconciliationRequiredAt = null;
                freshRequest.updatedAt = new Date();
                await this.requestRepository.save(freshRequest);
                await this.balancesService.recordApprovedBalance(booking.employeeId, booking.locationId, booking.remainingBalanceDays, booking.bookedAt);
                return this.toRequestView(freshRequest);
            }
            catch (error) {
                command.attemptCount += 1;
                command.lastAttemptAt = new Date();
                if (error instanceof hcm_types_1.HcmValidationError) {
                    command.status = time_off_constants_1.HcmCommandStatus.FAILED;
                    command.completedAt = new Date();
                    command.lastErrorCode = error.code;
                    command.lastErrorMessage = error.message;
                    await this.commandRepository.save(command);
                    freshRequest.status = time_off_constants_1.TimeOffRequestStatus.REJECTED;
                    freshRequest.actedBy = input.actorId;
                    freshRequest.decisionNote = input.note ?? null;
                    freshRequest.statusReasonCode = error.code;
                    freshRequest.rejectedAt = new Date();
                    freshRequest.updatedAt = new Date();
                    await this.requestRepository.save(freshRequest);
                    return this.toRequestView(freshRequest);
                }
                if (error instanceof hcm_types_1.HcmTransportError) {
                    command.status = time_off_constants_1.HcmCommandStatus.UNKNOWN;
                    command.lastErrorCode = 'HCM_TRANSPORT_ERROR';
                    command.lastErrorMessage = error.message;
                    await this.commandRepository.save(command);
                    freshRequest.actedBy = input.actorId;
                    freshRequest.decisionNote = input.note ?? null;
                    freshRequest.reconciliationRequiredAt = new Date();
                    freshRequest.updatedAt = new Date();
                    await this.requestRepository.save(freshRequest);
                    return this.toRequestView(freshRequest);
                }
                throw error;
            }
        });
    }
    async transitionPendingRequest(id, targetStatus, input, timestampField) {
        const request = await this.getRequestEntity(id);
        if (request.status !== time_off_constants_1.TimeOffRequestStatus.PENDING_APPROVAL) {
            throw new common_1.ConflictException(`Cannot move a request in status ${request.status} to ${targetStatus}`);
        }
        return this.keyedMutexService.withLock((0, time_off_domain_1.getLockKey)(request.employeeId, request.locationId), async () => {
            const freshRequest = await this.getRequestEntity(id);
            if (freshRequest.status !== time_off_constants_1.TimeOffRequestStatus.PENDING_APPROVAL) {
                throw new common_1.ConflictException(`Cannot move a request in status ${freshRequest.status} to ${targetStatus}`);
            }
            freshRequest.status = targetStatus;
            freshRequest.actedBy = input.actorId;
            freshRequest.decisionNote = input.note ?? null;
            freshRequest[timestampField] = new Date();
            freshRequest.updatedAt = new Date();
            await this.requestRepository.save(freshRequest);
            return this.toRequestView(freshRequest);
        });
    }
    async prepareCommand(request) {
        let command = await this.commandRepository.findOne({
            where: {
                requestId: request.id,
                commandType: time_off_constants_1.HcmCommandType.BOOK_TIME_OFF,
            },
        });
        if (!command) {
            command = this.commandRepository.create({
                requestId: request.id,
                commandType: time_off_constants_1.HcmCommandType.BOOK_TIME_OFF,
                status: time_off_constants_1.HcmCommandStatus.PENDING,
                idempotencyKey: `time-off:${request.id}`,
                attemptCount: 0,
            });
        }
        command.attemptCount += 1;
        command.lastAttemptAt = new Date();
        return this.commandRepository.save(command);
    }
    async getRequestEntity(id) {
        const request = await this.requestRepository.findOne({ where: { id } });
        if (!request) {
            throw new common_1.NotFoundException('Time-off request not found');
        }
        return request;
    }
    async getCommandOrFail(requestId) {
        const command = await this.commandRepository.findOne({
            where: {
                requestId,
                commandType: time_off_constants_1.HcmCommandType.BOOK_TIME_OFF,
            },
        });
        if (!command) {
            throw new common_1.NotFoundException('HCM command not found for request');
        }
        return command;
    }
    toRequestView(request) {
        return {
            id: request.id,
            employeeId: request.employeeId,
            locationId: request.locationId,
            amountDays: (0, balance_units_1.unitsToDays)(request.amountUnits),
            status: request.status,
            reason: request.reason,
            actedBy: request.actedBy,
            decisionNote: request.decisionNote,
            statusReasonCode: request.statusReasonCode,
            externalBookingId: request.externalBookingId,
            createdAt: request.createdAt.toISOString(),
            updatedAt: request.updatedAt.toISOString(),
            approvedAt: request.approvedAt?.toISOString() ?? null,
            rejectedAt: request.rejectedAt?.toISOString() ?? null,
            cancelledAt: request.cancelledAt?.toISOString() ?? null,
            reconciliationRequiredAt: request.reconciliationRequiredAt?.toISOString() ?? null,
        };
    }
};
exports.TimeOffService = TimeOffService;
exports.TimeOffService = TimeOffService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(time_off_request_entity_1.TimeOffRequestEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(hcm_command_entity_1.HcmCommandEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        balances_service_1.BalancesService,
        hcm_client_1.HcmClient,
        keyed_mutex_service_1.KeyedMutexService])
], TimeOffService);
//# sourceMappingURL=time-off.service.js.map