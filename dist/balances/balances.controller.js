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
exports.BalancesController = void 0;
const common_1 = require("@nestjs/common");
const balance_query_dto_1 = require("./dto/balance-query.dto");
const hcm_batch_dto_1 = require("./dto/hcm-batch.dto");
const balances_service_1 = require("./balances.service");
let BalancesController = class BalancesController {
    balancesService;
    constructor(balancesService) {
        this.balancesService = balancesService;
    }
    getBalance(query) {
        return this.balancesService.getBalanceView(query.employeeId, query.locationId, query.refresh ?? false);
    }
    syncBatch(batch) {
        return this.balancesService.syncBatch(batch);
    }
};
exports.BalancesController = BalancesController;
__decorate([
    (0, common_1.Get)('balances'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [balance_query_dto_1.BalanceQueryDto]),
    __metadata("design:returntype", void 0)
], BalancesController.prototype, "getBalance", null);
__decorate([
    (0, common_1.Post)('hcm-sync/batches'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [hcm_batch_dto_1.HcmBatchSyncDto]),
    __metadata("design:returntype", void 0)
], BalancesController.prototype, "syncBatch", null);
exports.BalancesController = BalancesController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [balances_service_1.BalancesService])
], BalancesController);
//# sourceMappingURL=balances.controller.js.map