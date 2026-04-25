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
exports.HcmCommandEntity = void 0;
const typeorm_1 = require("typeorm");
const time_off_constants_1 = require("./time-off.constants");
let HcmCommandEntity = class HcmCommandEntity {
    id;
    requestId;
    commandType;
    status;
    idempotencyKey;
    attemptCount;
    lastErrorCode;
    lastErrorMessage;
    lastAttemptAt;
    completedAt;
};
exports.HcmCommandEntity = HcmCommandEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], HcmCommandEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], HcmCommandEntity.prototype, "requestId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], HcmCommandEntity.prototype, "commandType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], HcmCommandEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], HcmCommandEntity.prototype, "idempotencyKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], HcmCommandEntity.prototype, "attemptCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], HcmCommandEntity.prototype, "lastErrorCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], HcmCommandEntity.prototype, "lastErrorMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], HcmCommandEntity.prototype, "lastAttemptAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], HcmCommandEntity.prototype, "completedAt", void 0);
exports.HcmCommandEntity = HcmCommandEntity = __decorate([
    (0, typeorm_1.Entity)('hcm_commands'),
    (0, typeorm_1.Unique)(['requestId', 'commandType'])
], HcmCommandEntity);
//# sourceMappingURL=hcm-command.entity.js.map