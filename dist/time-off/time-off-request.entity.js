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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeOffRequestEntity = void 0;
const typeorm_1 = require("typeorm");
const time_off_constants_1 = require("./time-off.constants");
let TimeOffRequestEntity = class TimeOffRequestEntity {
    id;
    employeeId;
    locationId;
    amountUnits;
    status;
    reason;
    actedBy;
    decisionNote;
    statusReasonCode;
    externalBookingId;
    createdAt;
    updatedAt;
    approvedAt;
    rejectedAt;
    cancelledAt;
    reconciliationRequiredAt;
};
exports.TimeOffRequestEntity = TimeOffRequestEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TimeOffRequestEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TimeOffRequestEntity.prototype, "employeeId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TimeOffRequestEntity.prototype, "locationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], TimeOffRequestEntity.prototype, "amountUnits", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], TimeOffRequestEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], TimeOffRequestEntity.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], TimeOffRequestEntity.prototype, "actedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], TimeOffRequestEntity.prototype, "decisionNote", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], TimeOffRequestEntity.prototype, "statusReasonCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], TimeOffRequestEntity.prototype, "externalBookingId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime' }),
    __metadata("design:type", Date)
], TimeOffRequestEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime' }),
    __metadata("design:type", Date)
], TimeOffRequestEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], TimeOffRequestEntity.prototype, "approvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], TimeOffRequestEntity.prototype, "rejectedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], TimeOffRequestEntity.prototype, "cancelledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], TimeOffRequestEntity.prototype, "reconciliationRequiredAt", void 0);
exports.TimeOffRequestEntity = TimeOffRequestEntity = __decorate([
    (0, typeorm_1.Entity)('time_off_requests')
], TimeOffRequestEntity);
//# sourceMappingURL=time-off-request.entity.js.map