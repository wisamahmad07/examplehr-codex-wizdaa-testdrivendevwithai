"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLockKey = getLockKey;
exports.calculateEstimatedAvailableUnits = calculateEstimatedAvailableUnits;
const balance_units_1 = require("../common/balance-units");
function getLockKey(employeeId, locationId) {
    return `${employeeId}:${locationId}`;
}
function calculateEstimatedAvailableUnits(snapshotUnits, holdUnits) {
    return (0, balance_units_1.clampAvailableUnits)(snapshotUnits - holdUnits);
}
//# sourceMappingURL=time-off.domain.js.map