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
exports.TimeOffController = void 0;
const common_1 = require("@nestjs/common");
const create_time_off_request_dto_1 = require("./dto/create-time-off-request.dto");
const request_decision_dto_1 = require("./dto/request-decision.dto");
const time_off_service_1 = require("./time-off.service");
let TimeOffController = class TimeOffController {
    timeOffService;
    constructor(timeOffService) {
        this.timeOffService = timeOffService;
    }
    createRequest(input) {
        return this.timeOffService.createRequest(input);
    }
    listRequests(employeeId, locationId) {
        return this.timeOffService.listRequests(employeeId, locationId);
    }
    getRequest(id) {
        return this.timeOffService.getRequest(id);
    }
    approveRequest(id, input) {
        return this.timeOffService.approveRequest(id, input);
    }
    rejectRequest(id, input) {
        return this.timeOffService.rejectRequest(id, input);
    }
    cancelRequest(id, input) {
        return this.timeOffService.cancelRequest(id, input);
    }
    reconcileRequest(id, input) {
        return this.timeOffService.reconcileRequest(id, input);
    }
};
exports.TimeOffController = TimeOffController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_time_off_request_dto_1.CreateTimeOffRequestDto]),
    __metadata("design:returntype", void 0)
], TimeOffController.prototype, "createRequest", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('employeeId')),
    __param(1, (0, common_1.Query)('locationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], TimeOffController.prototype, "listRequests", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TimeOffController.prototype, "getRequest", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, request_decision_dto_1.RequestDecisionDto]),
    __metadata("design:returntype", void 0)
], TimeOffController.prototype, "approveRequest", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, request_decision_dto_1.RequestDecisionDto]),
    __metadata("design:returntype", void 0)
], TimeOffController.prototype, "rejectRequest", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, request_decision_dto_1.RequestDecisionDto]),
    __metadata("design:returntype", void 0)
], TimeOffController.prototype, "cancelRequest", null);
__decorate([
    (0, common_1.Post)(':id/reconcile'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, request_decision_dto_1.RequestDecisionDto]),
    __metadata("design:returntype", void 0)
], TimeOffController.prototype, "reconcileRequest", null);
exports.TimeOffController = TimeOffController = __decorate([
    (0, common_1.Controller)('time-off-requests'),
    __metadata("design:paramtypes", [time_off_service_1.TimeOffService])
], TimeOffController);
//# sourceMappingURL=time-off.controller.js.map