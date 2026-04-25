"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BalancesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const hcm_module_1 = require("../hcm/hcm.module");
const time_off_request_entity_1 = require("../time-off/time-off-request.entity");
const balance_snapshot_entity_1 = require("./balance-snapshot.entity");
const balances_controller_1 = require("./balances.controller");
const balances_service_1 = require("./balances.service");
const sync_batch_entity_1 = require("./sync-batch.entity");
let BalancesModule = class BalancesModule {
};
exports.BalancesModule = BalancesModule;
exports.BalancesModule = BalancesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                balance_snapshot_entity_1.BalanceSnapshotEntity,
                sync_batch_entity_1.SyncBatchEntity,
                time_off_request_entity_1.TimeOffRequestEntity,
            ]),
            hcm_module_1.HcmModule,
        ],
        controllers: [balances_controller_1.BalancesController],
        providers: [balances_service_1.BalancesService],
        exports: [balances_service_1.BalancesService, typeorm_1.TypeOrmModule],
    })
], BalancesModule);
//# sourceMappingURL=balances.module.js.map