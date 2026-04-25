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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HcmClient = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const axios_2 = __importDefault(require("axios"));
const rxjs_1 = require("rxjs");
const hcm_types_1 = require("./hcm.types");
let HcmClient = class HcmClient {
    httpService;
    configService;
    baseUrl;
    constructor(httpService, configService) {
        this.httpService = httpService;
        this.configService = configService;
        this.baseUrl =
            this.configService.get('HCM_BASE_URL') ?? 'http://127.0.0.1:4010';
    }
    async getBalance(employeeId, locationId) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.baseUrl}/balances/${employeeId}/${locationId}`));
            return response.data;
        }
        catch (error) {
            throw this.mapError(error);
        }
    }
    async bookTimeOff(command) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.baseUrl}/bookings`, command));
            return response.data;
        }
        catch (error) {
            throw this.mapError(error);
        }
    }
    mapError(error) {
        if (axios_2.default.isAxiosError(error)) {
            const errorBody = this.parseErrorBody(error.response?.data);
            const responseCode = errorBody.code;
            if (!error.response || error.code === 'ECONNABORTED') {
                return new hcm_types_1.HcmTransportError('HCM request timed out or failed');
            }
            if (responseCode === 'INSUFFICIENT_BALANCE') {
                return new hcm_types_1.HcmValidationError('INSUFFICIENT_BALANCE', errorBody.message ?? 'Insufficient balance');
            }
            if (responseCode === 'INVALID_DIMENSION' ||
                error.response.status === 404) {
                return new hcm_types_1.HcmValidationError('INVALID_DIMENSION', errorBody.message ?? 'Invalid employee or location');
            }
            if (error.response.status >= 500) {
                return new hcm_types_1.HcmTransportError('HCM request failed with server error');
            }
        }
        return new hcm_types_1.HcmTransportError('Unexpected HCM transport failure');
    }
    parseErrorBody(data) {
        if (typeof data !== 'object' || data === null) {
            return {};
        }
        const record = data;
        return {
            code: typeof record.code === 'string' ? record.code : undefined,
            message: typeof record.message === 'string' ? record.message : undefined,
        };
    }
};
exports.HcmClient = HcmClient;
exports.HcmClient = HcmClient = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof axios_1.HttpService !== "undefined" && axios_1.HttpService) === "function" ? _a : Object, typeof (_b = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _b : Object])
], HcmClient);
//# sourceMappingURL=hcm.client.js.map