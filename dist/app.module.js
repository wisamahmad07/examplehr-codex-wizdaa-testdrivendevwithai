"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const node_path_1 = require("node:path");
const node_fs_1 = require("node:fs");
const common_module_1 = require("./common/common.module");
const balances_module_1 = require("./balances/balances.module");
const time_off_module_1 = require("./time-off/time-off.module");
const hcm_module_1 = require("./hcm/hcm.module");
const health_controller_1 = require("./health.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (configService) => {
                    const databasePath = configService.get('DATABASE_PATH') ?? 'data/timeoff.sqlite';
                    if (databasePath !== ':memory:') {
                        (0, node_fs_1.mkdirSync)((0, node_path_1.dirname)(databasePath), { recursive: true });
                    }
                    return {
                        type: 'sqlite',
                        database: databasePath,
                        autoLoadEntities: true,
                        synchronize: true,
                    };
                },
            }),
            common_module_1.CommonModule,
            hcm_module_1.HcmModule,
            balances_module_1.BalancesModule,
            time_off_module_1.TimeOffModule,
        ],
        controllers: [health_controller_1.HealthController],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map