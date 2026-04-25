"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BALANCE_SCALE = void 0;
exports.daysToUnits = daysToUnits;
exports.unitsToDays = unitsToDays;
exports.clampAvailableUnits = clampAvailableUnits;
exports.BALANCE_SCALE = 1000;
function daysToUnits(days) {
    return Math.round(days * exports.BALANCE_SCALE);
}
function unitsToDays(units) {
    return Number((units / exports.BALANCE_SCALE).toFixed(3));
}
function clampAvailableUnits(balanceUnits) {
    return Math.max(balanceUnits, 0);
}
//# sourceMappingURL=balance-units.js.map