"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HcmValidationError = exports.HcmTransportError = void 0;
class HcmTransportError extends Error {
    constructor(message) {
        super(message);
        this.name = 'HcmTransportError';
    }
}
exports.HcmTransportError = HcmTransportError;
class HcmValidationError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'HcmValidationError';
    }
}
exports.HcmValidationError = HcmValidationError;
//# sourceMappingURL=hcm.types.js.map