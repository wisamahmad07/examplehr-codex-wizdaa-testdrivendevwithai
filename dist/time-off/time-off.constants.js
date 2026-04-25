"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HcmCommandType = exports.HcmCommandStatus = exports.ACTIVE_HOLD_STATUSES = exports.TimeOffRequestStatus = void 0;
var TimeOffRequestStatus;
(function (TimeOffRequestStatus) {
    TimeOffRequestStatus["PENDING_APPROVAL"] = "PENDING_APPROVAL";
    TimeOffRequestStatus["APPROVAL_IN_PROGRESS"] = "APPROVAL_IN_PROGRESS";
    TimeOffRequestStatus["APPROVED"] = "APPROVED";
    TimeOffRequestStatus["REJECTED"] = "REJECTED";
    TimeOffRequestStatus["CANCELLED"] = "CANCELLED";
    TimeOffRequestStatus["REQUIRES_RECONCILIATION"] = "REQUIRES_RECONCILIATION";
})(TimeOffRequestStatus || (exports.TimeOffRequestStatus = TimeOffRequestStatus = {}));
exports.ACTIVE_HOLD_STATUSES = [
    TimeOffRequestStatus.PENDING_APPROVAL,
    TimeOffRequestStatus.APPROVAL_IN_PROGRESS,
    TimeOffRequestStatus.REQUIRES_RECONCILIATION,
];
var HcmCommandStatus;
(function (HcmCommandStatus) {
    HcmCommandStatus["PENDING"] = "PENDING";
    HcmCommandStatus["SUCCEEDED"] = "SUCCEEDED";
    HcmCommandStatus["FAILED"] = "FAILED";
    HcmCommandStatus["UNKNOWN"] = "UNKNOWN";
})(HcmCommandStatus || (exports.HcmCommandStatus = HcmCommandStatus = {}));
var HcmCommandType;
(function (HcmCommandType) {
    HcmCommandType["BOOK_TIME_OFF"] = "BOOK_TIME_OFF";
})(HcmCommandType || (exports.HcmCommandType = HcmCommandType = {}));
//# sourceMappingURL=time-off.constants.js.map